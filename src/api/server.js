const fastify = require('fastify')({ logger: true })

fastify.get('/', function handler (request, reply) {
  reply.send({ hello: 'world' })
})

fastify.listen({ port: 9876 }, (err) => {
  if (err) {
    fastify.log.fatal(err)
    process.exit(1)
  }
})