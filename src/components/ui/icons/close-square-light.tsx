import React from "react";
import Svg, { Path, Circle, Line, G } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function CloseSquareLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <title>Iconly/Light/Close Square</title>
    <g id="Iconly/Light/Close-Square" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <g id="Close-Square" transform="translate(2.000000, 2.000000)" stroke={color} strokeWidth={strokeWidth}>
            <line x1="12.3955" y1="7.5949" x2="7.6035" y2="12.3869" id="Stroke-1"></line>
            <line x1="12.397" y1="12.3898" x2="7.601" y2="7.5928" id="Stroke-2"></line>
            <path d="M14.3345,0.7502 L5.6655,0.7502 C2.6445,0.7502 0.7505,2.8892 0.7505,5.9162 L0.7505,14.0842 C0.7505,17.1112 2.6355,19.2502 5.6655,19.2502 L14.3335,19.2502 C17.3645,19.2502 19.2505,17.1112 19.2505,14.0842 L19.2505,5.9162 C19.2505,2.8892 17.3645,0.7502 14.3345,0.7502 Z" id="Stroke-3"></path>
        </g>
    </g>
    </Svg>
  );
}
