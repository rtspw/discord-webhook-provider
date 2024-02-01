import { type ArgType } from '../util/arg-types';
import { type Middleware } from './middleware';
import RemoveDuplicatesMiddleware, { type Options as RemoveDuplicatesOptions } from './remove-duplicates-middleware'
import AllowedRatingsFilterMiddleware, { type Options as AllowedRatingsOptions } from './allowed-ratings-filter-middleware'
import BlockedTagsFilterMiddleware, { type Options as BlockedTagsOptions } from './blocked-tags-filter-middleware';

export interface MiddlewareMetadata {
  name: string;
  description: string;
  acceptedTypes: string[] | 'all';
  factory: (args: any) => Middleware;
  arguments: Record<string, ArgType>;
}

export const avaliableMiddleware: Record<string, MiddlewareMetadata> = {
  'remove-duplicates': {
    name: 'Remove Duplicates',
    description: '',
    acceptedTypes: ['danbooru'],
    factory: (args: RemoveDuplicatesOptions) => new RemoveDuplicatesMiddleware(args),
    arguments: {
      name: { type: 'string' },
    },
  },
  'allowed-ratings-filter': {
    name: 'Allow Ratings',
    description: '',
    acceptedTypes: ['danbooru'],
    factory: (args: AllowedRatingsOptions) => new AllowedRatingsFilterMiddleware(args),
    arguments: {
      name: { type: 'string' },
      ratings: { type: 'array', subtype: { type: 'string' }},
    },
  },
  'blocked-tags-filter': {
    name: 'Block Tags',
    description: '',
    acceptedTypes: ['danbooru'],
    factory: (args: BlockedTagsOptions) => new BlockedTagsFilterMiddleware(args),
    arguments: {
      name: { type: 'string' },
      tags: { type: 'array', subtype: { type: 'string' }},
    },
  }
}

export class MiddlewareRegistry {
  middlewares: Record<string, Middleware>
  constructor(middlewares = {}) {
    this.middlewares = middlewares
  }

  add(name: string, middleware: Middleware) {
    this.middlewares[name] = middleware
  }

  get(name: string) {
    if (!(name in this.middlewares)) throw new Error(`Middleware (${name}) was not found`)
    return this.middlewares[name]
  }
}
