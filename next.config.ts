import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "firebase-admin", "ag-psd"],
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" },
      { protocol: "https", hostname: "*.blob.vercel-storage.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
