import type { NextConfig } from 'next';

// When NEXT_EXPORT=true the build targets GitHub Pages (static export).
// All other environments (local dev, Vercel) use the default SSR mode.
const isStaticExport = process.env.NEXT_EXPORT === 'true';

const nextConfig: NextConfig = {
  ...(isStaticExport && {
    output: 'export',
    basePath: '/living-sketch',
    assetPrefix: '/living-sketch',
    trailingSlash: true,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
