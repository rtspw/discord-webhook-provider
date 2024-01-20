const Personalities = require('../src/personalities')

describe('Personalities', () => {
  test('Adding personalities', () => {
    const personalities = new Personalities()
    personalities.push('tag', 'nameA', 'example.com/a.png')
    expect(personalities.persons).toEqual({
      tag: {
        displayName: 'nameA',
        avatarUrl: 'example.com/a.png',
      },
    })
    personalities.push('tag2', 'nameB', 'example.com/b.png')
    expect(personalities.persons).toEqual({
      tag: {
        displayName: 'nameA',
        avatarUrl: 'example.com/a.png',
      },
      tag2: {
        displayName: 'nameB',
        avatarUrl: 'example.com/b.png',
      },
    })
  })
  test('Updating personalities', () => {
    const personalities = new Personalities()
    personalities.push('tag', 'nameA', 'example.com/a.png')
    personalities.push('tag', 'nameB', 'example.com/b.png')
    expect(personalities.persons).toEqual({
      tag: {
        displayName: 'nameB',
        avatarUrl: 'example.com/b.png',
      },
    })
  })
  test('Removing personalities', () => {
    const personalities = new Personalities()
    personalities.push('tag', 'nameA', 'example.com/a.png')
    personalities.delete('tag')
    expect(personalities.persons).toEqual({})
  })
  test('Appending personality to webhook when personality exists', () => {
    const personalities = new Personalities()
    personalities.push('tag', 'nameA', 'example.com/a.png')
    const webhook = {}
    const newWebhook = personalities.appendToWebhook('tag', webhook)
    expect(newWebhook).toEqual({
      username: 'nameA',
      avatar_url: 'example.com/a.png',
    })
  })
  test('Appending personality to webhook when personality does not exist', () => {
    const personalities = new Personalities()
    const webhook = {}
    const newWebhook = personalities.appendToWebhook('tag', webhook)
    expect(newWebhook).toEqual(webhook)
  })
  test('Appending personality to webhook when personality is undefined', () => {
    const personalities = new Personalities()
    const webhook = {}
    const newWebhook = personalities.appendToWebhook(undefined, webhook)
    expect(newWebhook).toEqual(webhook)
  })
})
