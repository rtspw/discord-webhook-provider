import logger from '../globals/logger'
import { type ProvideData } from '../providers/provider'
import { Middleware } from './middleware'

export interface Options {
	name: string;
	tags: string[];
}

export default class BlockedTagsFilterMiddleware extends Middleware {
	acceptedTypes = ['danbooru']
	type = 'blocked-tags-filter'
	name: string
	tags: Set<string>

	constructor(args: Options) {
		super(args)
		this.name = args.name
		this.tags = new Set(args.tags)
	}

	process(data: ProvideData): ProvideData | null {
		logger.info({ provider: data.provider, middleware: this.name }, 'Running middleware.')
		for (const tag of data.metadata.info.tags) {
			if (this.tags.has(tag)) {
				logger.info({ provider: data.provider, middleware: this.name, tag }, 'Blocked due to blacklisted tag.')
				return null
			}
		}
		return data
	}
}
