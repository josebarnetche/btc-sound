'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { TradeData, ConnectionState } from '@/types';

const WS_URL = 'wss://stream.binance.com:9443/ws/btcusdc@trade';
const REST_URL = 'https://data-api.binance.vision/api/v3/ticker/price?symbol=BTCUSDC';
const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

interface UseBinanceWebSocketReturn {
  price: number | null;
  previousPrice: number | null;
  connectionState: ConnectionState;
}

export function useBinanceWebSocket(): UseBinanceWebSocketReturn {
  const [price, setPrice] = useState<number | null>(null);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'connecting',
    lastUpdate: null,
    reconnectAttempts: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const priceRef = useRef<number | null>(null);

  const fetchRestPrice = useCallback(async () => {
    try {
      const response = await fetch(REST_URL);
      const data = await response.json();
      const newPrice = parseFloat(data.price);

      if (!isNaN(newPrice)) {
        setPreviousPrice(priceRef.current);
        priceRef.current = newPrice;
        setPrice(newPrice);
        setConnectionState(prev => ({
          ...prev,
          lastUpdate: Date.now(),
        }));
      }
    } catch (error) {
      console.error('REST fallback failed:', error);
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState(prev => ({
      ...prev,
      status: 'connecting',
    }));

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setConnectionState({
          status: 'connected',
          lastUpdate: Date.now(),
          reconnectAttempts: 0,
        });
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
      };

      ws.onmessage = (event) => {
        try {
          const data: TradeData = JSON.parse(event.data);
          const newPrice = parseFloat(data.p);

          if (!isNaN(newPrice)) {
            setPreviousPrice(priceRef.current);
            priceRef.current = newPrice;
            setPrice(newPrice);
            setConnectionState(prev => ({
              ...prev,
              lastUpdate: Date.now(),
            }));
          }
        } catch (error) {
          console.error('Failed to parse trade data:', error);
        }
      };

      ws.onerror = () => {
        setConnectionState(prev => ({
          ...prev,
          status: 'error',
        }));
      };

      ws.onclose = () => {
        setConnectionState(prev => ({
          ...prev,
          status: 'disconnected',
          reconnectAttempts: prev.reconnectAttempts + 1,
        }));

        // Exponential backoff reconnection
        const delay = Math.min(reconnectDelayRef.current, MAX_RECONNECT_DELAY);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current *= 2;
          connect();
        }, delay);

        // Use REST as fallback while reconnecting
        fetchRestPrice();
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
      }));

      // Fallback to REST polling
      fetchRestPrice();
    }
  }, [fetchRestPrice]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    price,
    previousPrice,
    connectionState,
  };
}
