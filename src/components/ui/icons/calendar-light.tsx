import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function CalendarLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <g id="Iconly/Light/Calendar" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <g id="Calendar" transform="translate(3.000000, 2.000000)" stroke={color} strokeWidth={strokeWidth}>
            <line x1="0.0926400664" y1="7.40425532" x2="17.9165888" y2="7.40425532" id="Line_200"></line>
            <line x1="13.4420736" y1="11.3096927" x2="13.4513376" y2="11.3096927" id="Line_201"></line>
            <line x1="9.00461445" y1="11.3096927" x2="9.01387846" y2="11.3096927" id="Line_202"></line>
            <line x1="4.55789127" y1="11.3096927" x2="4.56715527" y2="11.3096927" id="Line_203"></line>
            <line x1="13.4420736" y1="15.1962175" x2="13.4513376" y2="15.1962175" id="Line_204"></line>
            <line x1="9.00461445" y1="15.1962175" x2="9.01387846" y2="15.1962175" id="Line_205"></line>
            <line x1="4.55789127" y1="15.1962175" x2="4.56715527" y2="15.1962175" id="Line_206"></line>
            <line x1="13.0437213" y1="-2.26485497e-14" x2="13.0437213" y2="3.29078014" id="Line_207"></line>
            <line x1="4.96550756" y1="-2.26485497e-14" x2="4.96550756" y2="3.29078014" id="Line_208"></line>
            <path d="M13.2382655,1.57919622 L4.77096342,1.57919622 C1.83427331,1.57919622 0,3.21513002 0,6.22222222 L0,15.2718676 C0,18.3262411 1.83427331,20 4.77096342,20 L13.2290015,20 C16.1749556,20 18,18.3546099 18,15.3475177 L18,6.22222222 C18.0092289,3.21513002 16.1842196,1.57919622 13.2382655,1.57919622 Z" id="Path"></path>
        </g>
    </g>
    </Svg>
  );
}
