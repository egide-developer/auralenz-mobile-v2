import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function PaperFailLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Paper-Fail" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Paper-Fail" transform="translate(3.500000, 2.000000)" stroke={color} strokeWidth={strokeWidth}>
            <Path d="M11.2372,0.7619 L4.4792,0.7619 C2.4192,0.7619 0.7502,2.4319 0.7502,4.4909 L0.7502,15.3399 C0.7622,17.4389 2.4732,19.1299 4.5722,19.1169745 C4.6122,19.1169745 4.6512,19.1159 4.6902,19.1149 L12.5732,19.1149 C14.6412,19.0939 16.3062,17.4089 16.3022072,15.3399 L16.3022072,6.0399 L11.2372,0.7619 Z" id="Stroke-1"></Path>
            <Path d="M10.974,0.7502 L10.974,3.6592 C10.974,5.0792 12.122,6.2302 13.542,6.2342 L16.297,6.2342" id="Stroke-3"></Path>
            <Line x1="10.0761" y1="12.6481" x2="6.6101" y2="9.1821" id="Stroke-5"></Line>
            <Line x1="6.6112" y1="12.6481" x2="10.0772" y2="9.1821" id="Stroke-7"></Line>
        </G>
    </G>
    </Svg>
  );
}
