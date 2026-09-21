import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Polyline, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function PlayLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Play" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Play" transform="translate(2.500000, 2.500000)" stroke={color} strokeWidth={strokeWidth}>
            <Path d="M9.5,0 C14.7459,0 19,4.25315 19,9.5 C19,14.74685 14.7459,19 9.5,19 C4.25315,19 0,14.74685 0,9.5 C0,4.25315 4.25315,0 9.5,0 Z" id="Stroke-1"></Path>
            <Path d="M12.5,9.49514457 C12.5,8.68401476 8.34252742,6.08911717 7.87091185,6.55569627 C7.39929629,7.02227536 7.35394864,11.9240477 7.87091185,12.4345929 C8.38787507,12.9469326 12.5,10.3062744 12.5,9.49514457 Z" id="Stroke-3"></Path>
        </G>
    </G>
    </Svg>
  );
}
