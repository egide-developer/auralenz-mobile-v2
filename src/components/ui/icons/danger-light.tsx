import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function DangerLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <g id="Iconly/Light/Danger-Circle" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <g id="Danger-Circle" transform="translate(2.000000, 2.000000)" stroke={color}>
            <path d="M10.0001,0.7501 C15.1081,0.7501 19.2501,4.8911 19.2501,10.0001 C19.2501,15.1081 15.1081,19.2501 10.0001,19.2501 C4.8911,19.2501 0.7501,15.1081 0.7501,10.0001 C0.7501,4.8911 4.8911,0.7501 10.0001,0.7501 Z" id="Stroke-1" strokeWidth={strokeWidth}></path>
            <line x1="9.9952" y1="6.2042" x2="9.9952" y2="10.6232" id="Stroke-3" strokeWidth={strokeWidth}></line>
            <line x1="9.995" y1="13.7961" x2="10.005" y2="13.7961" id="Stroke-5" strokeWidth={strokeWidth}></line>
        </g>
    </g>
    </Svg>
  );
}
