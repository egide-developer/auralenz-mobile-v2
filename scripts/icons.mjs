#!/usr/bin/env node
// icons.mjs — Read iconly SVGs from staging, pick light+bold per needed icon, copy to assets/icons/iconly/
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync } from "fs";
import { join, basename } from "path";

const STAGING = join(import.meta.dirname, "../staging/icons");
const ASSETS  = join(import.meta.dirname, "../assets/icons/iconly");
const OUT_SRC = join(import.meta.dirname, "../src/components/ui/icons");

// All icon names we need (mapped from Ionicons usage in the app)
const NEEDED_ICONS = {
  // Tab bar
  home:            "Home",
  search:          "Search",
  discovery:       "Discovery",     // compass/explore
  chat:            "Chat",          // messages
  user:            "User",          // profile
  plus:            "Plus",          // create FAB

  // Navigation
  "arrow-left":    "Arrow-Left",    // back chevron
  "arrow-right":   "Arrow-Right",   // forward chevron
  "close-square":  "Close-Square",  // close

  // Settings / auth
  setting:         "Setting",
  lock:            "Lock",
  logout:          "Logout",

  // Content
  send:            "Send",
  call:            "Call",
  camera:          "Camera",
  voice:           "Voice",         // mic
  video:           "Video",

  // Extra icons used in screens
  notification:    "Notification",
  image:           "Image",
  edit:            "Edit",
  "edit-square":   "Edit-Square",
  delete:          "Delete",
  shield:          "Shield-Done",
  "shield-fail":   "Shield-Fail",
  star:            "Star",          // star rating
  filter:          "Filter",
  "more-circle":   "More-Circle",
  "more-square":   "More-Square",
  bookmark:        "Bookmark",
  heart:           "Heart",
  folder:          "Folder",
  play:            "Play",
  document:        "Document",
  calendar:        "Calendar",
  "chevron-down":  "Arrow-Down",
  upload:          "Upload",
  download:        "Download",
  hide:            "Hide",
  show:            "Show",
  "time-circle":   "Time-Circle",
  wallet:          "Wallet",
  work:            "Work",
  "volume-up":     "Volume-Up",
  "volume-down":   "Volume-Down",
  "volume-off":    "Volume-Off",
  "voice-2":       "Voice-2",
  "paper-plus":    "Paper-Plus",
  ticket:          "Ticket",
  discount:        "Discount",
  "tick-square":   "Tick-Square",
  danger:          "Danger",
  "danger-circle": "Danger-Circle",
  paper:           "Paper",
  swap:            "Swap",
  "paper-upload":  "Paper-Upload",
  "paper-download":"Paper-Download",
  graph:           "Graph",
  buy:             "Buy",
  "bank-card":     "Bank-Card",
  category:        "Category",
  "add-user":      "Add-User",
  activity:        "Activity",
  scan:            "Scan",
  qr:              "QR-code",
  "paper-fail":    "Paper-Fail",
  "paper-negative":"Paper-Negative",
  "info-square":   "Info-Square",
  "danger-triangle":"Danger-Triangle",
  unlock:          "Unlock",
  "arrow-left-2":  "Arrow-Left-2",
  "arrow-right-2": "Arrow-Right-2",
  "arrow-up":      "Arrow-Up",
  "arrow-down-2":  "Arrow-Down-2",
  "arrow-down-3":  "Arrow-Down-3",
  "arrow-up-2":    "Arrow-Up-2",
  "arrow-up-3":    "Arrow-Up-3",
  location:        "Location",
  "location-2":    "Location-2",
};

// Scan all files
const allFiles = readdirSync(STAGING).filter(f => f.endsWith(".svg"));

// Group by icon name (strip trailing timestamp)
function getBaseName(file) {
  return file.replace(/-\d{13}\.svg$/, "").replace(/^Iconly-/, "").toLowerCase();
}

function getTimestamp(file) {
  const m = file.match(/-(\d{13})\.svg$/);
  return m ? m[1] : "0";
}

// Classify a file: returns "light" | "bold" | "two-tone" | "other"
function classifyStyle(filePath) {
  const content = readFileSync(filePath, "utf8");
  const hasFillPaths = /fill-rule/.test(content);
  const hasStrokes = /stroke="#000"/.test(content);
  const strokeCount = (content.match(/stroke="#000"/g) || []).length;
  const fillCount = (content.match(/fill="#000"/g) || []).length;
  const fileSize = content.length;

  // Title-based classification
  const titleMatch = content.match(/<title>Iconly\/([^/]+)\//);
  if (titleMatch) {
    const style = titleMatch[1].toLowerCase();
    if (style === "light" || style === "light-outline") return "light";
    if (style === "two-tone") return "two-tone";
    if (style === "bold" || style === "bulk" || style === "curved" || style === "broken") return "bold";
  }

  // Heuristic by size + content
  if (fillCount > strokeCount && fileSize > 1500) return "bold";
  if (strokeCount > fillCount && fileSize < 2000) return "light";
  if (strokeCount > 0 && fillCount === 0) return "light";
  if (fillCount > 0 && strokeCount === 0) return "bold";

  return "other";
}

// Group files by base name
const grouped = {};
for (const file of allFiles) {
  const base = getBaseName(file);
  if (!grouped[base]) grouped[base] = [];
  grouped[base].push({
    file,
    ts: getTimestamp(file),
    style: classifyStyle(join(STAGING, file)),
    size: statSync(join(STAGING, file)).size,
  });
}

// For each needed icon, pick the best light + bold variant
mkdirSync(ASSETS, { recursive: true });

const selected = [];

for (const [key, iconlyName] of Object.entries(NEEDED_ICONS)) {
  const baseKey = iconlyName.toLowerCase();
  const variants = grouped[baseKey] || [];

  if (variants.length === 0) {
    console.log(`⚠ Missing: ${key} (no variants for ${iconlyName})`);
    continue;
  }

  // Pick light variant (stroke-based, smallest file = cleanest line icon)
  const lightCandidates = variants.filter(v => v.style === "light");
  const lightPick = lightCandidates.length > 0
    ? lightCandidates.sort((a, b) => a.size - b.size)[0]
    : variants.sort((a, b) => a.size - b.size)[0]; // fallback: smallest file

  // Pick bold variant (fill-based, larger file)
  const boldCandidates = variants.filter(v => v.style === "bold");
  const boldPick = boldCandidates.length > 0
    ? boldCandidates.sort((a, b) => b.size - a.size)[0]
    : variants.sort((a, b) => b.size - a.size)[0]; // fallback: largest file

  // Copy to assets
  const lightDest = join(ASSETS, `${key}-light.svg`);
  const boldDest = join(ASSETS, `${key}-bold.svg`);
  copyFileSync(join(STAGING, lightPick.file), lightDest);
  if (boldPick.file !== lightPick.file) {
    copyFileSync(join(STAGING, boldPick.file), boldDest);
  } else {
    // If same file, only copy once
    copyFileSync(join(STAGING, boldPick.file), boldDest);
  }

  selected.push({
    key,
    iconlyName,
    lightFile: lightPick.file,
    boldFile: boldPick.file,
    lightStyle: lightPick.style,
    boldStyle: boldPick.style,
    totalVariants: variants.length,
  });

  console.log(`✓ ${key}: light=${lightPick.style} (${lightPick.file}), bold=${boldPick.style} (${boldPick.file}) [${variants.length} variants]`);
}

console.log(`\nTotal icons: ${selected.length}`);

// Now generate the icon components
mkdirSync(OUT_SRC, { recursive: true });

// Convert hyphenated names to PascalCase for valid JS identifiers
function toPascalCase(str) {
  return str.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join("");
}

function svgToComponent(svgContent, componentName, isBold) {
  // Strip XML declaration and root SVG attrs; extract inner content
  const inner = svgContent
    .replace(/<\?xml[^?]*\?>\s*/g, "")
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>/, "")
    .trim();

  const isStrokeBased = /stroke="#000000"/.test(inner);
  const hasFill = /fill="#000000"/.test(inner);

  return `import React from "react";
import Svg, { Path, Circle, Line, G } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function ${componentName}({ size = 24, color = "#000000", strokeWidth = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      ${inner.replace(/fill="#000000"/g, 'fill={color}').replace(/stroke="#000000"/g, 'stroke={color}').replace(/stroke-width="1\.5"/g, 'strokeWidth={strokeWidth}').replace(/stroke-linecap="round"/g, 'strokeLinecap="round"').replace(/stroke-linejoin="round"/g, 'strokeLinejoin="round"').replace(/stroke-linecap="square"/g, 'strokeLinecap="square"').replace(/fill-rule="evenodd"/g, 'fillRule="evenodd"').replace(/clip-rule="evenodd"/g, 'clipRule="evenodd"').replace(/opacity="0\.4"/g, 'opacity={0.4}').replace(/xlink:href/g, 'xlinkHref')}
    </Svg>
  );
}
`;
}

// Write a barrel index
let indexContent = `// Auto-generated Iconly icons — DO NOT EDIT\n// Source: ~/Downloads/Compressed/*.svg\n\n`;

const seen = new Set();

for (const { key, iconlyName } of selected) {
  const lightSvg = readFileSync(join(ASSETS, `${key}-light.svg`), "utf8");
  const boldSvg = readFileSync(join(ASSETS, `${key}-bold.svg`), "utf8");

  const pascalName = toPascalCase(iconlyName);
  if (seen.has(pascalName)) {
    console.log(`⚠ Skipping duplicate: ${key} (already have ${pascalName})`);
    continue;
  }
  seen.add(pascalName);

  const LightComp = svgToComponent(lightSvg, `${pascalName}Light`, false);
  const BoldComp = svgToComponent(boldSvg, `${pascalName}Bold`, true);

  writeFileSync(join(OUT_SRC, `${key}-light.tsx`), LightComp);
  writeFileSync(join(OUT_SRC, `${key}-bold.tsx`), BoldComp);

  indexContent += `export { ${pascalName}Light } from "./${key}-light";\n`;
  indexContent += `export { ${pascalName}Bold } from "./${key}-bold";\n`;
}

writeFileSync(join(OUT_SRC, "index.ts"), indexContent);
console.log(`\nGenerated ${selected.length * 2} icon components in ${OUT_SRC}`);
