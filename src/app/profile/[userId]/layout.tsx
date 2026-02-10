import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';

type Props = {
  params: Promise<{ userId: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;

  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, bio, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    const name = profile?.full_name || 'TheNetwork User';
    const description =
      profile?.bio || `Connect with ${name} on TheNetwork`;

    let imageUrl = '/favicon.png';
    if (profile?.avatar_url) {
      if (profile.avatar_url.startsWith('http')) {
        imageUrl = profile.avatar_url;
      } else {
        const { data: urlData } = supabase.storage
          .from('profile-images')
          .getPublicUrl(profile.avatar_url);
        if (urlData?.publicUrl) {
          imageUrl = urlData.publicUrl;
        }
      }
    }

    return {
      title: `${name} | TheNetwork`,
      description,
      openGraph: {
        title: `${name} on TheNetwork`,
        description,
        images: [{ url: imageUrl, width: 400, height: 400 }],
        type: 'profile',
      },
      twitter: {
        card: 'summary',
        title: `${name} on TheNetwork`,
        description,
        images: [imageUrl],
      },
    };
  } catch {
    return {
      title: 'TheNetwork Profile',
      description: 'Connect on TheNetwork',
    };
  }
}

export default function ProfileLayout({ children }: Props) {
  return <>{children}</>;
}
