import React from 'react';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../constants/theme';

interface LineChartProps {
  points: number[];
  color: string;
  height?: number;
  dotted?: boolean;
}

export default function LineChart({ points, color, height = 80, dotted = false }: LineChartProps) {
  const { theme } = useTheme();

  if (!points || points.length < 2) return null;

  const w = 310;
  const h = height;
  const minV = Math.min(...points) * 0.998;
  const maxV = Math.max(...points) * 1.002;

  const scaleX = (i: number) => (i / (points.length - 1)) * w;
  const scaleY = (v: number) => h - ((v - minV) / (maxV - minV)) * h * 0.85 - h * 0.08;

  const pts = points.map((v, i): [number, number] => [scaleX(i), scaleY(v)]);
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const fillD = `${d} L${pts[pts.length - 1][0]},${h} L0,${h} Z`;

  const gradId = `grad${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.01} />
        </LinearGradient>
      </Defs>
      <Path d={fillD} fill={`url(#${gradId})`} />
      <Path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dotted ? '4 3' : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map(([x, y], i) => (
        <Circle
          key={i}
          cx={x}
          cy={y}
          r={i === pts.length - 1 ? 4 : 3}
          fill={i === pts.length - 1 ? color : theme.bg}
          stroke={color}
          strokeWidth={2}
        />
      ))}
    </Svg>
  );
}
