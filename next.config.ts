import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [],
  // Development server configuration for ngrok
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://specialistic-annabella-unsabled.ngrok-free.dev',
          },
        ],
      },
    ];
  },
  // Exclude MCP server files from build
  outputFileTracingExcludes: {
    '*': [
      'mcp-servers/**',
      '**/*.mcp.js',
      '**/*.mcp.ts'
    ]
  }
};

export default nextConfig;
