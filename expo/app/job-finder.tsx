import React from "react";

import { PlaceholderPage } from "@/components/placeholder/PlaceholderPage";

export default function JobFinderScreen() {
  return (
    <PlaceholderPage
      title="Job Finder"
      subtitle="Live source browsing and ATS scoring will plug into this screen next."
      body="The route, transitions, and shell are now stable so the next implementation pass can focus on search controls, source panels, and save/apply flows."
      next={[
        "Port the search form and source-by-source job list into native stacked panels.",
        "Bring ATS scoring, save-to-applications, and refresh actions to mobile.",
        "Optimize list density and offline/error feedback for phone-sized screens.",
      ]}
    />
  );
}
