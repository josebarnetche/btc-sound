'use client';

import { useState, useCallback, useRef } from 'react';
import type { PricePoint } from '@/types';

const MAX_POINTS = 60;
const MIN_UPDATE_INTERVAL = 500; // ms

interface UsePriceHistoryReturn {
  history: PricePoint[];
  addPrice: (price: number) => void;
  clearHistory: () => void;
}

export function usePriceHistory(): UsePriceHistoryReturn {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const lastUpdateRef = useRef(0);

  const addPrice = useCallback((price: number) => {
    const now = Date.now();

    // Throttle updates
    if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) {
      return;
    }

    lastUpdateRef.current = now;

    setHistory(prev => {
      const newPoint: PricePoint = { time: now, price };
      const updated = [...prev, newPoint];

      // Keep only the last MAX_POINTS
      if (updated.length > MAX_POINTS) {
        return updated.slice(-MAX_POINTS);
      }

      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    lastUpdateRef.current = 0;
  }, []);

  return {
    history,
    addPrice,
    clearHistory,
  };
}
