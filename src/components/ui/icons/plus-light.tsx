import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Polyline, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function PlusLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Plus" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Plus" transform="translate(2.000000, 2.000000)" stroke={color} strokeWidth={strokeWidth}>
            <Line x1="10" y1="6.32730733" x2="10" y2="13.6536632" id="Line_185"></Line>
            <Line x1="13.6666667" y1="9.99048525" x2="6.33333333" y2="9.99048525" id="Line_186"></Line>
            <Path d="M14.6857143,0 L5.31428571,0 C2.04761905,0 0,2.31208373 0,5.58515699 L0,14.414843 C0,17.6879163 2.03809524,20 5.31428571,20 L14.6857143,20 C17.9619048,20 20,17.6879163 20,14.414843 L20,5.58515699 C20,2.31208373 17.9619048,0 14.6857143,0 Z" id="Path"></Path>
        </G>
    </G>
    </Svg>
  );
}
