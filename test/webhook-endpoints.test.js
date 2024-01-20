const Endpoints = require('../src/webhook-endpoints')

describe('Webhook Endpoints', () => {
  test('Adding Endpoints', () => {
    const endpoints = new Endpoints()
    endpoints.add('foo', 'id', 'token')
    endpoints.add('bar', 'id2', 'token2')
    expect(endpoints.endpoints).toEqual({
      foo: { id: 'id', token: 'token' },
      bar: { id: 'id2', token: 'token2' },
    })
  })
  test('Getting webhooks', () => {
    const endpoints = new Endpoints()
    endpoints.add('foo', 'id', 'token')
    expect(endpoints.get('foo')).toEqual({id: 'id', token: 'token' })
    expect(() => endpoints.get('notexist')).toThrow()
  })
  test('Sending webhook should fail if webhook name does not exist', async () => {
    const endpoints = new Endpoints()
    expect(async () => await endpoints.sendWebhook('notexist')).rejects.toThrow()
  })
})
