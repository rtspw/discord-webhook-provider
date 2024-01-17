const { formatBytes, makeReadableList, capitalizeFirstLetter, truncateString, checkFieldsAreDefined } = require('./util')

const baseEndpoint = 'https://testbooru.donmai.us'

/** Makes booru style tags more human readable, e.g. klee_(genshin_impact) -> Klee */
function cleanUpTags(tags) {
	return tags
	  .map(tag => {
			if (tag.endsWith(')')) {
				tag = tag.slice(0, tag.lastIndexOf('(') - 1)
			}
			const tokens = tag.split('_').map(capitalizeFirstLetter)
			return tokens.join(' ')
		})
}

module.exports = function createDanbooruProvider (options) {
	let { onProvide = null } = options
	const { tags, startId = null, interval = 60000 } = options
	let lastId = startId
	let timer = null

	async function getMostRecentPost() {
		const options = []
		if (lastId !== null) {
			options.push('order:id')
			options.push(`id:>=${lastId}`)
		}
		const endpoint = `${baseEndpoint}/posts.json?limit=1&tags=${ [...tags, ...options].join('+')}`
		console.log(endpoint)
		try {
			const result = await fetch(endpoint)
			const json = await result.json()
			if (json.length === 0) throw new Error('No results')
			return json[0]
		} catch(e) {
			console.error(e)
			return null
		}
	}

	function extractPostInfo(post) {
		const expectedFields = ['id', 'rating', 'tag_string_artist', 'tag_string_character', 'tag_string_general', 'tag_string_copyright', 'file_url', 'preview_file_url', 'file_ext', 'file_size']
		checkFieldsAreDefined(post, expectedFields)
		return {
			id: post.id,
			rating: post.rating,
			source: post?.source ?? null,
			artists: post.tag_string_artist.split(' ').filter(x => x !== ''),
			characters: post.tag_string_character.split(' ').filter(x => x !== ''),
			tags: post.tag_string_general.split(' ').filter(x => x !== ''),
			origin: post.tag_string_copyright.split(' ').filter(x => x !== ''),
			createdAt: post?.created_at ?? (new Date()).toISOString(),
			height: post?.image_height ?? 'Unknown',
			width: post?.image_width ?? 'Unknown',
			fileUrl: post.file_url,
			previewUrl: post.preview_file_url,
			fileExt: post.file_ext,
			fileSize: post.file_size,
			get readableArtists() { return makeReadableList(cleanUpTags(this.artists)) },
			get readableCharacters() { return makeReadableList(cleanUpTags(this.characters)) },
			get readableOrigin() { return makeReadableList(cleanUpTags(this.origin)) },
			get readableFileSize() { return formatBytes(this.fileSize) },
			get postUrl() { return `${baseEndpoint}/posts/${this.id}` },
			get artistUrl() { return `${baseEndpoint}/posts?tags=${this.artists.join('+')}` },
			get dimensions() { return `${this.width} × ${this.height}` }
		}
	}

	function convertPostToWebhook(postInfo) {
		const embedTitle = `${truncateString(postInfo.readableCharacters)} from ${truncateString(postInfo.readableOrigin)}`
		const embedFile = (() => {
			if (['jpg', 'png', 'webp', 'gif', 'sfw'].includes(postInfo.fileExt)) {
				return { image: { url: postInfo.fileUrl }}
			}
			if (['mp4'].includes(postInfo.fileExt)) {
				return { image: { url: postInfo.previewUrl }}
			}
			if (['zip'].includes(postInfo.fileExt)) {
				console.log(`Ugoira file type not supported`)
				return null
			}
			console.log(`Unknown file type`)
			return null
		})()
		const embedArtist = postInfo.artists.length > 0 ? { description: `By **[${postInfo.readableArtists}](${postInfo.artistUrl})**` } : null
		return {
			embeds: [{
				author: { name: 'Danbooru' },
				title: embedTitle,
				url: postInfo.postUrl,
				...embedArtist,
				...embedFile,
				footer: { text: `${postInfo.dimensions} • ${postInfo.readableFileSize}` },
				timestamp: postInfo.createdAt,
			}],
		}
	}

	async function runIteration() {
		if (onProvide === null) return;
		console.log('Getting most recent post')
		const post = await getMostRecentPost()
		if (post === null) return;
		const postInfo = extractPostInfo(post)
		if (post['id'] === lastId) {
			console.log('Checked but no new items')
			return;
		}
		lastId = post.id
		const webhook = convertPostToWebhook(postInfo)
		onProvide({
			webhook,
			metadata: {
				raw: post,
				info: postInfo,
			}
		})
	}

	function start() {
		runIteration()
		timer = setInterval(runIteration, interval)
	}

  function stop() {
		clearInterval(timer)
	}

	return {
		start,
		stop,
		get onProvide() { return onProvide },
		set onProvide(callback) { onProvide = callback },
	}
}
