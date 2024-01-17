const logger = require('pino')()

class Providers {
	constructor(providers = {}) {
		this.providers = providers
	}

	add(name, provider) {
		logger.info({ name, provider })
		this.providers[name] = provider
	}

	get(name) {
		if (!(name in this.providers)) throw new Error(`Provider (${name}) was not found`)
		return this.providers[name]
	}

	start(name) {
		const provider = this.get(name)
		logger.info({ provider: name }, 'Trying to start provider.')
		provider.start()
	}

	stop(name) {
		const provider = this.get(name)
		logger.info({ provider: name }, 'Trying to stop provider.')
		provider.stop()
	}

	async init(name) {
		const provider = this.get(name)
		logger.info({ provider: name }, 'Trying to initialize provider.')
		await provider.init()
	}

	async initAll() {
		await Promise.all(Object.values(this.providers).map(provider => provider.init()))
	}

	startAll() {
		Object.keys(this.providers).forEach((name) => { this.start(name) })
	}

	stopAll() {
		Object.keys(this.providers).forEach((name) => { this.stop(name) })
	}

	setOnProvide(name, onProvide) {
		const provider = this.get(name)
		provider.onProvide = onProvide
	}

	unsetOnProvide(name) {
		provider.onProvide = null
	}
}

module.exports = Providers
