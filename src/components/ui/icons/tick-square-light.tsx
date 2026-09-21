import React from "react";
import Svg, { Path, Circle, Line, G } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function TickSquareLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <title>Iconly/Light/Tick Square</title>
    <g id="Iconly/Light/Tick-Square" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <g id="Tick-Square" transform="translate(2.000000, 2.000000)" stroke={color} strokeWidth={strokeWidth}>
            <path d="M14.3344,0.7502 L5.6654,0.7502 C2.6444,0.7502 0.7504,2.8892 0.7504,5.9162 L0.7504,14.0842 C0.7504,17.1112 2.6354,19.2502 5.6654,19.2502 L14.3334,19.2502 C17.3644,19.2502 19.2504,17.1112 19.2504,14.0842 L19.2504,5.9162 C19.2504,2.8892 17.3644,0.7502 14.3344,0.7502 Z" id="Stroke-1"></path>
            <polyline id="Stroke-3" points="6.4399 10.0002 8.8139 12.3732 13.5599 7.6272"></polyline>
        </g>
    </g>
    </Svg>
  );
}
