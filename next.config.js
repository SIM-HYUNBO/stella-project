/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  customWorkerDir: "worker", // ← 커스텀 워커 폴더 지정
});

module.exports = withPWA({
  reactStrictMode: true,
  swcMinify: true,
});