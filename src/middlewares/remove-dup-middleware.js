const logger = require('pino')()

/**
 * Middleware to blocks danbooru posts that have already been provided
 * Primary use case is for posts with multiple tags that trigger multiple providers pushing to the same endpoint
 * The seen Ids are not persisted between sessions
 */
function createRemoveDuplicatesMiddleware(name) {
	const seenIds = new Set()
	return (data) => {
    if (data.provider.type !== 'danbooru') return null
		const currId = data.metadata.info.id
		if (seenIds.has(currId)) {
			logger.info({ provider: data.provider, middleware: name, id: currId }, 'Duplicate found.')
			return null
		}
		seenIds.add(currId)
		return data
	}
}

module.exports = createRemoveDuplicatesMiddleware
