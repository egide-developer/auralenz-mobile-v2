import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function NotificationLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <g id="Iconly/Light/Notification" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <g id="Notification" transform="translate(3.500000, 2.000000)" stroke={color} strokeWidth={strokeWidth}>
            <path d="M8.5,15.8476424 C14.13923,15.8476424 16.7480515,15.1242108 17,12.220506 C17,9.31879687 15.1811526,9.50539234 15.1811526,5.94511102 C15.1811526,3.16414015 12.5452291,-1.86517468e-14 8.5,-1.86517468e-14 C4.4547709,-1.86517468e-14 1.81884743,3.16414015 1.81884743,5.94511102 C1.81884743,9.50539234 0,9.31879687 0,12.220506 C0.252952291,15.135187 2.86177374,15.8476424 8.5,15.8476424 Z" id="Stroke-1"></path>
            <path d="M10.8887931,18.8572176 C9.52465753,20.3719337 7.3966462,20.3898948 6.0194615,18.8572176" id="Stroke-3"></path>
        </g>
    </g>
    </Svg>
  );
}
