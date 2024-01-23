const createAllowedRatingsFilter = require('../../src/middlewares/create-allowed-ratings-filter-middleware')
const { createMockPacket } = require('../create-mocks')

function createMockDanbooruPacket(rating) {
  const packet = createMockPacket()
  packet.provider = {
    name: 'foo',
    type: 'danbooru',
  }
  packet.metadata.info = { id: 0, rating }
  return packet
}

describe('Allowed Ratings Filter Middleware', () => {
  test('Block packets that has a rating not on allowed list', () => {
    const packet = createMockDanbooruPacket('e')
    const f1 = createAllowedRatingsFilter({ name: 'temp1', ratings: ['s'] })
    expect(f1.run(packet)).toBeNull()
    const f2 = createAllowedRatingsFilter({ name: 'temp2', ratings: [] })
    expect(f2.run(packet)).toBeNull()
    const f3 = createAllowedRatingsFilter({ name: 'temp3', ratings: ['a', 'b', 'c', 'd', 'f'] })
    expect(f3.run(packet)).toBeNull()
  })
  test('Allow packets that has a rating on allowed list', () => {
    const packet = createMockDanbooruPacket('e')
    const f = createAllowedRatingsFilter({ name: 'temp', ratings: ['s', 'e'] })
    expect(f.run(packet)).toEqual(packet)
  })
})