import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function BankCardLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M21.45 19.03V4.96997H2.95001V19.03H21.45Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M3.01874 9.78296L21.4499 9.78296" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M15.0521 15.342H18.5271" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M10.8255 15.342H11.5735" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
    </Svg>
  );
}
