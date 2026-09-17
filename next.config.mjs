/** @type {import('next').NextConfig} */
const nextConfig = {
  // `standalone` emite un servidor autocontenido (`.next/standalone/server.js`) que usa el
  // Dockerfile para la imagen publicada en GHCR. `next dev` y `next start` no cambian.
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
