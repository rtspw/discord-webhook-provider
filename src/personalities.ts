import logger from './globals/logger'
import { type RESTPostAPIWebhookWithTokenJSONBody as Webhook } from 'discord.js/typings'

export interface Personality {
	displayName: string;
	avatarUrl: string;
}

export default class Personalities {
	persons: Record<string, Personality>
	constructor(persons: Record<string, Personality> = {}) {
		this.persons = persons
	}

	add(name: string, displayName: string, avatarUrl: string) {
		this.persons[name] = { displayName, avatarUrl }
		logger.info({ name, displayName, avatarUrl }, 'Personality added.')
	}

	remove(name: string) {
		delete this.persons[name]
		logger.info({ name }, 'Personality deleted.')
	}

	appendToWebhook(name: string , webhook: Webhook): Webhook {
		logger.info({ name, webhook }, 'Appending personality to webhook.')
		if (!name || !(name in this.persons)) {
			logger.warn({ name }, 'Tried to append personality that did not exist.')
			return webhook
		}
		const personality = this.persons[name]
		return { ...webhook, ...{ username: personality.displayName, avatar_url: personality.avatarUrl } }
	}
}
