// Lazy, crash-safe access to react-native-webrtc.
//
// Importing "react-native-webrtc" at the top level throws synchronously if the
// native module isn't linked (e.g. running in Expo Go without a custom dev
// client — this app has no android/ios folder or dev client yet). A static
// `import` anywhere in the module graph that _layout.tsx pulls in would crash
// the whole app on launch, not just calling. Routing every access through a
// cached `require()` means the rest of the app keeps working in Expo Go, and
// only the call-starting actions themselves fail (gracefully) until this is
// run from a real native build.
type WebRTCModule = typeof import("react-native-webrtc");

let cached: WebRTCModule | null | undefined;

export function getWebRTC(): WebRTCModule | null {
  if (cached !== undefined) return cached;
  let result: WebRTCModule | null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    result = require("react-native-webrtc");
  } catch {
    result = null;
  }
  cached = result;
  return result;
}

export function isCallingAvailable(): boolean {
  return getWebRTC() !== null;
}
