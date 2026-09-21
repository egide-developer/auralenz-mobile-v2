import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function SwapLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Swap" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Swap" transform="translate(2.000000, 3.000000)" stroke={color} strokeWidth={strokeWidth}>
            <Line x1="14.8395556" y1="17.1642222" x2="14.8395556" y2="3.54644444" id="Stroke-1"></Line>
            <polyline id="Stroke-3" points="18.9172222 13.0681111 14.8394444 17.1647778 10.7616667 13.0681111"></polyline>
            <Line x1="4.91111111" y1="0.832888889" x2="4.91111111" y2="14.4506667" id="Stroke-5"></Line>
            <polyline id="Stroke-7" points="0.833444444 4.929 4.91122222 0.832333333 8.989 4.929"></polyline>
        </G>
    </G>
    </Svg>
  );
}
