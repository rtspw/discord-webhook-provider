const createRemoveDuplicatesMiddleware = require('./remove-dup-middleware')
const createAllowedRatingsFilter = require('./create-allowed-ratings-filter-middleware')
const createBlockedTagsFilter = require('./create-blocked-tags-filter-middleware')

const avaliableMiddleware = {
  'remove-duplicates': {
    name: 'Remove Duplicates',
    description: '',
    providers: 'danbooru',
    factory: createRemoveDuplicatesMiddleware,
    arguments: {
      name: { type: 'string' },
    },
  },
  'allowed-ratings-filter': {
    name: 'Allow Ratings',
    description: '',
    providers: 'danbooru',
    factory: createAllowedRatingsFilter,
    arguments: {
      name: { type: 'string' },
      ratings: { type: 'array', subtype: { type: 'string' }},
    },
  },
  'blocked-tags-filter': {
    name: 'Block Tags',
    description: '',
    providers: 'danbooru',
    factory: createBlockedTagsFilter,
    arguments: {
      name: { type: 'string' },
      tags: { type: 'array', subtype: { type: 'string' }},
    },
  }
}

class MiddlewareRegistry {
  constructor(middlewares = {}) {
    this.middlewares = middlewares
  }

  add(name, middleware) {
    this.middlewares[name] = middleware
  }

  get(name) {
    if (!(name in this.middlewares)) throw new Error(`Middleware (${name}) was not found`)
    return this.middlewares[name]
  }
}

module.exports = {
  avaliableMiddleware,
  MiddlewareRegistry,
}
