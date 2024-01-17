const logger = require('pino')()
const { compose } = require('./middlewares/compose')

class Mapping {
	constructor(providers, endpoints, personalities) {
		this.providers = providers
		this.endpoints = endpoints
		this.personalities = personalities
		this.mapping = []
		this.subscriptions = {}
	}

	_addSubscriber(from, to, callback) {
		if (!(from in this.subscriptions)) {
			this.subscriptions[from] = [{ to, callback }]
			this.providers.setOnProvide(from, (data) => {
				for (const subscriber of this.subscriptions[from]) {
					subscriber.callback(data)
				}
			})
		} else {
			this.subscriptions[from].push({ to, callback })
		}
	}

	_removeSubscriber(from, to) {
		if (!(from in this.subscriptions)) {
			return;
		} else {
			this.subscriptions[from] = this.subscriptions[from].filter(subscription => subscription.to !== to)
			if (this.subscriptions[from].length <= 0) {
				delete this.subscriptions[from]
				this.providers.unsetOnProvide(from)
			}
		}
	}

	addMapping({ from, to, middlewares = [], personality = undefined}) {
		logger.info({ from, to, personality }, 'Adding new mapping.')
		this.mapping.push({ from, to, middlewares, personality })
		const composedMiddleware = compose(...middlewares)
		this._addSubscriber(from, to, (data) => {
			logger.info({ from, to }, 'Sending data through middleware')
			const dataAfterMiddleware = composedMiddleware(data)
			if (dataAfterMiddleware === null) return;
			logger.info({ from, to, personality }, 'Appending personality to webhook.')
			const finalWebhook = this.personalities.appendToWebhook(personality, dataAfterMiddleware.webhook)
			logger.info({ from, to, finalWebhook }, 'Sending webhook.')
			this.endpoints.sendWebhook(to, finalWebhook)
		})
	}

	/** deleteMappingsAssociatedWithProvider */
	/** updateMappingsAssociatedWithPersonality */
	/** deleteMappingsAssociatedWithEndpoint */
}

module.exports = Mapping
