import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle for a small Docker image.
  output: "standalone",
};

// Sentry's build plugin only uploads source maps when SENTRY_AUTH_TOKEN is set;
// otherwise it is a no-op wrapper, so this is safe with no Sentry account.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
