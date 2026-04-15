import React from "react";

import { PlaceholderPage } from "@/components/placeholder/PlaceholderPage";

export default function ApplicationsScreen() {
  return (
    <PlaceholderPage
      title="Applications"
      subtitle="Your full application pipeline will expand from the local dashboard tracker into this route."
      body="Phase 1 already uses the same mobile-local application store as the dashboard card, so this page can evolve without changing persistence."
      next={[
        "Add status tabs and richer application detail rows.",
        "Support inline status changes and removals.",
        "Promote the local tracker to a broader cross-device strategy when backend support is ready.",
      ]}
    />
  );
}
