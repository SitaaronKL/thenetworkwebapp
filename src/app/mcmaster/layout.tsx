import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Network Pitch | McMaster',
  description: 'What\'s good, Mac! Introducing The Network — a platform that understands your true interests and connects you with meaningful communities.',
};

export default function McMasterLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
