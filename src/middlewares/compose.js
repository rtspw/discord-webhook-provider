const id = x => x

function compose(...middlewares) {
  if (middlewares.length === 0) return id
  if (middlewares.length === 1) return middlewares[0]
  return (data) => {
    let _data = data
    for (const middleware of middlewares) {
      _data = middleware(_data)
      if (_data === null) return null
    }
    return _data
  }
}

module.exports = { compose }
