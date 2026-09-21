import React from "react";
import Svg, { Path, Circle, Line, G } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function ArrowDownLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <title>Iconly/Light/Arrow - Down</title>
    <g id="Iconly/Light/Arrow---Down" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <g id="Arrow---Down" transform="translate(5.500000, 4.000000)" stroke={color} strokeWidth={strokeWidth}>
            <line x1="6.7743" y1="15.75" x2="6.7743" y2="0.75" id="Stroke-1"></line>
            <polyline id="Stroke-3" points="12.7987 9.7002 6.7747 15.7502 0.7497 9.7002"></polyline>
        </g>
    </g>
    </Svg>
  );
}
