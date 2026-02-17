import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import GlowdownBackground from "@/components/GlowdownBackground";

function resolveMetadataBase() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (!rawUrl) {
    return new URL("http://localhost:3000");
  }

  const normalized = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : `https://${rawUrl}`;

  try {
    return new URL(normalized);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: "TheNetwork",
  description: "The shortest path to the right people: a social network designed for real life.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: ["/favicon.png"],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
  openGraph: {
    title: "TheNetwork",
    description: "The shortest path to the right people: a social network designed for real life.",
    images: [{ url: "/favicon.png", width: 1024, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "TheNetwork",
    description: "The shortest path to the right people: a social network designed for real life.",
    images: ["/favicon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning style={{ backgroundColor: '#000000' }}>
      <body style={{ backgroundColor: '#000000' }}>
        <GlowdownBackground />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
