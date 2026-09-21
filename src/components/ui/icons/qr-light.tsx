import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function QrCodeLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M10.0558 10.0338V3.22778H3.24976V10.0338H10.0558Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M13.9441 20.7271H20.7501V13.9211H13.9441V20.7271Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M16.3751 3.22778H13.9451V7.34778" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M20.7501 4.92878V3.22778H19.0491" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M20.7501 7.60278V10.0328H19.0491" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M13.9451 10.0327H16.1651" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M16.2673 5.59253V7.81153H18.0963" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M18.6936 5.58276V5.59276" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M6.6521 6.58163V6.67863" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M6.6521 17.2755V17.3725" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M17.3474 17.2755V17.3725" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
<path d="M3.24976 13.9211V20.7271H10.0558V13.9211H3.24976Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square"></path>
    </Svg>
  );
}
