'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { PricePoint } from '@/types';
import { formatPrice } from '@/lib/priceAnalysis';

interface PriceChartProps {
  data: PricePoint[];
}

export function PriceChart({ data }: PriceChartProps) {
  const chartData = useMemo(() => {
    return data.map((point) => ({
      time: new Date(point.time).toLocaleTimeString(),
      price: point.price,
    }));
  }, [data]);

  const { minPrice, maxPrice, trend } = useMemo(() => {
    if (data.length < 2) {
      return { minPrice: 0, maxPrice: 100000, trend: 'neutral' as const };
    }

    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1 || 100;

    const firstPrice = data[0].price;
    const lastPrice = data[data.length - 1].price;
    const trend = lastPrice > firstPrice ? 'up' : lastPrice < firstPrice ? 'down' : 'neutral';

    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      trend,
    };
  }, [data]);

  const gradientColor = trend === 'up' ? '#4ade80' : trend === 'down' ? '#f87171' : '#a1a1aa';
  const strokeColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#71717a';

  if (data.length === 0) {
    return (
      <div className="w-full h-48 md:h-64 flex items-center justify-center text-zinc-500">
        Waiting for price data...
      </div>
    );
  }

  return (
    <div className="w-full h-48 md:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 10 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              color: '#fafafa',
            }}
            formatter={(value: number) => [formatPrice(value), 'Price']}
            labelStyle={{ color: '#a1a1aa' }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={2}
            fill="url(#priceGradient)"
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
