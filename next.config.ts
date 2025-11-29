import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // Note: For large video uploads, you may need to configure
  // the body parser size limit in your deployment platform
  // (e.g., Vercel, AWS Lambda) or use a streaming upload approach
};

export default nextConfig;