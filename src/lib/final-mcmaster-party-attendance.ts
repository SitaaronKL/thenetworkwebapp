import { createClient } from '@/lib/supabase';

export const FINAL_MCMASTER_PARTY_SLUG = 'final-mcmaster-party';

type AttendanceSource = 'link' | 'manual' | 'referral' | 'barcode';

type PartyLookup = {
  id: string;
};

let cachedPartyId: string | null = null;

async function resolveFinalMcmasterPartyId() {
  if (cachedPartyId) return cachedPartyId;

  const supabase = createClient();

  const { data: publishedParty } = await supabase
    .rpc('get_party_by_slug', { p_slug: FINAL_MCMASTER_PARTY_SLUG })
    .maybeSingle<PartyLookup>();

  if (publishedParty?.id) {
    cachedPartyId = publishedParty.id;
    return cachedPartyId;
  }

  const { data: fallbackParty } = await supabase
    .from('parties')
    .select('id')
    .eq('slug', FINAL_MCMASTER_PARTY_SLUG)
    .limit(1)
    .maybeSingle<PartyLookup>();

  if (fallbackParty?.id) {
    cachedPartyId = fallbackParty.id;
    return cachedPartyId;
  }

  return null;
}

export async function ensureFinalMcmasterPartyAttendance(source: AttendanceSource = 'link') {
  try {
    const partyId = await resolveFinalMcmasterPartyId();
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
