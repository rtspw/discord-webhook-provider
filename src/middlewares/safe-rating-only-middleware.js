const logger = require('pino')()

function createSafeRatingOnlyMiddleware(name) {
	return (data) => {
    if (data.provider.type !== 'danbooru') return null
		if (data.metadata.info.rating !== 'g' || data.metadata.info.rating !== 's') {
			logger.info({ provider: data.provider, middleware: name, id: data.metadata.info.id }, 'Blocked due to rating.')
			return null
		}
		return data
	}
}

module.exports = createSafeRatingOnlyMiddleware
