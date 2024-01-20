const { createMockMiddleware, createMockPacket } = require('../create-mocks')
const { compose } = require('../../src/middlewares/compose')

describe('Composing middleware', () => {
  test('Composing nothing returns identity', () => {
    const packet = createMockPacket()
    const comp = compose()
    expect(comp(packet)).toEqual(packet)
  })

  test('Composing one middleware returns itself', () => {
    const packet = createMockPacket()
    const m1 = createMockMiddleware()
    m1.mockImplementation((packet) => ({ ...packet, ...{ webhook: { hello: 'world' }}}))
    const comp = compose(m1)
    const result = comp(packet)
    expect(m1).toHaveBeenCalled()
    expect(result).toEqual(m1(packet))
  })

  test('Composing multiple middleware runs middleware from left to right', () => {
    const packet = createMockPacket()
    const m1 = createMockMiddleware()
    const m2 = createMockMiddleware()
    const m3 = createMockMiddleware()
    m1.mockImplementation((packet) => ({ ...packet, ...{ webhook: { hello: 'world' }}}))
    m2.mockImplementation((packet) => ({ ...packet, ...{ webhook: { hello: packet.webhook.hello + 's' }}}))
    m3.mockImplementation((packet) => ({ ...packet, ...{ webhook: { hello: packet.webhook.hello.toUpperCase() }}}))
    const comp = compose(m1, m2, m3)
    const result = comp(packet)
    expect(m1).toHaveBeenCalled()
    expect(m2).toHaveBeenCalled()
    expect(m3).toHaveBeenCalled()
    expect(result).toEqual(m3(m2(m1(packet))))
  })
})