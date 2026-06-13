import React from 'react';
import Svg, { Path } from 'react-native-svg';

const ICON_PATHS: Record<string, string> = {
  home: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  dumbbell: 'M6 5h2m8 0h2M6 19h2m8 0h2M4 9h2V5H4v4zm14 0h2V5h-2v4zM4 15h2v4H4v-4zm14 0h2v4h-2v-4zM6 12h12',
  fork: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2 M7 2v20 M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7',
  chart: 'M3 3v18h18 M7 16l4-4 4 4 4-8',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z" "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  check: 'M20 6L9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  water: 'M12 2C6 8 4 13 4 16a8 8 0 0016 0c0-3-2-8-8-14z',
  heart: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
  moon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  sun: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 17a5 5 0 100-10 5 5 0 000 10z',
  timer: 'M12 22a10 10 0 100-20 10 10 0 000 20z M12 6v6l4 2',
  fire: 'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z',
  run: 'M13 4a1 1 0 110-2 1 1 0 010 2zM7.7 10.8L10 8l2 2 2-3 3 3 M5 19l2-4 2 2 3-6 4 5 3-4',
  bike: 'M5 19a3 3 0 100-6 3 3 0 000 6zM19 19a3 3 0 100-6 3 3 0 000 6zM12 6l1 4H8l4-4zm1 4l3 3M8 10l-3 3',
  upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  camera: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" "M12 17a4 4 0 100-8 4 4 0 000 8z',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  link: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  chevron: 'M9 18l6-6-6-6',
  x: 'M18 6L6 18M6 6l12 12',
  skip: 'M5 4l10 8-10 8V4zM19 5v14',
  weight: 'M3 6h2l2 12h10l2-12h2 M9 6V5a3 3 0 016 0v1',
  sleep: 'M17 18a5 5 0 00-10 0 M12 2v4 M4.22 10.22l1.42 1.42 M1 18h2 M21 18h2 M18.36 11.64l1.42-1.42 M23 22H1 M8 6l4 4 4-4',
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeW?: number;
}

export default function Icon({ name, size = 20, color = 'currentColor', strokeW = 1.8 }: IconProps) {
  const dStr = ICON_PATHS[name];
  if (!dStr) return null;
  const paths = dStr.split('" "').map((p) => p.replace(/^d="/, '').replace(/"$/, ''));
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {paths.map((p, i) => (
        <Path
          key={i}
          d={p}
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
