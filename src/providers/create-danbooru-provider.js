const { formatBytes, makeReadableList, capitalizeFirstLetter, truncateString, checkFieldsAreDefined } = require('../util')
const logger = require('pino')()

const baseEndpoint = 'https://danbooru.donmai.us'

/** Makes booru style tags more human readable, e.g. klee_(genshin_impact) -> Klee */
function cleanUpTags(tags) {
	const tagTokens = tags
	  .map(tag => {
			if (tag.endsWith(')')) {
				tag = tag.slice(0, tag.lastIndexOf('(') - 1)
			}
			const tokens = tag.split('_').map(capitalizeFirstLetter)
			return tokens.join(' ')
		})
	return [...new Set(tagTokens)]
}

module.exports = function createDanbooruProvider (options) {
	let onProvide = null
	const { name, tags, interval = 60000, approvedOnly = false, persistence = null } = options
	const type = 'danbooru'
	const args = { name, tags, interval, approvedOnly }
	let state = 'idle'
	let lastId = null
	let timer = null
	let approvalQueueTimer = null
	const approvalQueue = []

	async function getMostRecentPost() {
		const options = []
		if (lastId !== null) {
			options.push('order:id')
			options.push(`id:>${lastId}`)
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
				logger.info({ provider: name, endpoint }, 'Got no results.')
				return null
			}
			return json[0]
		} catch(e) {
			logger.error(e)
			return null
		}
	}

	async function getPostWithId(id) {
		const endpoint = `${baseEndpoint}/posts.json?tags=id:${id}`
		logger.info({ provider: name, endpoint, id }, 'Sending request.')
		try {
			const result = await fetch(endpoint)
			const json = await result.json()
			if ('success' in json && !json.success) {
				logger.error({ provider: name, endpoint, json }, 'Unsuccessful fetch.')
				return null
			}
			if (json.length === 0) {
				logger.info({ provider: name, endpoint }, 'Got no results.')
				return null
			}
			return json[0]
		} catch(e) {
			logger.error(e)
			return null
		}
	}

	function extractPostInfo(post) {
		const expectedFields = ['id', 'rating', 'tag_string_artist', 'tag_string_character', 'tag_string_general', 'tag_string_copyright', 'file_ext', 'file_size']
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
			fileUrl: post?.file_url ?? null,
			previewUrl: post?.preview_file_url ?? null,
			fileExt: post.file_ext,
			fileSize: post.file_size,
			isBanned: post.is_banned ?? false,
			isDeleted: post.is_deleted ?? false,
			isPending: post.is_pending ?? false,
			isFlagged: post.is_flagged ?? false,
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
			if (['mp4', 'webm'].includes(postInfo.fileExt)) {
				return { image: { url: postInfo.previewUrl }}
			}
			if (['zip'].includes(postInfo.fileExt)) {
				logger.warn(`Ugoira file type not supported`)
				return null
			}
			logger.warn({ provider: name, ext: postInfo.fileExt }, `Unknown file type`)
			return null
		})()
		const embedArtist = postInfo.artists.length > 0 ? { description: `By **[${postInfo.readableArtists}](${postInfo.artistUrl})**` } : null
		return {
			embeds: [{
				title: embedTitle,
				url: postInfo.postUrl,
				...embedArtist,
				...embedFile,
				footer: { text: `${postInfo.dimensions} • ${postInfo.readableFileSize}` },
				timestamp: postInfo.createdAt,
			}],
		}
	}

	async function processResponse(post, isMostRecent = false) {
		if (post === null) {
			logger.info({ provider: name, lastId }, 'Checked but no new items.')
			return;
		}
		logger.info({ provider: name }, 'Parsing raw data into PostInfo.')
		const postInfo = extractPostInfo(post)
		logger.info({ provider: name, postInfo }, 'Extracted post info.')
		if (isMostRecent) {
			lastId = post.id
			logger.info({ provider: name, id: post.id, dbKey: `/providers/${name}/lastId` }, 'Writing new post id.')
			if (persistence !== null) {
				await persistence.push(`/extra/danbooru/lastIds/${name}`, post.id)
				await persistence.save()
			}
		}
		if (postInfo.isBanned) {
			logger.warn({ provider: name, lastId, currId: post.id }, 'This post is banned.')
			return;
		}
		if (postInfo.isDeleted) {
			logger.warn({ provider: name, lastId, currId: post.id }, 'This post is deleted')
			return;
		}
		if (postInfo.fileUrl === null || postInfo.previewUrl === null) {
			logger.warn({ provider: name, lastId, currId: post.id }, 'FileUrl or PreviewUrl missing. Was the artist banned?')
			return;
		}
		if (approvedOnly && postInfo.isPending) {
			const expirationDate = new Date()
			expirationDate.setDate(expirationDate.getDate() + 3)
			logger.info({ provider: name, id: post.id, expirationDate }, 'Post is pending; appending to approvalQueue.')
			approvalQueue.push({
				id: postInfo.id,
				expires: expirationDate,
			})
		} else {
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
	}

	async function runApprovalQueueIteration() {
		logger.info({ provider: name, approvalQueue }, 'Running approval queue iteration.')
		if (approvalQueue.length === 0) {
			logger.info({ provider: name }, 'Queue empty.')
			return;
		}
		try {
			if (onProvide === null) {
				logger.warn({ provider: name }, 'Tried to run approval queue iteration but onProvide is not set.')
				return;
			}
			const { id, expires } = approvalQueue.shift()
			if (Date.now() >= expires) {
				logger.info({ provider: name, id, expires }, 'Approval queue item expired.')
				return;
			}
		  const post = await getPostWithId(id)
			processResponse(post)
		} catch (err) {
			logger.error({ provider: name }, err)
		}
	}

	async function runIteration() {
		try {
			if (onProvide === null) {
				logger.warn({ provider: name }, 'Tried to run iteration but onProvide is not set.')
				return;
			}
			logger.info({ provider: name, lastId }, 'Running iteration.')
			const post = await getMostRecentPost()
			processResponse(post, true)
		} catch (err) {
			logger.error({ provider: name }, err)
		}
	}

	async function init() {
		logger.info({ provider: name }, 'Initializing provider.')
		if (persistence !== null) {
			lastId = await persistence.getObjectDefault(`/extra/danbooru/lastIds/${name}`, null)
		}
	}

	function start() {
		if (state === 'running') return;
		logger.info({ provider: name }, 'Starting provider.')
		state = 'running'
		runIteration()
		timer = setInterval(runIteration, interval)
		if (approvedOnly) {
			runApprovalQueueIteration()
			approvalQueueTimer = setInterval(runApprovalQueueIteration, Math.floor(interval + (interval / 2)))
		}
	}

  function stop() {
		if (state === 'idle') return;
		logger.info({ provider: name }, 'Stopping provider.')
		state = 'idle'
		clearInterval(timer)
		if (approvedOnly) {
			clearInterval(approvalQueueTimer)
		}
	}

	return {
		init,
		start,
		stop,
		get onProvide() { return onProvide },
		set onProvide(callback) { onProvide = callback },
		get state() { return state },
		get type() { return type },
		get args() { return args },
	}
}
