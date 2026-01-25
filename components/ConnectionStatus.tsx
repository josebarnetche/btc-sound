'use client';

import { motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import type { ConnectionState } from '@/types';

interface ConnectionStatusProps {
  state: ConnectionState;
}

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (state.status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          label: 'Connected',
          pulse: false,
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          label: 'Connecting...',
          pulse: true,
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-zinc-500',
          bgColor: 'bg-zinc-500/10',
          label: state.reconnectAttempts > 0
            ? `Reconnecting (${state.reconnectAttempts})`
            : 'Disconnected',
          pulse: state.reconnectAttempts > 0,
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          label: 'Connection Error',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatLastUpdate = () => {
    if (!state.lastUpdate) return '';

    const seconds = Math.floor((Date.now() - state.lastUpdate) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor}`}>
      <motion.div
        animate={config.pulse ? { rotate: 360 } : {}}
        transition={config.pulse ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
      >
        <Icon className={`w-4 h-4 ${config.color}`} />
      </motion.div>
      <span className={`text-sm ${config.color}`}>{config.label}</span>
      {state.status === 'connected' && state.lastUpdate && (
        <span className="text-xs text-zinc-600">
          {formatLastUpdate()}
        </span>
      )}
    </div>
  );
}
