/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  customWorkerDir: "worker",
  disable: false, // 개발 모드에서도 서비스 워커 활성화
});

module.exports = withPWA({
  reactStrictMode: true,
  swcMinify: true,
});