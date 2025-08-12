/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  // output: 'export', // Disabled - using server-side deployment for API routes
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Disable features that don't work with static export
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

export default nextConfig
