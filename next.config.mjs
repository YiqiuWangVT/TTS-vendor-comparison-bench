/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Do not ignore ESLint errors during build so that issues are visible in CI/deploy
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Do not ignore TypeScript build errors; surface them during build
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
