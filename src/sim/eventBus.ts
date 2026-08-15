// ============================================================================
// Event bus — simple synchronous pub/sub for TriggerEvents.
// Effects call bus.emit() for the new triggers they cause (e.g. DealDamage
// emits OnDamageDealt), which the resolver re-enters synchronously. This is
// what makes passive chains (frost/fire shatter, etc.) fall out for free.
// ============================================================================

import type { TriggerEvent, TriggerType } from './types';

export type Listener = (event: TriggerEvent) => void;

export class EventBus {
  private anyListeners: Listener[] = [];
  private typeListeners: Map<TriggerType, Listener[]> = new Map();

  /** listen to every event, regardless of type */
  onAny(listener: Listener): void {
    this.anyListeners.push(listener);
  }

  on(type: TriggerType, listener: Listener): void {
    const arr = this.typeListeners.get(type) ?? [];
    arr.push(listener);
    this.typeListeners.set(type, arr);
  }

  emit(event: TriggerEvent): void {
    for (const l of this.anyListeners) l(event);
    const specific = this.typeListeners.get(event.type);
    if (specific) for (const l of specific) l(event);
  }
}
