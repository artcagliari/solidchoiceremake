import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Comentar output: 'export' para rodar com APIs (Vercel/servidor Node.js)
  // Descomentar para build estático (Hostgator compartilhada)
  // output: 'export',
  images: {
    unoptimized: false, // Mude para true se usar build estático
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zdqpkbiydrfoojlnaaux.supabase.co",
      },
    ],
  },
};

export default nextConfig;
