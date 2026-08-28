import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { loadBodyMap, type BodyView, type MuscleGroup } from '../constants/muscleRegions';

interface BodyMapProps {
  view: BodyView;
  /** Fill color per muscle group; a region whose muscle has no entry falls back to inertColor. */
  colors: Partial<Record<MuscleGroup, string>>;
  inertColor: string;
  width?: number;
  height?: number;
  onPressMuscle?: (muscle: MuscleGroup) => void;
}

export default function BodyMap({ view, colors, inertColor, width = 160, height = 280, onPressMuscle }: BodyMapProps) {
  const data = loadBodyMap()[view];

  return (
    <Svg width={width} height={height} viewBox={data.vb}>
      {data.regions.map((region, i) => {
        const fill = region.muscle ? colors[region.muscle] ?? inertColor : inertColor;
        const onPress = region.muscle && onPressMuscle ? () => onPressMuscle(region.muscle as MuscleGroup) : undefined;
        return <Path key={i} d={region.d} fill={fill} onPress={onPress} />;
      })}
    </Svg>
  );
}
