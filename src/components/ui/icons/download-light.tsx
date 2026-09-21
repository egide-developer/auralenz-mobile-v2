import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Polyline, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function DownloadLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Download" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Downlaod" transform="translate(2.000000, 3.000000)" stroke={color} strokeWidth={strokeWidth}>
            <Line x1="16.1427" y1="6.4156" x2="4.1017" y2="6.4156" id="Stroke-1" transform="translate(10.122200, 6.415600) rotate(-270.000000) translate(-10.122200, -6.415600) "></Line>
            <Polyline id="Stroke-3" transform="translate(10.122200, 10.972400) rotate(-270.000000) translate(-10.122200, -10.972400) " points="8.6582 8.0564 11.5862 10.9724 8.6582 13.8884"></Polyline>
            <Path d="M4,6.617 L4,5.684 C4,3.649 5.649,2 7.685,2 L12.569,2 C14.599,2 16.244,3.645 16.244,5.675 L16.244,16.815 C16.244,18.85 14.594,20.5 12.559,20.5 L7.674,20.5 C5.645,20.5 4,18.854 4,16.825 L4,15.883" id="Stroke-4" transform="translate(10.122000, 11.250000) rotate(-270.000000) translate(-10.122000, -11.250000) "></Path>
        </G>
    </G>
    </Svg>
  );
}
