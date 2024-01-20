const logger = require('pino')()
const { exit } = require('node:process')
const fs = require('node:fs/promises')
const path = require('node:path')

class WebhookEndpoints {
	static baseUrl = 'https://discord.com/api/webhooks'

	constructor(endpoints = {}) {
		this.endpoints = endpoints
	}

	async loadFromFile(filename) {
		logger.info('Reading config and loading endpoint info.')
		try {
			const file = await fs.readFile(path.resolve(__dirname, '..', filename))
			const json = JSON.parse(file)
			json.forEach(({ name, id, token }) => { this.add(name, id, token) })
		} catch (e) {
			logger.fatal(e)
			exit(1)
		}
	}

	add(name, id, token) {
		this.endpoints[name] = { id, token }
	}

	get(name) {
		if (!(name in this.endpoints)) throw new Error(`Endpoint (${name}) was not found`)
		return this.endpoints[name]
	}

	async sendWebhook(name, webhook) {
		const endpoint = this.get(name)
		const webhookUrl = new URL(`${WebhookEndpoints.baseUrl}/${endpoint.id}/${endpoint.token}`);
		webhookUrl.searchParams.set('wait', 'true')
		const body = JSON.stringify(webhook);
		const options = {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
			body,
		};
		const res = await fetch(webhookUrl, options)
		const result = await res.json()
		return result
	}
}

module.exports = WebhookEndpoints
