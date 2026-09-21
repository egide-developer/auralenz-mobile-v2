import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Polyline, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function ShieldFailLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Shield-Fail" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Shield-Fail" transform="translate(3.500000, 2.000000)" stroke={color} strokeWidth={strokeWidth}>
            <Path d="M8.485,19.606 C8.485,19.606 16.157,17.283 16.157,10.879 C16.157,4.474 16.435,3.974 15.819,3.358 C15.204,2.742 9.491,0.75 8.485,0.75 C7.479,0.75 1.766,2.742 1.15,3.358 C0.535,3.974 0.813,4.474 0.813,10.879 C0.813,17.283 8.485,19.606 8.485,19.606 Z" id="Stroke-1"></Path>
            <Line x1="10.3639" y1="11.8248" x2="6.6059" y2="8.0668" id="Stroke-3"></Line>
            <Line x1="6.606" y1="11.8248" x2="10.364" y2="8.0668" id="Stroke-5"></Line>
        </G>
    </G>
    </Svg>
  );
}
