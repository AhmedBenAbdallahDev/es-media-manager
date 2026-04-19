import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      // Allow ScreenScraper images to be proxied
      {
        protocol: "https",
        hostname: "www.screenscraper.fr",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "screenscraper.fr",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // Silence webpack config warning - we're using Turbopack
  turbopack: {},
};

export default nextConfig;
