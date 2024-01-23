const logger = require('pino')()

function createBlockedTagsFilter({ name, tags = [] }) {
	const blockedTagsSet = new Set(tags)
	return {
		type: 'blocked-tags-filter',
		name,
		args: { name, tags },
		run: (data) => {
			logger.info({ provider: data.provider, middleware: name }, 'Running middleware.')
			if (data.provider.type !== 'danbooru') return null
			for (const tag of data.metadata.info.tags) {
				if (blockedTagsSet.has(tag)) {
					logger.info({ provider: data.provider, middleware: name, tag }, 'Blocked due to blacklisted tag.')
					return null
				}
			}
			return data
		},
	}
}

module.exports = createBlockedTagsFilter
