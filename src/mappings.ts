import logger from './globals/logger'
import { composeWithRegistry } from './middlewares/compose'

import Providers from './providers'
import WebhookEndpoints from './webhook-endpoints'
import Personalities from './personalities'
import { MiddlewareRegistry } from './middlewares/registry'
import { Middleware } from './middlewares/middleware'
import { type ProvideData } from './providers/provider'

export interface Mapping {
	id: number;
	from: string;
	to: string;
	middlewares: (Middleware | string)[]
	personality: string | null;
}

export type SubscriptionCallback = (data: ProvideData) => void

export interface Subscription {
	to: string;
	mappingId: number;
	callback: SubscriptionCallback;
}

export type Subscriptions = Record<string, Subscription[]>

export interface AddMappingOptions {
	from: string;
	to: string;
	middlewares?: (Middleware | string)[];
	personality?: string | null;
}

export default class Mappings {
	private providers: Providers
	private endpoints: WebhookEndpoints
	private personalities: Personalities
	private middlewareRegistry: MiddlewareRegistry
	private mappings: Mapping[] = []
	private subscriptions: Subscriptions
	private _nextId = 0

	constructor(providers: Providers, endpoints: WebhookEndpoints, personalities: Personalities, middlewareRegistry: MiddlewareRegistry) {
		this.providers = providers
		this.endpoints = endpoints
		this.personalities = personalities
		this.middlewareRegistry = middlewareRegistry
		this.mappings = []
		this.subscriptions = {}
		this._nextId = 0
	}

	private addSubscriber(from: string, to: string, mappingId: number, callback: SubscriptionCallback) {
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

	private _removeSubscriber(from: string, to: string, mappingId: number) {
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

	private getNextId() {
		const nextId = this._nextId
		this._nextId = this._nextId + 1
		return nextId
	}

	private resolveMiddlewares(unresolvedMiddlewares: (Middleware | string)[]) {
		return unresolvedMiddlewares.map(item => 
			typeof item === 'string' ? this.middlewareRegistry.get(item) : item)
	}

	addMapping({ from, to, middlewares = [], personality = null}: AddMappingOptions) {
		logger.info({ from, to, personality }, 'Adding new mapping.')
		const mappingId = this.getNextId()
		this.mappings.push({ id: mappingId, from, to, middlewares, personality })
		const composedMiddleware = composeWithRegistry(this.middlewareRegistry, ...middlewares)
		this.addSubscriber(from, to, mappingId, (data) => {
			if (personality !== null) {
				logger.info({ from, to, mappingId, personality }, 'Appending personality to webhook.')
				data.webhook = this.personalities.appendToWebhook(personality, data.webhook)
			}
			logger.info({ from, to, mappingId }, 'Sending data through middleware')
			const dataAfterMiddleware = composedMiddleware.run(data)
			if (dataAfterMiddleware === null) return;
			logger.info({ from, to, mappingId, webhook: dataAfterMiddleware.webhook }, 'Sending webhook.')
			this.endpoints.sendWebhook(to, dataAfterMiddleware.webhook)
		})
	}

	/** deleteMappingsAssociatedWithProvider */
	/** updateMappingsAssociatedWithPersonality */
	/** deleteMappingsAssociatedWithEndpoint */
}
