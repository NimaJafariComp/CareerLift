import type { NextConfig } from "next";

// `output: 'export'` is incompatible with middleware + API routes (which the
// new authentication layer requires). For Capacitor static-export builds, set
// `BUILD_STATIC_EXPORT=1` before `next build`.
const nextConfig: NextConfig = {
  ...(process.env.BUILD_STATIC_EXPORT === "1"
    ? { output: "export" as const }
    : {}),
  images: {
    unoptimized: true,
  },
  devIndicators: false,
};

export default nextConfig;
