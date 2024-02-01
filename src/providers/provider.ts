import { type RESTPostAPIWebhookWithTokenJSONBody as Webhook } from 'discord.js/typings'
export type State = 'idle' | 'running' | 'error'
export interface ProvideData {
  provider: { name: string; type: string };
  webhook: Webhook;
  metadata: Record<string, any>;
}
export type ProvideHandler = (data: ProvideData) => void

export class Provider {
  state: State = 'idle'
  name: string = 'Unnamed'
  type: string = 'base'
  args: any = {}
  providedTypes: string[] = []
  onProvide: ProvideHandler = () => {}
  init() {}
  start() {
    this.state = 'running'
  }
  stop() {
    this.state = 'idle'
  }
}
