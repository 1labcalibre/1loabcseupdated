/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  output: 'export', // Enabled for Netlify static export with Functions
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
