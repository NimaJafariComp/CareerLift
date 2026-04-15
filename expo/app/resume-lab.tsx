import React from "react";

import { PlaceholderPage } from "@/components/placeholder/PlaceholderPage";

export default function ResumeLabScreen() {
  return (
    <PlaceholderPage
      title="Resume Lab"
      subtitle="Resume creation, upload, template editing, and PDF workflows will land here next."
      body="The mobile frame is ready for file import, editing flows, preview surfaces, and export actions without revisiting shell architecture."
      next={[
        "Add native document picking and upload handling.",
        "Rebuild the resume editor as stacked mobile-native sections.",
        "Introduce PDF preview and download/share flows with platform-safe UX.",
      ]}
    />
  );
}
