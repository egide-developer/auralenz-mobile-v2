import React from "react";
import Svg, { Path, Circle, Line, G } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function DiscoveryLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <title>Iconly/Light/Discovery</title>
    <g id="Iconly/Light/Discovery" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <g id="Discovery" transform="translate(2.000000, 2.000000)" stroke={color} strokeWidth={strokeWidth}>
            <polygon id="Path_33947" points="6.27002291 12.9519451 7.86270027 7.86270027 12.9519451 6.27002291 11.3592678 11.3592678"></polygon>
            <circle id="Ellipse_738" cx="9.61098403" cy="9.61098403" r="9.61098403"></circle>
        </g>
    </g>
    </Svg>
  );
}
