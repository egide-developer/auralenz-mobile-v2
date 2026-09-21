import React from "react";
import Svg, { Path, Circle, Line, G } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function ArrowUp3Light({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <title>Iconly/Light/Arrow - Up 3</title>
    <g id="Iconly/Light/Arrow---Up-3" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <g id="Arrow---Up-3" transform="translate(12.000000, 12.000000) rotate(-180.000000) translate(-12.000000, -12.000000) translate(6.500000, 3.000000)" stroke={color} strokeWidth={strokeWidth}>
            <line x1="5.7513" y1="9.6998" x2="5.7513" y2="0.7498" id="Stroke-1"></line>
            <polygon id="Stroke-3" points="0.7503 9.6998 5.7513 17.6368 10.7523 9.6998"></polygon>
        </g>
    </g>
    </Svg>
  );
}
