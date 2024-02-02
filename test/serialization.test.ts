import { compose, composeWithRegistry } from '../src/middlewares/compose'
import { Middleware } from '../src/middlewares/middleware'
import { MiddlewareMetadata, MiddlewareRegistry } from '../src/middlewares/registry'
import { ProvideData } from '../src/providers/provider'
import Serializer from '../src/serializer'

class MockMiddleware extends Middleware {
  type = 'mock'
  acceptedTypes: string[] | 'all' = 'all'
  process(data: ProvideData): ProvideData | null {
    return data
  }
}

class MockMiddlewareWithArgs extends Middleware {
  type = 'mock-with-args'
  acceptedTypes: string[] | 'all' = 'all'
  constructor({ name }: { name: string }) {
    super({ name })
  }
  process(data: ProvideData): ProvideData | null {
    return data
  }
}

const avaliableMockMiddleware: Record<string, MiddlewareMetadata> = {
  'mock': {
    name: 'Mock Middleware',
    description: 'A mock middleware',
    acceptedTypes: 'all',
    arguments: {},
    factory: () => new MockMiddleware({}),
  },
  'mock-with-args': {
    name: 'Mock Middleware With Arguments',
    description: 'A mock middleware that also has non-empty argument requirements',
    acceptedTypes: 'all',
    arguments: {
      name: { type: 'string' },
    },
    factory: (args: { name: string }) => new MockMiddlewareWithArgs(args),
  },
}

describe('Serialization of middleware', () => {
  test('Serializes and deserializes generic middleware without args', () => {
    const serializer = new Serializer({ avaliableMiddleware: avaliableMockMiddleware, avaliableProviders: {} })
    const registry = new MiddlewareRegistry()
    const mockMiddleware = new MockMiddleware({})
    const serialized = serializer.serializeMiddleware(mockMiddleware)
    expect(serialized).toEqual({ type: 'mock', args: {} })
    const deserialized = serializer.deserializeMiddleware(serialized, registry)
    expect(deserialized).toEqual(mockMiddleware)
    expect(deserialized).not.toBe(mockMiddleware)
  })

  test('Serializes and deserializes generic middleware with args', () => {
    const serializer = new Serializer({ avaliableMiddleware: avaliableMockMiddleware, avaliableProviders: {} })
    const registry = new MiddlewareRegistry()
    const mockMiddleware = new MockMiddlewareWithArgs({ name: 'foo' })
    const serialized = serializer.serializeMiddleware(mockMiddleware)
    expect(serialized).toEqual({ type: 'mock-with-args', args: { name: 'foo' } })
    const deserialized = serializer.deserializeMiddleware(serialized, registry)
    expect(deserialized).toEqual(mockMiddleware)
    expect(deserialized).not.toBe(mockMiddleware)
  })

  test('Serializes composed middleware', () => {
    const serializer = new Serializer({ avaliableMiddleware: avaliableMockMiddleware, avaliableProviders: {} })
    const registry = new MiddlewareRegistry()
    const m1 = new MockMiddlewareWithArgs({ name: 'foo' })
    const m2 = new MockMiddlewareWithArgs({ name: 'bar' })
    const m3 = new MockMiddleware({})
    const composed = compose(m1, m2, m3)
    const serialized = serializer.serializeMiddleware(composed)
    expect(serialized).toEqual({
      type: 'composed',
      children: [
        { type: 'mock-with-args', args: { name: 'foo' } },
        { type: 'mock-with-args', args: { name: 'bar' } },
        { type: 'mock', args: {} },
      ],
    })
    const deserialized = serializer.deserializeMiddleware(serialized, registry)
    expect(deserialized).toEqual(composed)
    expect(deserialized).not.toBe(composed)
  })

  test('Serializes composed middleware with registry items', () => {
    const serializer = new Serializer({ avaliableMiddleware: avaliableMockMiddleware, avaliableProviders: {} })
    const registry = new MiddlewareRegistry()
    const m1 = new MockMiddlewareWithArgs({ name: 'foo' })
    const m2 = new MockMiddlewareWithArgs({ name: 'bar' })
    const m3 = new MockMiddleware({})
    registry.add('m1', m1)
    registry.add('m3', m3)
    const composed = composeWithRegistry(registry, 'm1', m2, 'm3')
    const serialized = serializer.serializeMiddleware(composed)
    expect(serialized).toEqual({
      type: 'composed-with-registered-items',
      children: [
        { type: 'registered', name: 'm1' },
        { type: 'mock-with-args', args: { name: 'bar' } },
        { type: 'registered', name: 'm3' },
      ],
    })
    const deserialized = serializer.deserializeMiddleware(serialized, registry)
    expect(deserialized).toEqual(composed)
    expect(deserialized).not.toBe(composed)
  })

  test('Serializes complex middleware compositions', () => {
    const serializer = new Serializer({ avaliableMiddleware: avaliableMockMiddleware, avaliableProviders: {} })
    const registry = new MiddlewareRegistry()
    const m1 = new MockMiddlewareWithArgs({ name: 'foo' })
    const m2 = new MockMiddlewareWithArgs({ name: 'bar' })
    const m3 = new MockMiddleware({})
    const m4 = new MockMiddleware({})
    const m5 = new MockMiddlewareWithArgs({ name: 'baz' })
    registry.add('m1', m1)
    registry.add('m3', m3)
    registry.add('m5', m5)
    const c1 = composeWithRegistry(registry, 'm1', m2)
    const c2 = composeWithRegistry(registry, 'm3')
    const c3 = composeWithRegistry(registry, m4, 'm5')
    const c4 = composeWithRegistry(registry, c1, c2, c3)
    const serialized = serializer.serializeMiddleware(c4)
    expect(serialized).toEqual({
      type: 'composed-with-registered-items',
      children: [
        {
          type: 'composed-with-registered-items',
          children: [
            { type: 'registered', name: 'm1' },
            { type: 'mock-with-args', args: { name: 'bar' } },
          ],
        },
        {
          type: 'composed-with-registered-items',
          children: [{ type: 'registered', name: 'm3' }],
        },
        {
          type: 'composed-with-registered-items',
          children: [
            { type: 'mock', args: {} },
            { type: 'registered', name: 'm5' },
          ],
        },
      ],
    })
    const deserialized = serializer.deserializeMiddleware(serialized, registry)
    expect(deserialized).toEqual(c4)
    expect(deserialized).not.toBe(c4)
  })
})