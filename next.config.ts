import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  serverExternalPackages: ["@node-rs/argon2", "postgres"],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
