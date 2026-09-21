import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function ArrowDown3Bold({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light-Outline/Arrow---Down-3" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd">
        <G id="Arrow---Down-3" transform="translate(6.000000, 3.000000)">
            <Path d="M5.7512,0.0002 C6.1652,0.0002 6.5012,0.3362 6.5012,0.7502 L6.50104653,8.9502 L10.7526,8.9502 C11.0256,8.9502 11.2766,9.0982 11.4086,9.3382 C11.5416,9.5772 11.5326,9.8692 11.3866,10.0992 L6.3856,18.0362 C6.2486,18.2552 6.0086,18.3872 5.7516,18.3872 C5.4936,18.3872 5.2546,18.2552 5.1166,18.0362 L0.1156,10.0992 C-0.0304,9.8692 -0.0384,9.5772 0.0936,9.3382 C0.2256,9.0982 0.4766,8.9502 0.7506,8.9502 L5.00104653,8.9502 L5.0012,0.7502 C5.0012,0.3362 5.3372,0.0002 5.7512,0.0002 Z M9.3926,10.4502 L2.1096,10.4502 L5.7516,16.2292 L9.3926,10.4502 Z" id="Combined-Shape" fill={color}></Path>
            <G id="Group-5" transform="translate(0.000000, 8.386700)"></G>
        </G>
    </G>
    </Svg>
  );
}
