/**
 * Tiny in-memory pub/sub for SSE.
 * Single Node process only — fine for dev and a single-server deploy.
 * For multi-instance prod you'd swap this for Redis pub/sub or similar.
 */

export type EurekaEvent =
  | { type: "alert.created"; alertId: string; supplierId: string; severity: string }
  | { type: "alert.updated"; alertId: string; status: string; decision?: string | null }
  | { type: "shipment.created"; shipmentId: string }
  | { type: "shipment.updated"; shipmentId: string; status: string }
  | { type: "call.started"; callId: string; alertId: string }
  | { type: "call.outcome"; callId: string; outcome: string; alertId: string }
  | { type: "tick"; ts: number };

type Listener = (event: EurekaEvent) => void;

const g = globalThis as unknown as { __eurekaListeners?: Set<Listener> };
if (!g.__eurekaListeners) g.__eurekaListeners = new Set();
const listeners = g.__eurekaListeners;

export const bus = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  emit(event: EurekaEvent): void {
    for (const l of listeners) {
      try {
        l(event);
      } catch (err) {
        console.warn("listener error", err);
      }
    }
  },
  count(): number {
    return listeners.size;
  },
};
