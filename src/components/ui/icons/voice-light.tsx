import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Polyline, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function VoiceLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Voice" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Voice" transform="translate(4.000000, 2.000000)" stroke={color} strokeWidth={strokeWidth}>
            <Line x1="7.99979045" y1="20" x2="7.99979045" y2="16.8390306" id="Stroke-1"></Line>
            <Path d="M7.99979045,12.8480829 L7.99979045,12.8480829 C5.75658438,12.8480829 3.937712,11.0218152 3.937712,8.76819031 L3.937712,4.08094524 C3.937712,1.82732033 5.75658438,-3.55271368e-15 7.99979045,-3.55271368e-15 C10.2440443,-3.55271368e-15 12.0618689,1.82732033 12.0618689,4.08094524 L12.0618689,8.76819031 C12.0618689,11.0218152 10.2440443,12.8480829 7.99979045,12.8480829 Z" id="Stroke-3"></Path>
            <Path d="M16,8.80061051 C16,13.2394411 12.4188331,16.8382937 7.99947613,16.8382937 C3.58116692,16.8382937 0,13.2394411 0,8.80061051" id="Stroke-5"></Path>
        </G>
    </G>
    </Svg>
  );
}
