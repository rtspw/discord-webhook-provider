const logger = require('pino')()

const createDanbooruProvider = require('./providers/create-danbooru-provider')
const createRemoveDuplicatesMiddleware = require('./middlewares/remove-dup-middleware')
const createAllowedRatingsFilter = require('./middlewares/create-allowed-ratings-filter-middleware')
const createBlockedTagsFilter = require('./middlewares/create-blocked-tags-filter-middleware')
const { composeWithRegistry } = require('./middlewares/compose')

const { MiddlewareRegistry } = require('./middlewares/registry')

const { getPersistence, saveMappingsFrom, saveMiddlewareRegistryFrom, loadMiddlewareRegistryInto, loadMappingsInto, loadProvidersInto, loadPersonalitiesInto, saveEndpointsFrom, savePersonalitiesFrom, saveProvidersFrom} = require('./persistence')
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
	},
	'Tojiko': {
		displayName: 'Soga no Tojiko',
		avatarUrl: 'https://cdn.discordapp.com/attachments/1059178872207310858/1062406133874176000/54972842_p26_cropped.png',
	},
	'Miko': {
		displayName: 'Toyosatomimi no Miko',
		avatarUrl: 'https://cdn.discordapp.com/attachments/1059178872207310858/1062406133572190338/54972842_p26_cropped_2.png',
	},
	'Futo': {
		displayName: 'Mononobe no Futo',
		avatarUrl: 'https://cdn.discordapp.com/attachments/1059178872207310858/1062406135639977984/54972842_p26_cropped_3.png',
	},
	'Seiga': {
		displayName: 'Seiga Kaku',
		avatarUrl: 'https://cdn.discordapp.com/attachments/1059178872207310858/1062406134964686990/66992655_p20_cropped_1.png',
	},
	'Yoshika': {
		displayName: 'Yoshika Miyako',
		avatarUrl: 'https://cdn.discordapp.com/attachments/1059178872207310858/1062406135291855028/66992655_p20_cropped.png',
	}
}

async function initHardcodedValues({ middlewareRegistry, personalities, providers, mapping }) {
	logger.info('Setting initial hardcoded values')

	const persistence = getPersistence()
	middlewareRegistry.add('dup_remover', createRemoveDuplicatesMiddleware({ name: 'dup_remover' }))
	middlewareRegistry.add('safe_rating_only', createAllowedRatingsFilter({ name: 'safe_rating_only', ratings: ['g'] }))
	middlewareRegistry.add('discord_tos_filter', createBlockedTagsFilter({ name: 'discord_tos_filter', tags: ['loli', 'guro'] }))
	providers.add('soga_no_tojiko_feed', createDanbooruProvider({ name: 'soga_no_tojiko_feed', tags: ['soga_no_tojiko'], interval: 180000, persistence }))
	providers.add('mononobe_no_futo_feed', createDanbooruProvider({ name: 'mononobe_no_futo_feed', tags: ['mononobe_no_futo'], interval: 180000, persistence }))
	providers.add('toyosatomimi_no_miko_feed', createDanbooruProvider({ name: 'toyosatomimi_no_miko_feed', tags: ['toyosatomimi_no_miko'], interval: 180000, persistence }))
	providers.add('seiga_kaku_feed', createDanbooruProvider({ name: 'seiga_kaku_feed', tags: ['kaku_seiga'], interval: 180000, persistence }))
	providers.add('miyako_yoshika_feed', createDanbooruProvider({ name: 'miyako_yoshika_feed', tags: ['miyako_yoshika'], interval: 180000, persistence }))
	for (const [name, info] of Object.entries(personalityInfo)) {
		personalities.add(name, info.displayName, info.avatarUrl)
	}
	const sharedMiddleware = composeWithRegistry(middlewareRegistry, 'dup_remover', 'safe_rating_only', 'discord_tos_filter')
	mapping.addMapping({
		from: 'soga_no_tojiko_feed',
		to: 'divine_spirit_mausoleum',
		middlewares: [sharedMiddleware],
		personality: 'Tojiko',
	})
	mapping.addMapping({
		from: 'mononobe_no_futo_feed',
		to: 'divine_spirit_mausoleum',
		middlewares: [sharedMiddleware],
		personality: 'Futo',
	})
	mapping.addMapping({
		from: 'toyosatomimi_no_miko_feed',
		to: 'divine_spirit_mausoleum',
		middlewares: [sharedMiddleware],
		personality: 'Miko',
	})
	mapping.addMapping({
		from: 'seiga_kaku_feed',
		to: 'divine_spirit_mausoleum',
		middlewares: [sharedMiddleware],
		personality: 'Seiga',
	})
	mapping.addMapping({
		from: 'miyako_yoshika_feed',
		to: 'divine_spirit_mausoleum',
		middlewares: [sharedMiddleware],
		personality: 'Yoshika',
	})
	logger.info('Saving initial values')
	savePersonalitiesFrom(personalities)
	saveMiddlewareRegistryFrom(middlewareRegistry)
	saveMappingsFrom(mapping)
	saveProvidersFrom(providers)
}

async function main() {
	const providers = new Providers()
	// await loadProvidersInto(providers)
	const webhookEndpoints = new WebhookEndpoints()
	await webhookEndpoints.loadFromFile('endpoints.json')
	const personalities = new Personalities()
	// await loadPersonalitiesInto(personalities)
	const middlewareRegistry = new MiddlewareRegistry()
	// await loadMiddlewareRegistryInto(middlewareRegistry)
	const mapping = new Mapping(providers, webhookEndpoints, personalities, middlewareRegistry)
	// await loadMappingsInto(mapping, middlewareRegistry)

	await initHardcodedValues({ middlewareRegistry, personalities, providers, mapping })

	logger.info('Loading initial values for each provider.')
	await providers.initAll();

	logger.info('Starting up each provider.')
	providers.startAll()
}

main()
