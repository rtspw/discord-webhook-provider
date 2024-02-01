import fs from 'node:fs/promises'
import path from 'node:path'
import { exit } from 'node:process'
import logger from './globals/logger'

import { type RESTPostAPIWebhookWithTokenJSONBody as Webhook } from 'discord.js/typings'

interface FileItem {
	name: string;
	id: string;
	token: string;
}

export interface Endpoint {
	id: string;
	token: string;
}

export default class WebhookEndpoints {
	static baseUrl = 'https://discord.com/api/webhooks'

	endpoints: Record<string, Endpoint>

	constructor(endpoints: Record<string, Endpoint> = {}) {
		this.endpoints = endpoints
	}

	async loadFromFile(filename: string) {
		logger.info('Reading config and loading endpoint info.')
		try {
			const file = await fs.readFile(path.resolve(__dirname, '..', filename), 'utf-8')
			const json = JSON.parse(file) as FileItem[]
			json.forEach(({ name, id, token }) => { this.add(name, id, token) })
		} catch (e) {
			logger.fatal(e)
			exit(1)
		}
	}

	add(name: string, id: string, token: string) {
		this.endpoints[name] = { id, token }
	}

	get(name: string) {
		if (!(name in this.endpoints)) throw new Error(`Endpoint (${name}) was not found`)
		return this.endpoints[name]
	}

	async sendWebhook(name: string, webhook: Webhook) {
		try {
			const endpoint = this.get(name)
			const webhookUrl = new URL(`${WebhookEndpoints.baseUrl}/${endpoint.id}/${endpoint.token}`);
			const body = JSON.stringify(webhook);
			const options = {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				body,
			};
			await fetch(webhookUrl, options)
		} catch (err: unknown) {
			logger.error({ name, webhook, err })
		}
	}
}
