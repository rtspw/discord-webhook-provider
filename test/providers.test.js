const Providers = require('../src/providers')

function createMockProvider() {
  let op = null
  let s = 'idle'
  return {
    init: () => {},
    start: () => { s = 'running' },
    stop: () => { s = 'idle' },
    get onProvide() { return op },
    set onProvide(callback) { op = callback },
    get state() { return s },
  }
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('Providers', () => {
  test('Adding providers', () => {
    const p1 = createMockProvider()
    const providers = new Providers()
    expect(providers.providers).toEqual({})
    providers.add('1', p1)
    expect(providers.providers).toEqual({ '1': p1 })
  })
  test('Getting providers', () => {
    const p1 = createMockProvider()
    const providers = new Providers()
    providers.add('1', p1)
    expect(providers.get('1')).toEqual(p1)
    expect(() => providers.get('notexist')).toThrow()
  })
  test('Initialize providers', async () => {
    const p1 = createMockProvider()
    const spy = jest.spyOn(p1, 'init')
    const providers = new Providers()
    providers.add('1', p1)
    expect(async () => await providers.init('notexist')).rejects.toThrow()
    await providers.init('1')
    expect(spy).toHaveBeenCalled()
  })
  test('Initializing all providers', async () => {
    const ps = [...Array(5)].map(_ => createMockProvider())
    const spies = ps.map(p => jest.spyOn(p, 'init'))
    const providers = new Providers()
    ps.forEach((p, i) => { providers.add(i, p) })
    await providers.initAll()
    spies.forEach(spy => { expect(spy).toHaveBeenCalled() })
  })
  test('Starting providers', () => {
    const p1 = createMockProvider()
    const spy = jest.spyOn(p1, 'start')
    const providers = new Providers()
    providers.add('1', p1)
    expect(() => providers.start('notexist')).toThrow()
    providers.start('1')
    expect(spy).toHaveBeenCalled()
  })
  test('Starting all providers', () => {
    const ps = [...Array(5)].map(_ => createMockProvider())
    const spies = ps.map(p => jest.spyOn(p, 'start'))
    const providers = new Providers()
    ps.forEach((p, i) => { providers.add(i, p) })
    providers.startAll()
    spies.forEach(spy => { expect(spy).toHaveBeenCalled() })
  })
  test('Stopping providers', () => {
    const p1 = createMockProvider()
    const spy = jest.spyOn(p1, 'stop')
    const providers = new Providers()
    providers.add('1', p1)
    expect(() => providers.stop('notexist')).toThrow()
    providers.start('1')
    providers.stop('1')
    expect(spy).toHaveBeenCalled()
  })
  test('Stopping all providers', () => {
    const ps = [...Array(5)].map(_ => createMockProvider())
    const spies = ps.map(p => jest.spyOn(p, 'stop'))
    const providers = new Providers()
    ps.forEach((p, i) => { providers.add(i, p) })
    providers.stopAll()
    spies.forEach(spy => { expect(spy).toHaveBeenCalled() })
  })
  test('Set onProvide', () => {
    const p1 = createMockProvider()
    const spy = jest.spyOn(p1, 'onProvide', 'set')
    const providers = new Providers()
    providers.add('1', p1)
    expect(() => providers.setOnProvide('notexist', () => {})).toThrow()
    providers.setOnProvide('1', () => {})
    expect(spy).toHaveBeenCalled()
    expect(p1.onProvide).not.toBeNull()
  })
  test('Unset onProvide', () => {
    const p1 = createMockProvider()
    const spy = jest.spyOn(p1, 'onProvide', 'set')
    const providers = new Providers()
    providers.add('1', p1)
    expect(() => providers.unsetOnProvide('notexist', () => {})).toThrow()
    providers.unsetOnProvide('1', () => {})
    expect(spy).toHaveBeenCalled()
    expect(p1.onProvide).toBeNull()
  })
})
