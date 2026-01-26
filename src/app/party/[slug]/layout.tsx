import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';

type Props = {
    params: Promise<{ slug: string }>;
};

interface PartyMetadata {
    title: string;
    description: string | null;
    presenter_name: string | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: party } = await supabase
        .rpc('get_party_by_slug', { p_slug: slug })
        .single();

    if (!party) {
        return { title: 'Party Not Found | The Network' };
    }

    const partyData = party as PartyMetadata;

    return {
        title: `${partyData.title} | The Network`,
        description: partyData.description || `${partyData.presenter_name} presents ${partyData.title}. Accept the invite and bring a friend.`,
    };
}

export default function PartyLayout({
    children,
}: { children: React.ReactNode }) {
    return <>{children}</>;
}
