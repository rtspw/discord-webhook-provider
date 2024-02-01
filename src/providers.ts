import logger from "./globals/logger"
import { type ProvideHandler, type Provider } from "./providers/provider"

export default class Providers {
	providers: Record<string, Provider>

	constructor(providers: Record<string, Provider> = {}) {
		this.providers = providers
	}

	add(name: string, provider: Provider) {
		logger.info({ name, provider })
		this.providers[name] = provider
	}

	get(name: string) {
		if (!(name in this.providers)) throw new Error(`Provider (${name}) was not found`)
		return this.providers[name]
	}

	start(name: string) {
		const provider = this.get(name)
		logger.info({ provider: name }, 'Trying to start provider.')
		provider.start()
	}

	stop(name: string) {
		const provider = this.get(name)
		logger.info({ provider: name }, 'Trying to stop provider.')
		provider.stop()
	}

	async init(name: string) {
		const provider = this.get(name)
		logger.info({ provider: name }, 'Trying to initialize provider.')
		provider.init()
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

	setOnProvide(name: string, onProvide: ProvideHandler) {
		const provider = this.get(name)
		provider.onProvide = onProvide
	}

	unsetOnProvide(name: string) {
		const provider = this.get(name)
		provider.onProvide = () => {}
	}
}
