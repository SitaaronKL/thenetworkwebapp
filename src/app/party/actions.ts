'use server';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ADMIN_PASSWORD = 'Superman1234@';

export async function getPartyAdminData(password: string) {
  if (password !== ADMIN_PASSWORD) {
    return { error: 'Invalid password' };
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing');
    return { error: 'Service configuration error. Check server logs.' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get all parties
    const { data: parties, error: partiesError } = await supabase
      .from('parties')
      .select('*')
      .order('created_at', { ascending: false });

    if (partiesError) throw partiesError;

    return { data: { parties: parties || [] } };
  } catch (error: any) {
    console.error('Get Party Admin Data Error:', error);
    return { error: error.message || 'Failed to load parties' };
  }
}

export async function getPartyStats(password: string, partyId: string) {
  if (password !== ADMIN_PASSWORD) {
    return { error: 'Invalid password' };
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Service configuration error' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get party slug to also match by campaign_code
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('slug')
      .eq('id', partyId)
      .single();

    if (partyError) {
      console.error('Party error:', partyError);
      // If party lookup fails, try to get slug from a direct query
      const { data: partyFallback } = await supabase
        .from('parties')
        .select('slug')
        .eq('id', partyId)
        .single();
      if (partyFallback) {
        console.log('Found party via fallback query:', partyFallback);
      }
    }
    let partySlug = party?.slug || '';
    
    // Fallback: if no slug found but we know this is glowdown party, use 'glowdown'
    // This handles cases where party lookup failed
    if (!partySlug) {
      // Try to infer from party ID or check if there are any glowdown entries
      const { data: checkParty } = await supabase
        .from('parties')
        .select('slug')
        .eq('id', partyId)
        .single();
      partySlug = checkParty?.slug || '';
    }
    
    console.log('Party slug for matching:', partySlug, 'Party ID:', partyId);

    // Get RSVP counts from party_rsvps table
    const { data: rsvps, error: rsvpError } = await supabase
      .from('party_rsvps')
      .select('status, ticket_code')
      .eq('party_id', partyId);

    if (rsvpError) throw rsvpError;
    console.log('Authenticated RSVPs count:', rsvps?.length || 0);

    // Get waitlist entries linked to this party
    // Query by party_id OR campaign_code matching party slug (or 'glowdown' as fallback)
    let waitlistRsvps: any[] = [];
    
    // Use party slug if available, otherwise try 'glowdown' as fallback
    const campaignCodeToMatch = partySlug || 'glowdown';
    
    // Query entries with party_id OR campaign_code matching
    const { data: allWaitlistEntries, error: waitlistError } = await supabase
      .from('waitlist')
      .select('id, name, email, party_ticket_code, created_at, campaign_code, party_id')
      .or(`party_id.eq.${partyId},campaign_code.eq.${campaignCodeToMatch}`)
      .order('created_at', { ascending: false });
    
    if (waitlistError) {
      console.error('Waitlist query error:', waitlistError);
    } else {
      waitlistRsvps = allWaitlistEntries || [];
      console.log('Total waitlist entries found:', waitlistRsvps.length);
      console.log('Entries with party_id:', waitlistRsvps.filter((w: any) => w.party_id === partyId).length);
      console.log(`Entries with campaign_code '${campaignCodeToMatch}':`, waitlistRsvps.filter((w: any) => w.campaign_code === campaignCodeToMatch).length);
    }
    
    // Remove duplicates by id (in case an entry matches both conditions)
    const waitlistRsvpsMap = new Map();
    waitlistRsvps.forEach((entry: any) => {
      if (!waitlistRsvpsMap.has(entry.id)) {
        waitlistRsvpsMap.set(entry.id, entry);
      }
    });
    waitlistRsvps = Array.from(waitlistRsvpsMap.values()).sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    console.log('Final deduplicated waitlist RSVPs:', waitlistRsvps.length);

    // Backfill missing ticket codes for entries without them
    const entriesNeedingTickets = waitlistRsvps.filter((w: any) => !w.party_ticket_code);
    if (entriesNeedingTickets.length > 0) {
      // Generate ticket codes for entries missing them
      const generateTicketCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      // Update entries in batch
      for (const entry of entriesNeedingTickets) {
        let ticketCode = generateTicketCode();
        let attempts = 0;
        let updateError: any = null;
        
        // Retry if we hit a unique constraint violation
        while (attempts < 5) {
          const { error } = await supabase
            .from('waitlist')
            .update({ 
              party_ticket_code: ticketCode,
              party_id: partyId // Also ensure party_id is set
            })
            .eq('id', entry.id);
          
          if (!error) {
            updateError = null;
            break;
          }
          
          // If it's a unique constraint error, generate a new code and retry
          if (error.code === '23505' || error.message?.includes('unique')) {
            ticketCode = generateTicketCode();
            attempts++;
          } else {
            updateError = error;
            break;
          }
        }
        
        if (!updateError) {
          // Update the local copy
          entry.party_ticket_code = ticketCode;
        } else {
          console.error(`Failed to backfill ticket code for entry ${entry.id}:`, updateError);
        }
      }
      
      // Re-sort after updates
      waitlistRsvps = waitlistRsvps.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    // Calculate stats including both party_rsvps and waitlist entries
    const waitlistCount = waitlistRsvps?.length || 0;
    const authenticatedCount = rsvps?.length || 0;
    
    const stats = {
      party_id: partyId,
      total_rsvps: authenticatedCount + waitlistCount,
      going_count: (rsvps?.filter((r: any) => r.status === 'going').length || 0) + waitlistCount, // All waitlist entries are "going"
      maybe_count: rsvps?.filter((r: any) => r.status === 'maybe').length || 0,
      declined_count: rsvps?.filter((r: any) => r.status === 'declined').length || 0,
      with_tickets: (rsvps?.filter((r: any) => r.ticket_code).length || 0) + (waitlistRsvps?.filter((w: any) => w.party_ticket_code).length || 0),
    };

    // Get detailed RSVP list with user info
    const { data: detailedRsvps, error: detailError } = await supabase
      .from('party_rsvps')
      .select('id, user_id, status, ticket_code, rsvped_at, source')
      .eq('party_id', partyId)
      .order('rsvped_at', { ascending: false });

    if (detailError) throw detailError;

    // Get user profiles separately to avoid join issues
    const userIds = detailedRsvps?.map((r: any) => r.user_id).filter(Boolean) || [];
    const userProfiles: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      
      if (!profilesError && profiles) {
        profiles.forEach((p: any) => {
          userProfiles[p.id] = p;
        });
      }
    }

    // Combine both sources
    const details: any[] = [];

    // Add authenticated user RSVPs
    detailedRsvps?.forEach((rsvp: any) => {
      const profile = rsvp.user_id ? userProfiles[rsvp.user_id] : null;
      details.push({
        id: rsvp.id,
        user_id: rsvp.user_id,
        status: rsvp.status,
        ticket_code: rsvp.ticket_code,
        rsvped_at: rsvp.rsvped_at,
        source: rsvp.source,
        user_name: profile?.full_name || null,
        user_email: profile?.email || null,
        waitlist_name: null,
        waitlist_email: null,
      });
    });

    // Add waitlist RSVPs (non-authenticated)
    waitlistRsvps?.forEach((waitlist: any) => {
      details.push({
        id: `waitlist-${waitlist.id}`, // Use actual waitlist id
        waitlist_id: waitlist.id, // Store actual id for deletion
        user_id: null,
        status: 'going',
        ticket_code: waitlist.party_ticket_code,
        rsvped_at: waitlist.created_at,
        source: 'waitlist',
        user_name: null,
        user_email: null,
        waitlist_name: waitlist.name,
        waitlist_email: waitlist.email,
      });
    });

    return {
      data: {
        stats,
        rsvps: details,
      },
    };
  } catch (error: any) {
    console.error('Get Party Stats Error:', error);
    return { error: error.message || 'Failed to load party stats' };
  }
}

export async function deleteRsvp(password: string, rsvpId: string, source: string, waitlistId?: string, email?: string) {
  if (password !== ADMIN_PASSWORD) {
    return { error: 'Invalid password' };
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Service configuration error' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (source === 'waitlist') {
      // Delete from waitlist table - use waitlist_id if available, otherwise use email
      if (waitlistId) {
        const { error: deleteError } = await supabase
          .from('waitlist')
          .delete()
          .eq('id', waitlistId);

        if (deleteError) throw deleteError;
      } else if (email) {
        const { error: deleteError } = await supabase
          .from('waitlist')
          .delete()
          .eq('email', email.toLowerCase());

        if (deleteError) throw deleteError;
      } else {
        return { error: 'Missing waitlist ID or email for deletion' };
      }
    } else {
      // Delete from party_rsvps table
      const { error: deleteError } = await supabase
        .from('party_rsvps')
        .delete()
        .eq('id', rsvpId);

      if (deleteError) throw deleteError;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Delete RSVP Error:', error);
    return { error: error.message || 'Failed to delete RSVP' };
  }
}
