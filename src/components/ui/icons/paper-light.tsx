import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Polyline, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function PaperLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Paper" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Paper" transform="translate(3.500000, 2.000000)" stroke={color} strokeWidth={strokeWidth}>
            <Path d="M11.2378,0.761771171 L4.5848,0.761771171 C2.5048,0.7538 0.7998,2.4118 0.7508,4.4908 L0.7508,15.2038 C0.7048,17.3168 2.3798,19.0678 4.4928,19.1148 C4.5238,19.1148 4.5538,19.1158 4.5848,19.1148 L12.5738,19.1148 C14.6678,19.0298 16.3178,17.2998 16.3029015,15.2038 L16.3029015,6.0378 L11.2378,0.761771171 Z" id="Stroke-1"></Path>
            <Path d="M10.9751,0.75 L10.9751,3.659 C10.9751,5.079 12.1231,6.23 13.5431,6.234 L16.2981,6.234" id="Stroke-3"></Path>
            <Line x1="10.7881" y1="13.3585" x2="5.3881" y2="13.3585" id="Stroke-5"></Line>
            <Line x1="8.7432" y1="9.606" x2="5.3872" y2="9.606" id="Stroke-7"></Line>
        </G>
    </G>
    </Svg>
  );
}
