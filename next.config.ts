import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" },
      { protocol: "https", hostname: "*", port: "", pathname: "/**" },
      { protocol: "http", hostname: "*", port: "", pathname: "/**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        // O service worker NUNCA pode vir de cache HTTP longo, senao o navegador
        // demora a ver o sw.js novo (com o BUILD_ID novo). no-cache forca
        // revalidacao a cada navegacao -> pega o cache-bust na hora do deploy.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
