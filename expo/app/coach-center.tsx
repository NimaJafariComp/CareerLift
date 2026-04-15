import React from "react";

import { PlaceholderPage } from "@/components/placeholder/PlaceholderPage";

export default function CoachCenterScreen() {
  return (
    <PlaceholderPage
      title="Coach Center"
      subtitle="Interview prep, skill-gap analysis, and coaching workflows will grow from this route."
      body="The dashboard already surfaces a compact coach snapshot, so the full page can build on stable mobile theming, navigation, and resume context."
      next={[
        "Add the mobile mock-interview flow with question, answer, and feedback steps.",
        "Expand the compact skill-gap summary into the full analysis view.",
        "Reserve room for growth plans and other coaching surfaces without redesigning navigation.",
      ]}
    />
  );
}
