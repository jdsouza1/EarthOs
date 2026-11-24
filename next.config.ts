import type { NextConfig } from 'next';

// Security headers. The site is static: no logins or forms. Pages may not be shown inside other sites,
// except the indicator cards under /embed, which exist to be embedded (stricter rules of their own below).
// 'unsafe-inline' is needed for Next.js's inline page data and the theme script in app/layout.tsx.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

// /embed/<id>: a self-contained card with inline styles only. No scripts, no outside requests, any site may frame it.
const embedCsp = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src 'self' data:",
  'frame-ancestors *',
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const embedHeaders = [
  { key: 'Content-Security-Policy', value: embedCsp },
  ...securityHeaders.filter((h) => h.key !== 'Content-Security-Policy' && h.key !== 'X-Frame-Options'),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path((?!embed/).*)', headers: securityHeaders },
      { source: '/embed/:path*', headers: embedHeaders },
      // Downloads on the Use the data page: any site or app may read them.
      { source: '/data/:path+', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }] },
    ];
  },
};

export default nextConfig;
