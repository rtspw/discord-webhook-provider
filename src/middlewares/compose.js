const id = {
  type: 'identity',
  run: x => x,
}

function compose(...middlewares) {
  if (middlewares.length === 0) return id
  if (middlewares.length === 1) return middlewares[0]
  return {
    type: 'composed',
    children: middlewares,
    run: (data) => {
      let _data = data
      for (const middleware of middlewares) {
        _data = middleware.run(_data)
        if (_data === null) return null
      }
      return _data
    }
  }
}

function resolveMiddleware(registry, middlewareOrRegistryName) {
  if ((typeof middlewareOrRegistryName) === 'string') {
    return registry.get(middlewareOrRegistryName)
  } else {
    return middlewareOrRegistryName
  }
}

function composeWithRegistry(registry, ...middlewareOrRegistryNameItems) {
  if (middlewareOrRegistryNameItems.length === 0) {
    return id
  }
  if (middlewareOrRegistryNameItems.length === 1) {
    return resolveMiddleware(registry, middlewareOrRegistryNameItems[0])
  }
  return {
    type: 'composed',
    children: middlewareOrRegistryNameItems.map(item => {
      if ((typeof item) === 'string') {
        return { type: 'registered', name: item }
      } else {
        return item
      }
    }),
    run: (data) => {
      let _data = data
      for (const middleware of middlewareOrRegistryNameItems) {
        const resolvedMiddleware = resolveMiddleware(registry, middleware)
        _data = resolvedMiddleware.run(_data)
        if (_data === null) return null
      }
      return _data
    }
  }
}

module.exports = { compose, composeWithRegistry }
