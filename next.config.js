/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Let Cloudflare edge workers natively optimize delivery caching
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async rewrites() {
    const supabaseId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || 'sfqnaftcpuoyftpjgxbb';
    return [
      {
        source: '/assets/products/:path*',
        destination: `https://${supabaseId}.supabase.co/storage/v1/object/public/abaya-store-assets/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
