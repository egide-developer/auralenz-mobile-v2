import React from "react";
import Svg, { Path, Circle, Line, G, Polygon, Polyline, Defs, Use } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function FilterLight({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G id="Iconly/Light/Filter" stroke="none" strokeWidth={strokeWidth} fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <G id="Filter" transform="translate(4.000000, 4.500000)" stroke={color} strokeWidth={strokeWidth}>
            <Line x1="6.33015655" y1="12.0929063" x2="0.0294393477" y2="12.0929063" id="Stroke-1"></Line>
            <Line x1="9.14048198" y1="2.40037662" x2="15.4411992" y2="2.40037662" id="Stroke-3"></Line>
            <Path d="M4.72628792,2.34625359 C4.72628792,1.05059752 3.66812728,1.79725516e-14 2.36314396,1.79725516e-14 C1.05816064,1.79725516e-14 1.25389895e-15,1.05059752 1.25389895e-15,2.34625359 C1.25389895e-15,3.64190965 1.05816064,4.69250717 2.36314396,4.69250717 C3.66812728,4.69250717 4.72628792,3.64190965 4.72628792,2.34625359 Z" id="Stroke-5"></Path>
            <Path d="M16,12.0537464 C16,10.7580903 14.942654,9.70749283 13.6376706,9.70749283 C12.3318727,9.70749283 11.2737121,10.7580903 11.2737121,12.0537464 C11.2737121,13.3494025 12.3318727,14.4 13.6376706,14.4 C14.942654,14.4 16,13.3494025 16,12.0537464 Z" id="Stroke-7"></Path>
        </G>
    </G>
    </Svg>
  );
}
