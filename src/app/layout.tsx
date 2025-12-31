import type { Metadata } from "next";
import { Bebas_Neue, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const bebas = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Solid Choice",
  description: "Solid Choice — experiência completa de catálogo, cotação e pedidos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${sora.variable} ${bebas.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
