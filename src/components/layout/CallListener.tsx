import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "expo-router";
import { useCallStore } from "../../stores/callStore";

/**
 * Mounted once at the app root (app/_layout.tsx). A `call_offer` can arrive
 * while the user is anywhere in the app — home feed, profile, settings — not
 * just inside the relevant chat thread, so routing to the incoming-call
 * screen has to be driven globally off the store rather than from within
 * app/messages/[id].tsx.
 */
export function CallListener() {
  const router = useRouter();
  const pathname = usePathname();
  const status = useCallStore((s) => s.status);
  const routedForIncomingRef = useRef(false);

  useEffect(() => {
    if (status === "incoming") {
      if (!routedForIncomingRef.current && pathname !== "/call/incoming") {
        routedForIncomingRef.current = true;
        router.push("/call/incoming");
      }
    } else {
      routedForIncomingRef.current = false;
    }
  }, [status, pathname, router]);

  return null;
}
