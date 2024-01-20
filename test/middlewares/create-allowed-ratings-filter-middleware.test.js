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
    const f1 = createAllowedRatingsFilter('temp1', ['s'])
    expect(f1(packet)).toBeNull()
    const f2 = createAllowedRatingsFilter('temp2', [])
    expect(f2(packet)).toBeNull()
    const f3 = createAllowedRatingsFilter('temp3', ['a', 'b', 'c', 'd', 'f'])
    expect(f3(packet)).toBeNull()
  })
  test('Allow packets that has a rating on allowed list', () => {
    const packet = createMockDanbooruPacket('e')
    const f = createAllowedRatingsFilter('temp', ['s', 'e'])
    expect(f(packet)).toEqual(packet)
  })
})