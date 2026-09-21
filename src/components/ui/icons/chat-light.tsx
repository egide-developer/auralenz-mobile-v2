import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function ChatLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Chat" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Chat" transform="translate(2.000000, 2.000000)" stroke={color}>
            <Path d="M17.0713569,17.0698633 C14.0152073,20.1263497 9.48977439,20.7866955 5.78641655,19.0740178 C5.23970647,18.8539025 4.7914846,18.6760012 4.36537232,18.6760012 C3.17848885,18.6830368 1.70116564,19.8338678 0.933359565,19.0669822 C0.165553489,18.2990915 1.3172626,16.8206004 1.3172626,15.6265504 C1.3172626,15.2003912 1.1464157,14.7601607 0.926324692,14.2123853 C-0.787169233,10.5096244 -0.125891225,5.98268764 2.93025835,2.92720636 C6.8315976,-0.975567922 13.1700176,-0.975567922 17.0713569,2.92620127 C20.979731,6.83500611 20.9726961,13.1680941 17.0713569,17.0698633 Z" id="Stroke-4" strokeWidth={strokeWidth}></Path>
            <Line x1="13.9394" y1="10.413" x2="13.9484" y2="10.413" id="Stroke-11" strokeWidth={strokeWidth}></Line>
            <Line x1="9.9304" y1="10.413" x2="9.9394" y2="10.413" id="Stroke-13" strokeWidth={strokeWidth}></Line>
            <Line x1="5.9214" y1="10.413" x2="5.9304" y2="10.413" id="Stroke-15" strokeWidth={strokeWidth}></Line>
        </G>
    </G>
    </Svg>
  );
}
