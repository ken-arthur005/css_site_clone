import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Send old www URLs straight to their final destinations in one hop.
      {
        source: "/current-administration",
        has: [{ type: "host", value: "www.thecssknust.com" }],
        destination: "https://thecssknust.com/executives",
        permanent: true,
      },
      {
        source: "/history",
        has: [{ type: "host", value: "www.thecssknust.com" }],
        destination: "https://thecssknust.com/about",
        permanent: true,
      },
      { source: "/current-administration", destination: "/executives", permanent: true },
      { source: "/history", destination: "/about", permanent: true },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.thecssknust.com" }],
        destination: "https://thecssknust.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
