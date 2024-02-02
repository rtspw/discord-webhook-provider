import { type ComposedMiddleware, compose, composeWithRegistry, ComposedWithRegisteredItemsMiddleware } from "../../src/middlewares/compose"
import { Middleware } from "../../src/middlewares/middleware"
import { type ProvideData } from "../../src/providers/provider"
import { MiddlewareRegistry } from "../../src/middlewares/registry"

import { createMockMiddleware, createMockPacket } from "../mocks"

describe('Composing middleware', () => {
  test('Composing nothing returns identity', () => {
    const packet = createMockPacket()
    const comp = compose()
    expect(comp.run(packet)).toEqual(packet)
    expect(comp.type).toEqual('identity')
  })

  test('Composing one middleware returns itself', () => {
    const packet = createMockPacket()
    const m1 = createMockMiddleware(x => ({ ...x, metadata: { foo: 'bar' } }))
    const comp = compose(m1)
    const result = comp.run(packet)
    expect(m1.type).toEqual('mock')
    expect(result).toEqual(m1.run(packet))
  })

  test('Composing multiple middleware runs middleware from left to right', () => {
    const packet = createMockPacket()
    const m1 = createMockMiddleware(x => ({ ...x, metadata: { foo: 'bar' }}))
    const m2 = createMockMiddleware(x => ({ ...x, metadata: { foo: x.metadata.foo.toUpperCase() }}))
    const m3 = createMockMiddleware(x => ({ ...x, metadata: { foo: x.metadata.foo + '!' }}))
    const comp = compose(m1, m2, m3) as ComposedMiddleware
    const result = comp.run(packet)
    expect(result).toEqual(m3.run(m2.run(m1.run(packet) as ProvideData) as ProvideData))
    expect(comp.type).toEqual('composed')
    expect(comp).toHaveProperty('children')
    expect(comp.children).toEqual([m1, m2, m3])
  })

  test('Composed middleware can be recursively composed', () => {
    const packet = createMockPacket()
    const m1 = createMockMiddleware(x => ({ ...x, metadata: { foo: 'bar' }}))
    const m2 = createMockMiddleware(x => ({ ...x, metadata: { foo: x.metadata.foo.toUpperCase() }}))
    const m3 = createMockMiddleware(x => ({ ...x, metadata: { foo: x.metadata.foo + '!' }}))
    const c1 = compose(m1, m2) as ComposedMiddleware
    const c2 = compose(c1, m3) as ComposedMiddleware
    const result = c2.run(packet)
    expect(result).toEqual(m3.run(m2.run(m1.run(packet) as ProvideData) as ProvideData))
    expect(c2.type).toEqual('composed')
    expect(c2).toHaveProperty('children')
    expect(c2.children).toEqual([c1, m3])
  })

  test('Composed middleware have correctly set acceptedTypes', () => {
    const packetA = createMockPacket('typeA')
    const packetB = createMockPacket('typeB')
    const m1 = createMockMiddleware(x => x, ['typeA'])
    const m2 = createMockMiddleware(x => x, ['typeB'])
    const m3 = createMockMiddleware(x => x, ['typeB', 'typeC'])
    const m4 = createMockMiddleware(x => x, ['typeA', 'typeB', 'typeC', 'typeD'])
    const m5 = createMockMiddleware(x => x, 'all')
    const m6 = createMockMiddleware(x => x, 'all')
    const c1 = compose(m2, m3)
    const c2 = compose(c1, m1)
    const c3 = compose(m3, m4)
    const c4 = compose(m5, m6)
    expect(c1.acceptedTypes).toEqual(['typeB'])
    expect(c1.run(packetA)).toBeNull()
    expect(c1.run(packetB)).not.toBeNull()
    expect(c2.acceptedTypes).toEqual([])
    expect(c2.run(packetA)).toBeNull()
    expect(c2.run(packetB)).toBeNull()
    expect(c3.acceptedTypes).toEqual(['typeB', 'typeC'])
    expect(c3.run(packetA)).toBeNull()
    expect(c3.run(packetB)).not.toBeNull()
    expect(c4.acceptedTypes).toEqual('all')
    expect(c4.run(packetA)).not.toBeNull()
    expect(c4.run(packetB)).not.toBeNull()
  })

  test('Compose one with registry returns composed middleware', () => {
    const packet = createMockPacket()
    const registry = new MiddlewareRegistry()
    const m1 = createMockMiddleware(x => ({ ...x, metadata: { foo: 'bar' }}))
    registry.add('m1', m1)
    const c1 = composeWithRegistry(registry, 'm1')
    expect(c1 instanceof ComposedWithRegisteredItemsMiddleware).toEqual(true)
    expect(c1.run(packet)).toEqual(m1.run(packet))
  })

  test('Compose multiple with registry', () => {
    const packet = createMockPacket()
    const registry = new MiddlewareRegistry()
    const m1 = createMockMiddleware(x => ({ ...x, metadata: { foo: 'bar' }}))
    const m2 = createMockMiddleware(x => ({ ...x, metadata: { foo: x.metadata.foo.toUpperCase() }}))
    const m3 = createMockMiddleware(x => ({ ...x, metadata: { foo: x.metadata.foo + '!' }}))
    registry.add('m1', m1)
    registry.add('m2', m2)
    registry.add('m3', m3)
    const c1 = composeWithRegistry(registry, 'm1', 'm2', 'm3')
    const c2 = composeWithRegistry(registry, 'm1', m2, 'm3')
    expect(c1.run(packet)).toEqual(m3.run(m2.run(m1.run(packet) as ProvideData) as ProvideData))
    expect(c2.run(packet)).toEqual(m3.run(m2.run(m1.run(packet) as ProvideData) as ProvideData))
  })

  test('Compose with registry allows dynamic swapping of middleware', () => {
    const packet = createMockPacket()
    const registry = new MiddlewareRegistry()
    const m1 = createMockMiddleware(x => ({ ...x, metadata: { foo: 'bar' }}))
    const m2 = createMockMiddleware(x => ({ ...x, metadata: { foo: x.metadata.foo.toUpperCase() }}))
    const m3 = createMockMiddleware(x => ({ ...x, metadata: { foo: x.metadata.foo + '!' }}))
    const m4 = createMockMiddleware(x => ({ ...x, metadata: { foo: x.metadata.foo + '!!!' }}))
    registry.add('m1', m1)
    registry.add('m2', m2)
    registry.add('m3', m3)
    const c1 = composeWithRegistry(registry, 'm1', 'm2', 'm3')
    registry.add('m3', m4)
    expect(c1.run(packet)).toEqual(m4.run(m2.run(m1.run(packet) as ProvideData) as ProvideData))
  })
})
