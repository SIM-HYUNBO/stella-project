/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: false,
  skipWaiting: true,
  customWorkerDir: "worker",
  disable: process.env.NODE_ENV !== "production",
  buildExcludes: [/manifest\.json$/],
  publicExcludes: ["!noprecache/**/*", "!**/*.다운로드", "!**/*_files/**", "!workbox-*.js*", "!worker-*.js*"],
});

module.exports = withPWA({
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@vladmandic/face-api"],
});