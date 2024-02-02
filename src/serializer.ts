import { ComposedMiddleware, ComposedWithRegisteredItemsMiddleware, compose, composeWithRegistry } from "./middlewares/compose";
import { Middleware } from "./middlewares/middleware";
import { MiddlewareMetadata, MiddlewareRegistry } from "./middlewares/registry";
import Personalities, { type Personality } from "./personalities";
import Providers from "./providers";
import { ProviderMetadata } from "./providers/avaliable-providers";
import { Provider } from "./providers/provider";

export type SerializedPersonalities = Record<string, Personality>

export interface SerializedProvider {
  type: string;
  args: any;
}

export type SerializedProviders = Record<string, SerializedProvider>

export interface SerializedGeneralMiddleware {
  type: string;
  args: any;
}

export interface SerializedComposedMiddleware {
  type: 'composed';
  children: SerializedGeneralMiddleware[];
}

export interface SerializedRegisteredMiddleware {
  type: 'registered';
  name: string;
}

export interface SerializedComposedWithRegistryMiddleware {
  type: 'composed-with-registered-items';
  children: (SerializedGeneralMiddleware | SerializedRegisteredMiddleware)[];
}

export type SerializedMiddleware =
  SerializedGeneralMiddleware |
  SerializedComposedMiddleware |
  SerializedComposedWithRegistryMiddleware

export interface SerializerArgs {
  avaliableMiddleware: Record<string, MiddlewareMetadata>;
  avaliableProviders: Record<string, ProviderMetadata>;
}

export default class Serializer {
  avaliableMiddleware: Record<string, MiddlewareMetadata>
  avaliableProviders: Record<string, ProviderMetadata>
  constructor({ avaliableMiddleware, avaliableProviders }: SerializerArgs) {
    this.avaliableMiddleware = avaliableMiddleware
    this.avaliableProviders = avaliableProviders
  }

  serializePersonalities(personalities: Personalities): SerializedPersonalities {
    const output: SerializedPersonalities = {}
    for (const [name, person] of Object.entries(personalities.persons)) {
      output[name] = person
    }
    return output
  }
  
  deserializePersonalitiesInto(personalities: Personalities, serialized: SerializedPersonalities): void {
    for (const [name, { displayName, avatarUrl }] of Object.entries(serialized)) {
      personalities.add(name, displayName, avatarUrl)
    }
  }

  serializeProvider(provider: Provider): SerializedProvider {
    return {
      type: provider.type,
      args: provider.args,
    }
  }
  
  deserializeProvider(serialized: SerializedProvider) {
    const providerInfo = this.avaliableProviders[serialized.type]
    if (providerInfo === undefined) throw new Error(`No such provider type exists: ${serialized.type}`)
    return providerInfo.factory(serialized.args)
  }
  
  serializeProviders(providers: Providers) {
    const output: SerializedProviders = {}
    for (const [name, provider] of Object.entries(providers.providers)) {
      output[name] = this.serializeProvider(provider)
    }
    return output
  }
  
  deserializeProvidersInto(providers: Providers, serialized: SerializedProviders) {
    for (const [name, serializedProvider] of Object.entries(serialized)) {
      providers.add(name, this.deserializeProvider(serializedProvider))
    }
  }

  serializeMiddleware(middleware: Middleware): SerializedMiddleware {
    if (middleware instanceof ComposedMiddleware) {
      return {
        type: 'composed',
        children: middleware.children.map(m => this.serializeMiddleware(m) as SerializedGeneralMiddleware)
      }
    } else if (middleware instanceof ComposedWithRegisteredItemsMiddleware) {
      return {
        type: 'composed-with-registered-items',
        children: middleware.children.map(m => {
          if (typeof m === 'string') {
            return {
              type: 'registered',
              name: m,
            }
          } else {
            return this.serializeMiddleware(m) as SerializedGeneralMiddleware
          }
        })
      }
    } else {
      return {
        type: middleware.type,
        args: middleware.args,
      }
    }
  }
  
  deserializeMiddleware(serializedMiddleware: SerializedMiddleware, registry: MiddlewareRegistry): Middleware {
    if (serializedMiddleware.type === 'composed' && 'children' in serializedMiddleware) {
      const deserializedChildren = serializedMiddleware.children.map(child => this.deserializeMiddleware(child, registry))
      return compose(...deserializedChildren)
    } else if (serializedMiddleware.type === 'composed-with-registered-items' && 'children' in serializedMiddleware) {
      const deserializedChildren = serializedMiddleware.children.map(child => {
        if (child.type === 'registered' && 'name' in child) {
          return child.name
        } else {
          return this.deserializeMiddleware(child as SerializedGeneralMiddleware, registry)
        }
      })
      return composeWithRegistry(registry, ...deserializedChildren)
    } else if ('args' in serializedMiddleware) {
      const middlewareInfo = this.avaliableMiddleware[serializedMiddleware.type]
      if (middlewareInfo === undefined) throw new Error(`No such middleware type exists: ${serializedMiddleware.type}`)
      return middlewareInfo.factory(serializedMiddleware.args)
    }
    throw new Error('Received invalid serialization of middleware')
  }
}
