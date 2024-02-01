import DanbooruProvider, { type Options } from "./danbooru-provider"
import { type Provider } from "./provider"
import { type ArgType } from "../util/arg-types";

export interface ProviderMetadata {
  factory: (args: any) => Provider;
  arguments: Record<string, ArgType>;
}

const avaliableProviders: Record<string, ProviderMetadata> = {
  'danbooru': {
    factory: (args: Options) => new DanbooruProvider(args),
    arguments: {
      name: { type: 'string' },
      tags: { type: 'array', subtype: { type: 'string' }},
      interval: { type: 'number', optional: true, restrictions: { min: 60000 }},
      approvedOnly: { type: 'boolean', optional: true },
    },
  },
}

export default avaliableProviders
