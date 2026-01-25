import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GlowDown Invitation | The Network',
  description: 'Pike presents GlowDown, brought to you by The Network. Accept the invite and bring a friend.',
};

export default function GlowdownInvitationLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
