import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { BODY_VIEWBOX, BACK_REGIONS, FRONT_REGIONS, type BodyView, type MuscleGroup } from '../constants/muscleRegions';

interface BodyMapProps {
  view: BodyView;
  /** Fill color per muscle group; a region whose muscle has no entry falls back to inertColor. */
  colors: Partial<Record<MuscleGroup, string>>;
  inertColor: string;
  width?: number;
  height?: number;
  onPressMuscle?: (muscle: MuscleGroup) => void;
}

export default function BodyMap({ view, colors, inertColor, width = 160, height = 352, onPressMuscle }: BodyMapProps) {
  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;

  return (
    <Svg width={width} height={height} viewBox={BODY_VIEWBOX}>
      {regions.map((region, i) => {
        const fill = region.muscle ? colors[region.muscle] ?? inertColor : inertColor;
        const onPress = region.muscle && onPressMuscle ? () => onPressMuscle(region.muscle as MuscleGroup) : undefined;

        if (region.shape.kind === 'circle') {
          return (
            <Circle
              key={i}
              cx={region.shape.cx}
              cy={region.shape.cy}
              r={region.shape.r}
              fill={fill}
              onPress={onPress}
            />
          );
        }
        if (region.shape.kind === 'rect') {
          return (
            <Rect
              key={i}
              x={region.shape.x}
              y={region.shape.y}
              width={region.shape.width}
              height={region.shape.height}
              rx={region.shape.rx}
              fill={fill}
              onPress={onPress}
            />
          );
        }
        return <Path key={i} d={region.shape.d} fill={fill} onPress={onPress} />;
      })}
    </Svg>
  );
}
