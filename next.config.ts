import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * The CSP is deliberately strict: student work and uploaded documents are
 * untrusted input, so we do not want any path to script injection. Next.js
 * needs `unsafe-inline` for its inlined bootstrap styles and, in development,
 * `unsafe-eval` for React Refresh.
 */
const isDev = process.env.NODE_ENV === "development";

const supabaseOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
})();

const connectSrc = [
  "'self'",
  supabaseOrigin,
  supabaseOrigin ? supabaseOrigin.replace("https://", "wss://") : "",
  "https://api.revenuecat.com",
  "https://api.rc-backup.com",
]
  .filter(Boolean)
  .join(" ");

const contentSecurityPolicy = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' blob: data:`,
  `font-src 'self' data:`,
  `connect-src ${connectSrc}`,
  // Payment providers render their checkout inside a frame.
  `frame-src 'self' https://js.stripe.com https://hooks.stripe.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Hosts allowed to load dev resources.
   *
   * Next blocks cross-origin dev-chunk requests by default, and it treats
   * `127.0.0.1` and `localhost` as different origins. Opening the app on the
   * IP therefore blocked every script: React never hydrated, and forms fell
   * back to native submission.
   *
   * Development only; this has no effect on a production build.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost", "0.0.0.0"],

  // Never leak the framework version.
  poweredByHeader: false,

  serverExternalPackages: ["unpdf", "mammoth"],

  experimental: {
    // Uploaded documents are parsed server-side and can be a few MB.
    serverActions: { bodySizeLimit: "2mb" },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
