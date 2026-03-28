import "./globals.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crypto Grapher - Interactive Cryptographic Visualization",
  description: "Explore 29+ cryptographic algorithms with interactive 3D visualizations. Watch AES, RSA, SHA-256, and more execute step by step.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Crypto Grapher",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0f] text-white antialiased" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
