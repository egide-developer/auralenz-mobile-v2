import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function TimeCircleLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Time-Circle" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Time-Circle" transform="translate(2.000000, 2.000000)" stroke={color} strokeWidth={strokeWidth}>
            <Path d="M19.2498,10.0005 C19.2498,15.1095 15.1088,19.2505 9.9998,19.2505 C4.8908,19.2505 0.7498,15.1095 0.7498,10.0005 C0.7498,4.8915 4.8908,0.7505 9.9998,0.7505 C15.1088,0.7505 19.2498,4.8915 19.2498,10.0005 Z" id="Stroke-1"></Path>
            <polyline id="Stroke-3" points="13.4314 12.9429 9.6614 10.6939 9.6614 5.8469"></polyline>
        </G>
    </G>
    </Svg>
  );
}
