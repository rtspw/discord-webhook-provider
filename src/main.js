const logger = require('pino')()
const { JsonDB, Config } = require('node-json-db')

const createDanbooruProvider = require('./create-danbooru-provider')
const createRemoveDuplicatesMiddleware = require('./middlewares/remove-dup-middleware')
const createSafeRatingOnlyMiddleware = require('./middlewares/safe-rating-only-middleware')

const persistence = new JsonDB(new Config('persistence', true, false, '/'))
const Providers = require('./providers')
const Personalities = require('./personalities')
const WebhookEndpoints = require('./webhook-endpoints')
const Mapping = require('./mapping')

const personalityInfo = {
	'Sunny Milk': {
		displayName: 'Sunny Milk',
		avatarUrl: 'https://cdn.discordapp.com/attachments/1174573267047170110/1196746729790390302/1129803974065795153.webp?ex=65b8c03e&is=65a64b3e&hm=8c2cee50eb970356c3e38e486952e70da217a641301ae2fb9a90f6e40d95808b&',
	},
	'Amamiya Kokoro': {
		displayName: 'Amamiya Kokoro',
		avatarUrl: 'https://cdn.discordapp.com/attachments/1174573267047170110/1197044715623825449/031220201607012608.jpeg?ex=65b9d5c4&is=65a760c4&hm=41da13d3d943bd86dedbd51e551828b9bf9dfc42eef83a3a912b440e70d4cb4d&',
	}
}

const middlewares = {
	'dup_remover': createRemoveDuplicatesMiddleware('dup_remover'),
	'safe_rating_only': createSafeRatingOnlyMiddleware('safe_rating_only'),
}

async function main() {
	const webhookEndpoints = new WebhookEndpoints()
	await webhookEndpoints.loadFromFile('endpoints.json')
	const personalities = new Personalities(personalityInfo)
	const providers = new Providers({
		'soga_no_tojiko_feed': createDanbooruProvider({ name: 'soga_no_tojiko_feed', tags: ['soga_no_tojiko'], persistence }),
		'mononobe_no_futo_feed': createDanbooruProvider({ name: 'mononobe_no_futo_feed', tags: ['mononobe_no_futo'], persistence }),
		'toyosatomimi_no_miko_feed': createDanbooruProvider({ name: 'toyosatomimi_no_miko', tags: ['toyosatomimi_no_miko'], persistence }),
		'seiga_kaku_feed': createDanbooruProvider({ name: 'seiga_kaku_feed', tags: ['seiga_kaku'], persistence }),
		'miyako_yoshika_feed': createDanbooruProvider({ name: 'miyako_yoshika_feed', tags: ['miyako_yoshika'], persistence }),
	})
	logger.info('Loading initial values for each provider.')
	providers.initAll();
	const mapping = new Mapping(providers, webhookEndpoints, personalities)
	mapping.addMapping({
		from: 'soga_no_tojiko_feed',
		to: 'testing_server',
		middlewares: [middlewares['dup_remover']],
		personality: 'Sunny Milk',
	})
	mapping.addMapping({
		from: 'mononobe_no_futo_feed',
		to: 'testing_server',
		middlewares: [middlewares['dup_remover']],
		personality: 'Amamiya Kokoro',
	})
	mapping.addMapping({
		from: 'toyosatomimi_no_miko_feed',
		to: 'testing_server',
		middlewares: [middlewares['dup_remover']],
		personality: 'Sunny Milk',
	})
	mapping.addMapping({
		from: 'seiga_kaku_feed',
		to: 'testing_server',
		middlewares: [middlewares['dup_remover']],
		personality: 'Amamiya Kokoro',
	})
	mapping.addMapping({
		from: 'miyako_yoshika_feed',
		to: 'testing_server',
		middlewares: [middlewares['dup_remover']],
		personality: 'Sunny Milk',
	})
	logger.info('Starting up each provider.')
	providers.startAll()
}

main()
