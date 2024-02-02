import { Middleware } from "../src/middlewares/middleware"
import { ProvideData } from "../src/providers/provider"

export function createMockPacket(type: string = 'fake'): ProvideData {
  return {
    provider: { name: 'fake', type },
    webhook: {},
    metadata: {},
  }
}

export function createMockMiddleware(
  fn: (data: ProvideData) => ProvideData | null,
  acceptedTypes: string[] | 'all' = 'all',
) {
  class MockMiddleware extends Middleware {
    type = 'mock'
    acceptedTypes = acceptedTypes
    process = fn
  }
  return new MockMiddleware({})
}
