import { Redirect } from "expo-router";

// The discovery grid now lives in the Search tab (search.tsx), matching
// Instagram's own pattern where the search tab IS the explore grid before
// you type a query. This route is kept only as a redirect in case
// anything still deep-links here.
export default function ExploreRedirect() {
  return <Redirect href="/(tabs)/search" />;
}
