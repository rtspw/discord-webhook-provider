const createRemoveDuplicatesMiddleware = require('../../src/middlewares/remove-dup-middleware')
const { createMockPacket } = require('../create-mocks')

function createMockDanbooruPacket(id) {
  const packet = createMockPacket()
  packet.provider = {
    name: 'foo',
    type: 'danbooru',
  }
  packet.metadata.info = { id }
  return packet
}

describe('Remove Duplicates Middleware', () => {
  test('Block packets with duplicate danbooru post', () => {
    const middleware = createRemoveDuplicatesMiddleware({ name: 'temp' })
    const p1 = createMockDanbooruPacket(0)
    const p2 = createMockDanbooruPacket(0)
    const p3 = createMockDanbooruPacket(1)
    const r1 = middleware.run(p1)
    const r2 = middleware.run(p2)
    const r3 = middleware.run(p3)
    expect(r1).toEqual(p1)
    expect(r2).toBeNull()
    expect(r3).toEqual(p3)
  })
})