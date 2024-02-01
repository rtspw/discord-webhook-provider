import { type ProvideData } from '../providers/provider'

export abstract class Middleware {
  type: string = 'base'
  args: Record<string, any>
  acceptedTypes: string[] | 'all' = 'all'

  constructor(args: Record<string, any>) {
    this.args = args
  }

  abstract process(data: ProvideData): ProvideData | null

  run(data: ProvideData): ProvideData | null {
    if (this.acceptedTypes === 'all' || this.acceptedTypes.includes(data.provider.type)) {
      return this.process(data)
    }
    return null
  }
}

export class IdentityMiddleware extends Middleware {
  type = 'identity'
  process(data: ProvideData): ProvideData | null {
    return data
  }
}
