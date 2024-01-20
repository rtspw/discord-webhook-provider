const createBlockedTagsFilter = require('../../src/middlewares/create-blocked-tags-filter-middleware')
const { createMockPacket } = require('../create-mocks')

function createMockDanbooruPacket(tags) {
  const packet = createMockPacket()
  packet.provider = {
    name: 'foo',
    type: 'danbooru',
  }
  packet.metadata.info = { id: 0, tags }
  return packet
}

describe('Blocked Tags Filter Middleware', () => {
  test('Block packets with blacklisted tag', () => {
    const p1 = createMockDanbooruPacket(['human', 'rude'])
    const f1 = createBlockedTagsFilter('temp1', ['rude'])
    expect(f1(p1)).toBeNull()
    const f2 = createBlockedTagsFilter('temp2', ['loud', 'mean', 'rude'])
    expect(f2(p1)).toBeNull()
    const p2 = createMockDanbooruPacket(['human'])
    const f3 = createBlockedTagsFilter('temp3', ['dog'])
    expect(f3(p2)).not.toBeNull()
  })
  test('Allow packets that do not have any blacklisted tags', () => {
    const packet = createMockDanbooruPacket(['human', 'nice'])
    const f1 = createBlockedTagsFilter('temp1', ['rude'])
    const f2 = createBlockedTagsFilter('temp2', [])
    expect(f1(packet)).toEqual(packet)
    expect(f2(packet)).toEqual(packet)
  })
})