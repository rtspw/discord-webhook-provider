const Mapping = require('../src/mapping')
const { createMockMiddleware, createMockProvider, createMockPacket } = require('./create-mocks')

jest.mock('../src/personalities')
jest.mock('../src/webhook-endpoints')
jest.mock('../src/providers')

const Personalities = require('../src/personalities')
const WebhookEndpoints = require('../src/webhook-endpoints')
const Providers = require('../src/providers')


describe('Mapping class', () => {
  let ps = {}
  const personalities = new Personalities()
  const endpoints = new WebhookEndpoints()
  const providers = new Providers()
  providers.add.mockImplementation((name, provider) => {
    ps[name] = provider
  })
  providers.setOnProvide.mockImplementation((name, onProvide) => {
    ps[name].onProvide = onProvide
  })
  providers.unsetOnProvide.mockImplementation((name) => {
    ps[name].onProvide = null
  })

  afterEach(() => {
    jest.restoreAllMocks()
    ps = {}
  })

  test('Add one mapping', () => {
    const p = createMockProvider()
    providers.add('a', p)
    const mapping = new Mapping(providers, endpoints, personalities)
    mapping.addMapping({ from: 'a', to: 'out', middlewares: [] })
    expect(mapping.mapping).toEqual([{
      id: 0,
      from: 'a',
      to: 'out',
      middlewares: [],
      personality: undefined,
    }])
    expect(mapping.subscriptions).toHaveProperty('a')
    expect(mapping.subscriptions['a']).toHaveLength(1)
    expect(mapping.subscriptions['a'][0]).toMatchObject({
      mappingId: 0,
      to: 'out',
    })
    expect(providers.setOnProvide).toHaveBeenCalledTimes(1)
  })

  test('Add multiple mappings, including repeated ones', () => {
    const p1 = createMockProvider()
    const p2 = createMockProvider()
    providers.add('a', p1)
    providers.add('b', p2)
    const m = createMockMiddleware()
    const mapping = new Mapping(providers, endpoints, personalities)
    mapping.addMapping({ from: 'a', to: 'out1', middlewares: [] })
    mapping.addMapping({ from: 'b', to: 'out1', middlewares: [] })
    mapping.addMapping({ from: 'b', to: 'out1', middlewares: [m] })
    mapping.addMapping({ from: 'a', to: 'out2', middlewares: [] })
    expect(mapping.mapping).toEqual([{
      id: 0,
      from: 'a',
      to: 'out1',
      middlewares: [],
      personality: undefined,
    }, {
      id: 1,
      from: 'b',
      to: 'out1',
      middlewares: [],
      personality: undefined,
    }, {
      id: 2,
      from: 'b',
      to: 'out1',
      middlewares: [m],
      personality: undefined,
    }, {
      id: 3,
      from: 'a',
      to: 'out2',
      middlewares: [],
      personality: undefined,
    }])
    expect(mapping.subscriptions).toHaveProperty('a')
    expect(mapping.subscriptions['a']).toHaveLength(2)
    expect(mapping.subscriptions['a'][0]).toMatchObject({
      mappingId: 0,
      to: 'out1',
    })
    expect(mapping.subscriptions['a'][1]).toMatchObject({
      mappingId: 3,
      to: 'out2',
    })

    expect(mapping.subscriptions).toHaveProperty('b')
    expect(mapping.subscriptions['b']).toHaveLength(2)
    expect(mapping.subscriptions['b'][0]).toMatchObject({
      mappingId: 1,
      to: 'out1',
    })
    expect(mapping.subscriptions['b'][1]).toMatchObject({
      mappingId: 2,
      to: 'out1',
    })
  })

  test('When providers provide a packet, all subscribers receive it', () => {
    personalities.appendToWebhook.mockReturnValue({})

    const p1 = createMockProvider()
    const p2 = createMockProvider()
    providers.add('a', p1)
    providers.add('b', p2)
    const m1 = createMockMiddleware()
    const m2 = createMockMiddleware()
    const mapping = new Mapping(providers, endpoints, personalities)
    mapping.addMapping({ from: 'a', to: 'out1', middlewares: [], personality: 'person1' })
    mapping.addMapping({ from: 'b', to: 'out1', middlewares: [m1] })
    mapping.addMapping({ from: 'b', to: 'out1', middlewares: []})
    mapping.addMapping({ from: 'a', to: 'out2', middlewares: [m1, m2], personality: 'person2' })
    p1.start()
    expect(endpoints.sendWebhook).toHaveBeenNthCalledWith(1, 'out1', {})
    expect(endpoints.sendWebhook).toHaveBeenNthCalledWith(2, 'out2', {})
    expect(m1).toHaveBeenCalledWith(createMockPacket())
    expect(m2).toHaveBeenCalledWith(createMockPacket())
    expect(personalities.appendToWebhook).toHaveBeenNthCalledWith(1, 'person1', {})
    expect(personalities.appendToWebhook).toHaveBeenNthCalledWith(2, 'person2', {})
    endpoints.sendWebhook.mockClear()
    m1.mockClear()
    m2.mockClear()
    personalities.appendToWebhook.mockClear()
    p2.start()
    expect(endpoints.sendWebhook).toHaveBeenNthCalledWith(1, 'out1', {})
    expect(endpoints.sendWebhook).toHaveBeenNthCalledWith(2, 'out1', {})
    expect(m1).toHaveBeenCalledWith(createMockPacket())
    expect(m2).not.toHaveBeenCalled()
    expect(personalities.appendToWebhook).toHaveBeenNthCalledWith(1, undefined, {})
    expect(personalities.appendToWebhook).toHaveBeenNthCalledWith(2, undefined, {})
  })
})