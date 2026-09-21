import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Polyline, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function SendLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Send" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Send" transform="translate(3.000000, 3.000000)" stroke={color} strokeWidth={strokeWidth}>
            <Path d="M12.8324759,5.17463303 L7.10903824,10.9591851 L0.599436312,6.88767232 C-0.333249591,6.30414294 -0.139234755,4.88743509 0.915720913,4.57892564 L16.3712257,0.0527673159 C17.3372579,-0.230371288 18.2325555,0.67283071 17.9455752,1.6419969 L13.3730902,17.0867511 C13.059837,18.1431929 11.6512085,18.331952 11.073206,17.3952605 L7.10600676,10.9602"></Path>
        </G>
    </G>
    </Svg>
  );
}
