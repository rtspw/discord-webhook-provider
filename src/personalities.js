const logger = require('pino')()

class Personalities {
	constructor(persons = {}) {
		this.persons = persons
	}

	add(name, displayName, avatarUrl) {
		this.persons[name] = { displayName, avatarUrl }
		logger.info({ name, displayName, avatarUrl }, 'Personality added.')
	}

	remove(name) {
		delete this.persons[name]
		logger.info({ name }, 'Personality deleted.')
	}

	appendToWebhook(name, webhook) {
		logger.info({ name, webhook }, 'Appending personality to webhook.')
		if (!name || !(name in this.persons)) {
			logger.warn({ name }, 'Tried to append personality that did not exist.')
			return webhook
		}
		const personality = this.persons[name]
		return { ...webhook, ...{ username: personality.displayName, avatar_url: personality.avatarUrl } }
	}
}

module.exports = Personalities
