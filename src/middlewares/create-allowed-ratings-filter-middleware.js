const logger = require('pino')()

function createAllowedRatingsFilter(name, allowedRatings = []) {
	return (data) => {
		logger.info({ provider: data.provider, middleware: name }, 'Running middleware.')
    if (data.provider.type !== 'danbooru') return null
		const rating = data.metadata.info.rating
		if (!allowedRatings.includes(rating)) {
			logger.info({ provider: data.provider, middleware: name, id: data.metadata.info.id, rating }, 'Blocked due to rating.')
			return null
		}
		return data
	}
}

module.exports = createAllowedRatingsFilter
