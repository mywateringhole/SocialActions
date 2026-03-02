import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@socialactions/api", "@socialactions/db"],
};

export default nextConfig;
