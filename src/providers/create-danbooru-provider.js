const { formatBytes, makeReadableList, capitalizeFirstLetter, truncateString, checkFieldsAreDefined } = require('../util')
const logger = require('pino')()

const baseEndpoint = 'https://danbooru.donmai.us'

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
	const { name, tags, persistence = null, interval = 60000 } = options
	let state = 'idle'
	let lastId = null
	let timer = null

	async function getMostRecentPost() {
		const options = []
		if (lastId !== null) {
			options.push('order:id')
			options.push(`id:>=${lastId}`)
		}
		const endpoint = `${baseEndpoint}/posts.json?limit=1&tags=${ [...tags, ...options].join('+')}`
		logger.info({ provider: name, endpoint }, 'Sending request.')
		try {
			const result = await fetch(endpoint)
			const json = await result.json()
			if ('success' in json && !json.success) {
				logger.error({ provider: name, endpoint, json }, 'Unsuccessful fetch.')
				return null
			}
			if (json.length === 0) {
				logger.warn({ provider: name, endpoint }, 'Got no results.')
				return null
			}
			return json[0]
		} catch(e) {
			logger.error(e)
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
				logger.warn(`Ugoira file type not supported`)
				return null
			}
			logger.warn(`Unknown file type`)
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
		if (onProvide === null) {
			logger.warn({ provider: name }, 'Tried to run iteration but onProvide is not set.')
			return;
		}
		logger.info({ provider: name, lastId }, 'Running iteration.')
		const post = await getMostRecentPost()
		if (post === null) return;
		logger.info({ provider: name }, 'Parsing raw data into PostInfo.')
		const postInfo = extractPostInfo(post)
		logger.info({ provider: name, postInfo })
		if (post.id === lastId) {
			logger.info({ provider: name, lastId, currId: post.id }, 'Checked but no new items.')
			return;
		}
		lastId = post.id
		logger.info({ provider: name, id: post.id, dbKey: `/providers/${name}/lastId` }, 'Writing new post id.')
		if (persistence !== null) {
			await persistence.push(`/providers/${name}/lastId`, post.id)
		}
		logger.info({ provider: name, id: post.id }, 'Converting post into webhook.')
		const webhook = convertPostToWebhook(postInfo)
		onProvide({
			provider: {	name, type: 'danbooru' },
			webhook,
			metadata: {
				raw: post,
				info: postInfo,
			}
		})
	}

	async function init() {
		logger.info({ provider: name }, 'Initializing provider.')
		if (persistence !== null) {
			lastId = await persistence.getObjectDefault(`/providers/${name}/lastId`, null)
		}
	}

	function start() {
		if (state === 'running') return;
		logger.info({ provider: name }, 'Starting provider.')
		state = 'running'
		runIteration()
		timer = setInterval(runIteration, interval)
	}

  function stop() {
		if (state === 'idle') return;
		logger.info({ provider: name }, 'Stopping provider.')
		state = 'idle'
		clearInterval(timer)
	}

	return {
		init,
		start,
		stop,
		get onProvide() { return onProvide },
		set onProvide(callback) { onProvide = callback },
		get state() { return state },
	}
}