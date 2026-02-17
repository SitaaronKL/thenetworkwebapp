import { createClient } from '@/lib/supabase';

export const FRIEND_PARTY_SLUG = 'friend-party';

type AttendanceSource = 'link' | 'manual' | 'referral' | 'barcode';

type PartyLookup = {
  id: string;
};

let cachedPartyId: string | null = null;

async function resolveFriendPartyId() {
  if (cachedPartyId) return cachedPartyId;

  const supabase = createClient();

  const { data: publishedParty } = await supabase
    .rpc('get_party_by_slug', { p_slug: FRIEND_PARTY_SLUG })
    .maybeSingle<PartyLookup>();

  if (publishedParty?.id) {
    cachedPartyId = publishedParty.id;
    return cachedPartyId;
  }

  const { data: fallbackParty } = await supabase
    .from('parties')
    .select('id')
    .eq('slug', FRIEND_PARTY_SLUG)
    .limit(1)
    .maybeSingle<PartyLookup>();

  if (fallbackParty?.id) {
    cachedPartyId = fallbackParty.id;
    return cachedPartyId;
  }

  return null;
}

export async function ensureFriendPartyAttendance(source: AttendanceSource = 'link') {
  try {
    const partyId = await resolveFriendPartyId();
    if (!partyId) return false;

    const supabase = createClient();
    const { error } = await supabase.rpc('create_party_rsvp', {
      p_party_id: partyId,
      p_status: 'going',
      p_source: source,
      p_referrer_user_id: null,
    });

    return !error;
  } catch {
    return false;
  }
}
