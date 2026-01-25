'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatPrice, formatPercentChange } from '@/lib/priceAnalysis';
import type { PriceChange } from '@/types';

interface PriceDisplayProps {
  price: number | null;
  priceChange: PriceChange | null;
}

export function PriceDisplay({ price, priceChange }: PriceDisplayProps) {
  const direction = priceChange?.direction ?? 'neutral';

  const getDirectionColor = () => {
    switch (direction) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-zinc-400';
    }
  };

  const getGlowStyle = () => {
    switch (direction) {
      case 'up':
        return '0 0 60px rgba(74, 222, 128, 0.4), 0 0 120px rgba(74, 222, 128, 0.2)';
      case 'down':
        return '0 0 60px rgba(248, 113, 113, 0.4), 0 0 120px rgba(248, 113, 113, 0.2)';
      default:
        return 'none';
    }
  };

  const renderDirectionIcon = () => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-8 h-8 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-8 h-8 text-red-400" />;
      default:
        return <Minus className="w-8 h-8 text-zinc-500" />;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <span className="text-zinc-500 text-lg font-medium">BTC/USDT</span>
        <motion.div
          key={direction}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {renderDirectionIcon()}
        </motion.div>
      </div>

      {/* Fixed height container to prevent layout shift */}
      <div className="h-[72px] md:h-[96px] flex items-center justify-center">
        <motion.span
          className={`font-mono text-6xl md:text-8xl font-bold tracking-tight ${getDirectionColor()}`}
          style={{
            textShadow: getGlowStyle(),
          }}
          animate={
            direction !== 'neutral'
              ? {
                  scale: [1, 1.02, 1],
                  transition: { duration: 0.2 },
                }
              : {}
          }
        >
          {price !== null ? formatPrice(price) : '---'}
        </motion.span>
      </div>

      {/* Fixed height for percent change to prevent layout shift */}
      <div className="h-7 flex items-center justify-center">
        {priceChange && priceChange.direction !== 'neutral' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1 }}
            className={`text-lg font-mono ${getDirectionColor()}`}
          >
            {formatPercentChange(priceChange.percentChange)}
          </motion.div>
        ) : (
          <div className="text-lg font-mono text-zinc-600">0.00%</div>
        )}
      </div>
    </div>
  );
}
