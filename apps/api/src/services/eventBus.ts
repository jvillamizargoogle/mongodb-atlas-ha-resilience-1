import { EventEmitter } from 'events';
import type { SSEEvent } from '@atlas-demo/shared';

class EventBus extends EventEmitter {
  broadcast(event: SSEEvent): void {
    this.emit('event', event);
  }
}

export const eventBus = new EventBus();
// Allow up to 200 SSE client listeners
eventBus.setMaxListeners(200);
