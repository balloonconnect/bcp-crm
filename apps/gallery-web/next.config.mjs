/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@bcp/ui", "@bcp/types", "@bcp/validation", "@bcp/config", "@bcp/branding"],
  experimental: { typedRoutes: true },
};

export default nextConfig;
