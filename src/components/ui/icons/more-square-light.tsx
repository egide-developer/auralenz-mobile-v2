import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Polyline, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function MoreSquareLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/More-Square" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="More-Square" transform="translate(2.000000, 2.000000)" stroke={color}>
            <Path d="M14.3342,0.7501 L5.6652,0.7501 C2.6442,0.7501 0.7502,2.8891 0.7502,5.9161 L0.7502,14.0841 C0.7502,17.1111 2.6342,19.2501 5.6652,19.2501 L14.3332,19.2501 C17.3642,19.2501 19.2502,17.1111 19.2502,14.0841 L19.2502,5.9161 C19.2502,2.8891 17.3642,0.7501 14.3342,0.7501 Z" id="Stroke-1" strokeWidth={strokeWidth}></Path>
            <Line x1="13.9394" y1="10.013" x2="13.9484" y2="10.013" id="Stroke-11" strokeWidth={strokeWidth}></Line>
            <Line x1="9.9304" y1="10.013" x2="9.9394" y2="10.013" id="Stroke-13" strokeWidth={strokeWidth}></Line>
            <Line x1="5.9214" y1="10.013" x2="5.9304" y2="10.013" id="Stroke-15" strokeWidth={strokeWidth}></Line>
        </G>
    </G>
    </Svg>
  );
}
