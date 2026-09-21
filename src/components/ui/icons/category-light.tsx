import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Polyline, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function CategoryLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Category" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Category" transform="translate(2.999141, 3.000000)" stroke={color} strokeWidth={strokeWidth}>
            <Path d="M0.000858865205,3.5 C0.000858865205,0.874787053 0.0289681101,0 3.50085887,0 C6.9727494,0 7.00085887,0.874787053 7.00085887,3.5 C7.00085887,6.12521295 7.01193168,7 3.50085887,7 C-0.010214169,7 0.000858865205,6.12521295 0.000858865205,3.5 Z" id="Stroke-1"></Path>
            <Path d="M11.0008589,3.5 C11.0008589,0.874787053 11.0289681,0 14.5008589,0 C17.9727494,0 18.0008589,0.874787053 18.0008589,3.5 C18.0008589,6.12521295 18.0119317,7 14.5008589,7 C10.9897858,7 11.0008589,6.12521295 11.0008589,3.5 Z" id="Stroke-3"></Path>
            <Path d="M0.000858865205,14.5 C0.000858865205,11.8747871 0.0289681101,11 3.50085887,11 C6.9727494,11 7.00085887,11.8747871 7.00085887,14.5 C7.00085887,17.1252129 7.01193168,18 3.50085887,18 C-0.010214169,18 0.000858865205,17.1252129 0.000858865205,14.5 Z" id="Stroke-5"></Path>
            <Path d="M11.0008589,14.5 C11.0008589,11.8747871 11.0289681,11 14.5008589,11 C17.9727494,11 18.0008589,11.8747871 18.0008589,14.5 C18.0008589,17.1252129 18.0119317,18 14.5008589,18 C10.9897858,18 11.0008589,17.1252129 11.0008589,14.5 Z" id="Stroke-7"></Path>
        </G>
    </G>
    </Svg>
  );
}
