'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Bell, Power, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface TradeInfo {
  inPosition: boolean;
  position: {
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    entryRsi: number;
    entryTime: number;
  } | null;
  currentRsi: number;
  unrealizedPnlPercent: number;
  totalTrades: number;
  wins: number;
  losses: number;
}

interface AudioControlsProps {
  enabled: boolean;
  volume: number;
  muted: boolean;
  isReady: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  getTradeInfo?: () => TradeInfo;
}

export function AudioControls({
  enabled,
  volume,
  muted,
  isReady,
  onEnable,
  onDisable,
  onVolumeChange,
  onMuteToggle,
  getTradeInfo,
}: AudioControlsProps) {
  const [tradeInfo, setTradeInfo] = useState<TradeInfo | null>(null);

  // Poll trade info when enabled
  useEffect(() => {
    if (!enabled || !getTradeInfo) return;

    const interval = setInterval(() => {
      const info = getTradeInfo();
      setTradeInfo(info);
    }, 100);

    return () => clearInterval(interval);
  }, [enabled, getTradeInfo]);

  if (!enabled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <Button
          onClick={onEnable}
          size="lg"
          className="gap-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-lg shadow-amber-900/30"
        >
          <Bell className="w-5 h-5" />
          Enable Sound
        </Button>
        <p className="text-sm text-zinc-500 text-center max-w-xs">
          Follows RSI reversion strategy. Sound plays only when in a trade. Pitch = PnL.
        </p>
      </motion.div>
    );
  }

  // Get RSI color
  const getRsiColor = () => {
    if (!tradeInfo) return 'text-zinc-500';
    const rsi = tradeInfo.currentRsi;
    if (rsi <= 20) return 'text-green-400';
    if (rsi <= 30) return 'text-green-500';
    if (rsi >= 80) return 'text-red-400';
    if (rsi >= 70) return 'text-red-500';
    return 'text-zinc-400';
  };

  // Get PnL color
  const getPnlColor = () => {
    if (!tradeInfo || !tradeInfo.inPosition) return 'text-zinc-500';
    const pnl = tradeInfo.unrealizedPnlPercent;
    if (pnl > 0.5) return 'text-green-400';
    if (pnl > 0) return 'text-green-500';
    if (pnl < -0.5) return 'text-red-400';
    if (pnl < 0) return 'text-red-500';
    return 'text-zinc-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-4 w-full"
    >
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{
              scale: tradeInfo?.inPosition ? [1, 1.2, 1] : 1,
              opacity: tradeInfo?.inPosition ? 1 : 0.5,
            }}
            transition={{
              repeat: tradeInfo?.inPosition ? Infinity : 0,
              repeatDelay: 0.5,
              duration: 0.3,
            }}
          >
            <Bell className={`w-5 h-5 ${tradeInfo?.inPosition ? 'text-amber-400' : 'text-zinc-600'}`} />
          </motion.div>
          <span className="text-sm text-zinc-400">
            {tradeInfo?.inPosition ? 'In Trade' : 'Waiting for Signal'}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDisable}
          className="text-zinc-500 hover:text-zinc-300"
        >
          <Power className="w-4 h-4" />
        </Button>
      </div>

      {/* RSI & Position Info */}
      <div className="grid grid-cols-2 gap-3">
        {/* RSI */}
        <div className="px-3 py-2 bg-zinc-800/50 rounded-lg">
          <span className="text-xs text-zinc-500 block">RSI (14)</span>
          <span className={`text-lg font-mono font-bold ${getRsiColor()}`}>
            {tradeInfo?.currentRsi.toFixed(1) ?? '--'}
          </span>
        </div>

        {/* Position or Stats */}
        {tradeInfo?.inPosition && tradeInfo.position ? (
          <div className="px-3 py-2 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-1">
              {tradeInfo.position.side === 'LONG' ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <span className="text-xs text-zinc-500">{tradeInfo.position.side}</span>
            </div>
            <span className={`text-lg font-mono font-bold ${getPnlColor()}`}>
              {tradeInfo.unrealizedPnlPercent >= 0 ? '+' : ''}
              {tradeInfo.unrealizedPnlPercent.toFixed(3)}%
            </span>
          </div>
        ) : (
          <div className="px-3 py-2 bg-zinc-800/50 rounded-lg">
            <span className="text-xs text-zinc-500 block">W/L</span>
            <span className="text-lg font-mono font-bold text-zinc-400">
              {tradeInfo?.wins ?? 0}/{tradeInfo?.losses ?? 0}
            </span>
          </div>
        )}
      </div>

      {/* Entry info when in position */}
      {tradeInfo?.inPosition && tradeInfo.position && (
        <div className="px-3 py-2 bg-zinc-800/30 rounded-lg text-xs text-zinc-500">
          <span>Entry: ${tradeInfo.position.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} @ RSI {tradeInfo.position.entryRsi.toFixed(1)}</span>
        </div>
      )}

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMuteToggle}
          className={muted ? 'text-red-400' : 'text-zinc-400'}
        >
          {muted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>

        <Slider
          value={[volume]}
          onValueChange={([value]) => onVolumeChange(value)}
          max={1}
          step={0.01}
          disabled={muted}
          className="flex-1"
        />

        <span className="text-sm text-zinc-500 w-10 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* Info text */}
      <div className="text-xs text-zinc-600 text-center">
        <p>No sound when flat | Entry = neutral | Profit = high | Loss = low</p>
      </div>
    </motion.div>
  );
}
