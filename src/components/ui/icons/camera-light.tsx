import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function CameraLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Camera" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Camera" transform="translate(2.000000, 3.000000)" stroke={color}>
            <Path d="M13.0402,1.0513 C14.0502,1.4533 14.3592,2.8533 14.7722,3.3033 C15.1852,3.7533 15.7762,3.9063 16.1032,3.9063 C17.8412,3.9063 19.2502,5.3153 19.2502,7.0523 L19.2502,12.8473 C19.2502,15.1773 17.3602,17.0673 15.0302,17.0673 L4.9702,17.0673 C2.6392,17.0673 0.7502,15.1773 0.7502,12.8473 L0.7502,7.0523 C0.7502,5.3153 2.1592,3.9063 3.8972,3.9063 C4.2232,3.9063 4.8142,3.7533 5.2282,3.3033 C5.6412,2.8533 5.9492,1.4533 6.9592,1.0513 C7.9702,0.6493 12.0302,0.6493 13.0402,1.0513 Z" id="Stroke-1" strokeWidth={strokeWidth}></Path>
            <Line x1="15.4955" y1="6.5" x2="15.5045" y2="6.5" id="Stroke-13" strokeWidth={strokeWidth}></Line>
            <Path d="M13.1789,10.128 C13.1789,8.372 11.7559,6.949 9.9999,6.949 C8.2439,6.949 6.8209,8.372 6.8209,10.128 C6.8209,11.884 8.2439,13.307 9.9999,13.307 C11.7559,13.307 13.1789,11.884 13.1789,10.128 Z" id="Stroke-5" strokeWidth={strokeWidth}></Path>
        </G>
    </G>
    </Svg>
  );
}
