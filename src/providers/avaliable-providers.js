const createDanbooruProvider = require('./create-danbooru-provider')

const avaliableProviders = {
  'danbooru': {
    factory: createDanbooruProvider,
    arguments: {
      name: { type: 'string' },
      tags: { type: 'array', subtype: { type: 'string' }},
      interval: { type: 'number', optional: true, restrictions: { min: 60000 }},
    },
  },
}

module.exports = { avaliableProviders }
