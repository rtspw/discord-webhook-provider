# Webhook Provider

A server which feeds data into discord using webhooks.
This can be useful for running your own feeds in a Discord channel.
The initial goal was to get a Danbooru image feed running for certain servers.

### Future Goals

- Add small web frontend so you can use this without needing to know how the code works
- Add generic provider for RSS feeds

## Components

The components are analagous to a simple network, where a set of providers is mapped to a set of discord webhook endpoints with optional intermediate middleware nodes.

### Providers

Providers generate content and pass it to its `onProvide` callback in the form of a "packet".
```
{
  init: async () => void        // For loading initial values
  start: () => void             // Start the provider process (i.e. server ping loop)
  stop: () => void              // Stop the provider process
  get onProvide()
  set onProvide(callback)
  get state(): 'idle' | 'running'
}
```

### Endpoint

An endpoint is simply a discord URL where the packet should be sent. Each endpoint requires an `id` and `token` and is assigned a `name`, which can be defined in a `.json` file as an array of `{ name, id, token }` strings.

When you create a webhook in discord, you will be given a URL with a path `<id>/<token>`.

### Mapping

A mapping represents a connection between a provider and an endpoint. When the provider provides a packet, is it then sent to each endpoint that is subscribed to the provider. Optionally, each connection can add middleware in between, and add a personality to the webhook.

### Packet

The thing the providers provide, which includes information about the provider that made it and the discord webhook.
Metadata is a field that can have any shape. This is mainly used when middlewares need extra information.

```
{
  provider: { name: string, type: string }
  webhook: DiscordWebhook
  metadata: any
}
```

### Middleware

Middleware can block/filter packets and/or do extra processing on it. Each mapping has its own chain of middleware.

Returning null results in the packet being blocked, otherwise the returned packet can either be a mutated input or a copy.

```
(packet) => packet | null
```

Middleware can also be composed (which runs from *left* to *right*):
```
compose(m1, m2, m3, ...) is the same as (packet) => m3(m2(m1(packet)))
```

### Personality

Each mapping can have a personality added to its packets. This changes what the sender's name and avatar looks like within Discord.

```
{
  displayName: string,
  avatarUrl: string,
}
```

## Example

```javascript
// Read endpoints from 'endpoints.json'
const webhookEndpoints = new WebhookEndpoints()
webhookEndpoints.add('my_discord_server', 'id', 'token')
// Adds a provider which monitors a certain tag on danbooru. Persistence is a db instance 
// for recalling the previously seen image id between program runs
const providers = new Providers({
  'a_feed': createDanbooruProvider({ name: 'a_feed', tags: ['a_tag'], persistence }),
})
providers.initAll();
// Create a Discord psuedo-user that our webhook feed will be sent by
const personalities = new Personalities()
personalities.add('bot', 'A Bot', 'foo.com/avatar.png')
// Creating a mapping between the above items with a middleware for blocking posts with tag "foo"
const mapping = new Mapping(providers, webhookEndpoints, personalities)
mapping.addMapping({
  from: 'a_feed',
  to: 'my_discord_server',
  middlewares: [createBlockedTagsFilter('no_foo_filter', ['foo']],
  personality: 'bot',
})
// Start providers (will ping Danbooru once a minute by default)
providers.startAll()
```