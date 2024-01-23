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
    const f1 = createBlockedTagsFilter({ name: 'temp1', tags: ['rude'] })
    expect(f1.run(p1)).toBeNull()
    const f2 = createBlockedTagsFilter({ name: 'temp2', tags: ['loud', 'mean', 'rude'] })
    expect(f2.run(p1)).toBeNull()
    const p2 = createMockDanbooruPacket(['human'])
    const f3 = createBlockedTagsFilter({ name: 'temp3', tags: ['dog'] })
    expect(f3.run(p2)).not.toBeNull()
  })
  test('Allow packets that do not have any blacklisted tags', () => {
    const packet = createMockDanbooruPacket(['human', 'nice'])
    const f1 = createBlockedTagsFilter({ name: 'temp1', tags: ['rude'] })
    const f2 = createBlockedTagsFilter({ name: 'temp2', tags: [] })
    expect(f1.run(packet)).toEqual(packet)
    expect(f2.run(packet)).toEqual(packet)
  })
})