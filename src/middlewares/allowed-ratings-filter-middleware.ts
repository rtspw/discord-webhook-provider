import logger from '../globals/logger'
import { type ProvideData } from '../providers/provider'
import { Middleware } from './middleware'

export interface Options {
	name: string;
	ratings: string[];
}

export default class AllowedRatingsFilterMiddleware extends Middleware {
	acceptedTypes = ['danbooru']
	type = 'allowed-ratings-filter'
	name: string
	ratings: string[]

	constructor(args: Options) {
		super(args)
		this.name = args.name
		this.ratings = args.ratings
	}

	process(data: ProvideData): ProvideData | null {
		logger.info({ provider: data.provider, middleware: this.name }, 'Running middleware.')
		const rating = data.metadata.info.rating
		if (!this.ratings.includes(rating)) {
			logger.info({ provider: data.provider, middleware: this.name, id: data.metadata.info.id, rating }, 'Blocked due to rating.')
			return null
		}
		return data
	}
}
