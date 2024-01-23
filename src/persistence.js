const { JsonDB, Config } = require('node-json-db')
const { compose } = require('./middlewares/compose')
const { avaliableMiddleware } = require('./middlewares/registry')
const { avaliableProviders } = require('./providers/avaliable-providers')
const logger = require('pino')()

const persistence = new JsonDB(new Config('persistence', false, true, '/'))

function getPersistence() {
  return persistence
}

async function savePersonalitiesFrom(personalities) {
  logger.info('Saving personalities.')
  await persistence.push('/personalities', {})
  for (const [name, { displayName, avatarUrl }] of Object.entries(personalities.persons)) {
    await persistence.push(`/personalities/${name}`, { displayName, avatarUrl })
  }
  await persistence.save()
}

async function loadPersonalitiesInto(personalities) {
  logger.info('Loading personalities.')
  const savedPersons = await persistence.getObjectDefault('/personalities', {})
  for (const [name, { displayName, avatarUrl }] of Object.entries(savedPersons)) {
    personalities.add(name, displayName, avatarUrl)
  }
}

async function saveEndpointsFrom(endpoints) {
  logger.info('Saving endpoints.')
  await persistence.push('/endpoints', {})
  for (const [name, { id, token }] of Object.entries(endpoints.endpoints)) {
    await persistence.push(`/endpoints/${name}`, { id, token })
  }
  await persistence.save()
}

async function loadEndpointsInto(endpoints) {
  logger.info('Loading endpoints.')
  const savedEndpoints = await persistence.getObjectDefault('/endpoints', {})
  for (const [name, { id, token }] of Object.entries(savedEndpoints)) {
    endpoints.add(name, id, token)
  }
}

function serializeMiddleware(middleware) {
  if (middleware.type === 'composed') {
    return {
      type: 'composed',
      children: middleware.children.map(m => serializeMiddleware(m))
    }
  } else if (middleware.type === 'registered') {
    return {
      type: 'registered',
      name: middleware.name,
    }
  } else {
    return {
      type: middleware.type,
      args: middleware.args,
    }
  }
}

function deserializeMiddleware(serializedMiddleware, registry) {
  if (serializedMiddleware.type === 'registered') {
    return registry.get(serializedMiddleware.name)
  } else if (serializedMiddleware.type === 'composed') {
    const deserializedChildren = serializedMiddleware.children.map(child => deserializeMiddleware(child, registry))
    return compose(...deserializedChildren)
  } else {
    const middlewareInfo = avaliableMiddleware[serializedMiddleware.type]
    if (middlewareInfo === undefined) throw new Error(`No such middleware type exists: ${serializedMiddleware.type}`)
    return middlewareInfo.factory(serializedMiddleware.args)
  }
}

async function saveMappingsFrom(mappings) {
  logger.info('Saving mappings.')
  await persistence.push(
    '/mappings',
    mappings.mapping.map(m => ({
      ...m,
      middlewares: m.middlewares.map(middleware => serializeMiddleware(middleware)),
    })
  ))
  await persistence.save()
}

async function loadMappingsInto(mappings, registry) {
  logger.info('Loading endpoints.')
  const savedMappings = await persistence.getObjectDefault('/mappings', [])
  for (const mapping of savedMappings) {
    mappings.addMapping({
      from: mapping.from,
      to: mapping.to,
      personality: mapping.personality,
      middlewares: mapping.middlewares.map(middleware => deserializeMiddleware(middleware, registry))
    })
  }
}

async function saveMiddlewareRegistryFrom(registry) {
  logger.info('Saving registered middlewares.')
  await persistence.push('/middlewares', {})
  for (const [name, middleware] of Object.entries(registry.middlewares)) {
    await persistence.push(`/middlewares/${name}`, serializeMiddleware(middleware))
  }
  await persistence.save()
}

async function loadMiddlewareRegistryInto(registry) {
  logger.info('Loading registered middlewares.')
  const savedMiddlewares = await persistence.getObjectDefault('/middlewares', {})
  for (const [name, serializedMiddleware] of Object.entries(savedMiddlewares)) {
    registry.add(name, deserializeMiddleware(serializedMiddleware, registry))
  }
}

function serializeProvider(provider) {
  return { type: provider.type, args: provider.args }
}

function deserializeProvider(serializedProvider) {
  const providerInfo = avaliableProviders[serializedProvider.type]
  if (providerInfo === undefined) throw new Error(`No such provider type exists: ${serializedProvider.type}`)
  return providerInfo.factory({ ...serializedProvider.args, persistence })
}

async function saveProvidersFrom(providers) {
  logger.info('Saving providers.')
  for (const [name, provider] of Object.entries(providers.providers)) {
    await persistence.push(`/providers/${name}`, serializeProvider(provider))
  }
  await persistence.save()
}

async function loadProvidersInto(providers) {
  logger.info('Loading providers.')
  const savedProviders = await persistence.getObjectDefault('/providers', {})
  for (const [name, serializedProvider] of Object.entries(savedProviders)) {
    providers.add(name, deserializeProvider(serializedProvider))
  }
}

module.exports = {
  getPersistence,
  savePersonalitiesFrom,
  loadPersonalitiesInto,
  saveEndpointsFrom,
  loadEndpointsInto,
  saveMappingsFrom,
  loadMappingsInto,
  saveMiddlewareRegistryFrom,
  loadMiddlewareRegistryInto,
  saveProvidersFrom,
  loadProvidersInto,
}