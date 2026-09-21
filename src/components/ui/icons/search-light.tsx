import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Polyline, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function SearchLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Search" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Search" transform="translate(2.000000, 2.000000)" stroke={color} strokeWidth={strokeWidth}>
            <Circle id="Ellipse_739" cx="9.76659044" cy="9.76659044" r="8.9885584"></Circle>
            <Line x1="16.0183067" y1="16.4851259" x2="19.5423342" y2="20.0000001" id="Line_181"></Line>
        </G>
    </G>
    </Svg>
  );
}
