function createMockMiddleware() {
  return jest.fn(x => x)
}

function createMockPacket() {
  return {
    provider: {	name: 'providerName', type: 'providerType' },
    webhook: {},
    metadata: {},
  }
}

function createMockProvider() {
  let op = null
  let s = 'idle'
  return {
    init: () => {},
    start: () => {
      s = 'running'
      if (!op) return;
      op(createMockPacket())
    },
    stop: () => { s = 'idle' },
    get onProvide() { return op },
    set onProvide(callback) { op = callback },
    get state() { return s },
  }
}

module.exports = { createMockProvider, createMockMiddleware, createMockPacket }
