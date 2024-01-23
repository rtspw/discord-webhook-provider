const logger = require('pino')()

function createAllowedRatingsFilter({ name, ratings = [] }) {
	return {
		type: 'allowed-ratings-filter',
		name,
		args: { name, ratings },
		run: (data) => {
			logger.info({ provider: data.provider, middleware: name }, 'Running middleware.')
			if (data.provider.type !== 'danbooru') return null
			const rating = data.metadata.info.rating
			if (!ratings.includes(rating)) {
				logger.info({ provider: data.provider, middleware: name, id: data.metadata.info.id, rating }, 'Blocked due to rating.')
				return null
			}
			return data
		}
	}
}

module.exports = createAllowedRatingsFilter
