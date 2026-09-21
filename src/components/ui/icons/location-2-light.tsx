import React from "react";
import Svg, { Path, Circle, Line, G } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Location2Light({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M14.6505 9.73927C14.6505 8.4133 13.5761 7.33887 12.2511 7.33887C10.9251 7.33887 9.85065 8.4133 9.85065 9.73927C9.85065 11.0643 10.9251 12.1387 12.2511 12.1387C13.5761 12.1387 14.6505 11.0643 14.6505 9.73927Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"></path>
<path fillRule="evenodd" clipRule="evenodd" d="M12.2496 22.1387C12.2496 18.5358 5.22723 15.4199 5.05029 9.71248C4.92604 5.70495 8.273 2.13867 12.2496 2.13867C16.2262 2.13867 19.5722 5.70489 19.4498 9.71248C19.2718 15.537 12.2496 18.4394 12.2496 22.1387Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"></path>
    </Svg>
  );
}
