import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import GlowdownBackground from "@/components/GlowdownBackground";

export const metadata: Metadata = {
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
