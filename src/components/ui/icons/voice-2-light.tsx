import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Voice2Light({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Voice-2" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Voice-2" transform="translate(4.000000, 2.000000)" stroke={color} strokeWidth={strokeWidth}>
            <Line x1="8.00020953" y1="20" x2="8.00020953" y2="16.8390306" id="Stroke-1"></Line>
            <Path d="M8.00020953,12.8480829 L8.00020953,12.8480829 C5.75610267,12.8480829 3.93839707,11.0218152 3.93839707,8.76819031 L3.93839707,4.08094524 C3.93839707,1.82732033 5.75610267,-3.55271368e-15 8.00020953,-3.55271368e-15 C10.2432687,-3.55271368e-15 12.0609743,1.82732033 12.0609743,4.08094524 L12.0609743,8.76819031 C12.0609743,11.0218152 10.2432687,12.8480829 8.00020953,12.8480829 Z" id="Stroke-3"></Path>
            <Path d="M16,8.80061051 C16,13.2394411 12.4180199,16.8382937 8,16.8382937 C3.58093243,16.8382937 7.10542736e-15,13.2394411 7.10542736e-15,8.80061051" id="Stroke-5"></Path>
            <Line x1="10.0689366" y1="4.75576959" x2="12.0584599" y2="4.75576959" id="Stroke-7"></Line>
            <Line x1="9.07040335" y1="8.09347122" x2="12.0604505" y2="8.09347122" id="Stroke-9"></Line>
        </G>
    </G>
    </Svg>
  );
}
