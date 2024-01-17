const fs = require('node:fs/promises')
const path = require('node:path')
const { exit } = require('node:process')
const logger = require('pino')()
const { JsonDB, Config } = require('node-json-db')

const createDanbooruProvider = require('./create-danbooru-provider')

const persistence = new JsonDB(new Config('persistence', true, false, '/'))

const providers = {
	'sunny_milk_feed': createDanbooruProvider({ name: 'sunny_milk_feed', tags: ['sunny_milk'], persistence }),
	'amamiya_kokoro_feed': createDanbooruProvider({ name: 'amamiya_kokoro_feed', tags: ['sunny_milk'], persistence })
}

const personalities = {
	'Sunny Milk': {
		name: 'Sunny Milk',
		url: 'https://cdn.discordapp.com/attachments/1174573267047170110/1196746729790390302/1129803974065795153.webp?ex=65b8c03e&is=65a64b3e&hm=8c2cee50eb970356c3e38e486952e70da217a641301ae2fb9a90f6e40d95808b&',
	},
	'Amamiya Kokoro': {
		name: 'Amamiya Kokoro',
		url: 'https://cdn.discordapp.com/attachments/1174573267047170110/1197044715623825449/031220201607012608.jpeg?ex=65b9d5c4&is=65a760c4&hm=41da13d3d943bd86dedbd51e551828b9bf9dfc42eef83a3a912b440e70d4cb4d&',
	}
}

const webhookEndpoints = {}

function createDupRemoverMiddleware(name) {
	const seenIds = new Set()
	return (data) => {
		const currId = data.metadata.info.id
		if (seenIds.has(currId)) {
			logger.info({ middleware: name, id: currId }, 'Duplicate found.')
			return null
		}
		seenIds.add(currId)
		return {
			webhook: data.webhook,
			metadata: data.metadata,
		}
	}
}

const middlewares = {
	'dup_remover': createDupRemoverMiddleware()
}

const mappings = [{
	from: 'sunny_milk_feed',
	to: 'testing_server',
	middlewares: [middlewares['dup_remover']],
	person: 'Sunny Milk',
}, {
	from: 'amamiya_kokoro_feed',
	to: 'testing_server',
	middlewares: [middlewares['dup_remover']],
	person: 'Amamiya Kokoro',
}]

async function readConfig() {
	try {
		const configFile = await fs.readFile(path.join(__dirname, 'config.json'))
		return JSON.parse(configFile)
	} catch (e) {
		logger.fatal(e)
		exit(1)
	}
}

async function sendWebhook(endpointName, webhook) {
	if (webhookEndpoints[endpointName] === undefined) throw new Error(`Webhook endpoint with name (${endpointName}) does not exist`)
	const endpointInfo = webhookEndpoints[endpointName]
	const webhookUrl = new URL(`https://discord.com/api/webhooks/${endpointInfo.id}/${endpointInfo.token}`);
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

function hookUpMappings(mappings) {
	for (const mapping of mappings) {
		const { from, to, middlewares = [], person = null } = mapping
		const provider = providers[from]
		if (provider === undefined) throw new Error(`Provider (${from}) does not exist`)
		const personality = person === null ? null : personalities[person]
		if (personality === undefined) throw new Error(`Personality (${person}) does not exist`)
		provider.onProvide = (data) => {
			let _data = data
			for (const middleware of middlewares) {
				_data = middleware(_data)
				if (_data === null) return;
			}
			const webhookPersonality = personality === null ? null : { username: personality.name, avatar_url: personality.url }
			logger.info({ from, to, person }, 'Sending webhook.')
			sendWebhook(to, { ...data.webhook, ...webhookPersonality })
		}
	}
}

async function main() {
	logger.info('Reading config and loading endpoint info.')
	const config = await readConfig()
	config.webhooks.forEach(({ tag, id, token }) => {
		webhookEndpoints[tag] = { id, token }
	})
	logger.info('Hooking up mappings.')
	hookUpMappings(mappings)
	logger.info('Loading initial values for each provider.')
	await Promise.all(Object.values(providers).map(provider => provider.init()))
	logger.info('Starting up each provider.')
	Object.values(providers).forEach(provider => provider.start())
}

main()
