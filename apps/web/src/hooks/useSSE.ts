import { useEffect, useRef, useState, useCallback } from 'react';
import type { SSEEvent, TerminalEvent, MetricsSnapshot } from '@atlas-demo/shared';

interface SSEState {
  connected: boolean;
  terminalEvents: TerminalEvent[];
  metrics: MetricsSnapshot | null;
}

const MAX_TERMINAL_EVENTS = 500;

export function useSSE() {
  const [state, setState] = useState<SSEState>({
    connected: false,
    terminalEvents: [],
    metrics: null,
  });

  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) return;

    const es = new EventSource('/api/events/stream');
    esRef.current = es;

    es.onopen = () => setState((s) => ({ ...s, connected: true }));

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const event = JSON.parse(e.data) as SSEEvent;

        setState((s) => {
          if (event.type === 'metrics') {
            return { ...s, metrics: event.payload as MetricsSnapshot };
          }
          if (event.type === 'terminal' || event.type === 'change_stream') {
            const te = event.payload as TerminalEvent;
            return {
              ...s,
              terminalEvents: [...s.terminalEvents, te].slice(-MAX_TERMINAL_EVENTS),
            };
          }
          if (event.type === 'ping') {
            return { ...s, connected: true };
          }
          return s;
        });
      } catch {
        // ignore malformed frames
      }
    };

    es.onerror = () => {
      setState((s) => ({ ...s, connected: false }));
      es.close();
      esRef.current = null;
      reconnectRef.current = setTimeout(connect, 3_000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  const clearTerminal = useCallback(() => {
    setState((s) => ({ ...s, terminalEvents: [] }));
  }, []);

  return { ...state, clearTerminal };
}
