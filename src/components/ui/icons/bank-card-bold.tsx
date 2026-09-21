import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function BankCardBold({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M2.25 4.85889H22.25V20.4189H2.25V4.85889ZM3.75 6.35889V18.9189H20.75V6.35889H3.75Z" fill={color}></Path>
<Path fillRule="evenodd" clipRule="evenodd" d="M2.25 9.67181H22.25V11.1718H2.25V9.67181Z" fill={color}></Path>
<Path fillRule="evenodd" clipRule="evenodd" d="M14.3516 15.231H19.3268V16.731H14.3516V15.231Z" fill={color}></Path>
<Path fillRule="evenodd" clipRule="evenodd" d="M10.126 15.231H12.3738V16.731H10.126V15.231Z" fill={color}></Path>
    </Svg>
  );
}
