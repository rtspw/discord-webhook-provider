import logger from '../globals/logger'
import { Middleware } from './middleware'
import { type ProvideData } from '../providers/provider'

/**
 * Middleware to blocks danbooru posts that have already been provided
 * Primary use case is for posts with multiple tags that trigger multiple providers pushing to the same endpoint
 * The seen Ids are not persisted between sessions
 */

export interface Options {
	name: string
}

export default class RemoveDuplicatesMiddleware extends Middleware {
	name: string
	acceptedTypes = ['danbooru']
	seenIds: Set<number>

	constructor(args: Options) {
		super(args)
		this.name = args.name
		this.seenIds = new Set()
	}
	
	process(data: ProvideData): ProvideData | null {
		logger.info({ provider: data.provider, middleware: this.name }, 'Running middleware.')
		const currId = data.metadata.info.id
		if (this.seenIds.has(currId)) {
			logger.info({ provider: data.provider, middleware: this.name, id: currId }, 'Duplicate found.')
			return null
		}
		this.seenIds.add(currId)
		return data
	}
}
