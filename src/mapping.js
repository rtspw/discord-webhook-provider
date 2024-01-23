const logger = require('pino')()
const { compose } = require('./middlewares/compose')

class Mapping {
	constructor(providers, endpoints, personalities, middlewareRegistry) {
		this.providers = providers
		this.endpoints = endpoints
		this.personalities = personalities
		this.middlewareRegistry = middlewareRegistry
		this.mapping = []
		this.subscriptions = {}
		this._nextId = 0
	}

	_addSubscriber(from, to, mappingId, callback) {
		if (!(from in this.subscriptions)) {
			this.subscriptions[from] = [{ to, mappingId, callback }]
			this.providers.setOnProvide(from, (data) => {
				for (const subscriber of this.subscriptions[from]) {
					subscriber.callback(data)
				}
			})
		} else {
			this.subscriptions[from].push({ to, mappingId, callback })
		}
	}

	_removeSubscriber(from, to, mappingId) {
		if (!(from in this.subscriptions)) {
			return;
		} else {
			this.subscriptions[from] = this.subscriptions[from]
			  .filter(subscription => subscription.to !== to && subscription.mappingId !== mappingId)
			if (this.subscriptions[from].length <= 0) {
				delete this.subscriptions[from]
				this.providers.unsetOnProvide(from)
			}
		}
	}

	_getNextId() {
		const nextId = this._nextId
		this._nextId = this._nextId + 1
		return nextId
	}

	_resolveMiddlewares(unresolvedMiddlewares) {
		return unresolvedMiddlewares.map(item => 
			(typeof item) === 'string' ? this.middlewareRegistry.get(item) : item)
	}

	addMapping({ from, to, middlewares = [], personality = undefined}) {
		logger.info({ from, to, personality }, 'Adding new mapping.')
		const mappingId = this._getNextId()
		this.mapping.push({ id: mappingId, from, to, middlewares, personality })
		const composedMiddleware = compose(...this._resolveMiddlewares(middlewares))
		this._addSubscriber(from, to, mappingId, (data) => {
			logger.info({ from, to, mappingId  }, 'Sending data through middleware')
			const dataAfterMiddleware = composedMiddleware.run(data)
			if (dataAfterMiddleware === null) return;
			logger.info({ from, to, mappingId, personality }, 'Appending personality to webhook.')
			const finalWebhook = this.personalities.appendToWebhook(personality, dataAfterMiddleware.webhook)
			logger.info({ from, to, mappingId, finalWebhook }, 'Sending webhook.')
			this.endpoints.sendWebhook(to, finalWebhook)
		})
	}

	/** deleteMappingsAssociatedWithProvider */
	/** updateMappingsAssociatedWithPersonality */
	/** deleteMappingsAssociatedWithEndpoint */
}

module.exports = Mapping
