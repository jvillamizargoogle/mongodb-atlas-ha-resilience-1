import type { ConnectionStatus } from '@atlas-demo/shared';

interface Props {
  connected: boolean;
  connectionStatus?: ConnectionStatus;
}

const COLORS: Record<ConnectionStatus, string> = {
  connected: 'bg-mdb-green text-black',
  disconnected: 'bg-red-600 text-white',
  reconnecting: 'bg-yellow-500 text-black',
  error: 'bg-red-700 text-white',
};

const DOT_COLORS: Record<ConnectionStatus, string> = {
  connected: 'bg-black',
  disconnected: 'bg-white',
  reconnecting: 'bg-black animate-pulse-fast',
  error: 'bg-white',
};

export default function ConnectionBadge({ connected, connectionStatus }: Props) {
  const status: ConnectionStatus =
    connectionStatus ?? (connected ? 'connected' : 'disconnected');

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-display ${COLORS[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[status]}`} />
      {status.replace('_', ' ').toUpperCase()}
    </div>
  );
}
