import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Party Invitation | You're Invited",
  description: "You're invited to a party at 19 Kingsmount St S. February 28, 10 PM. BYOB. RSVP by February 25.",
};

export default function FriendPartyLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
