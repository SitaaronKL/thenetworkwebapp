import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, interestedInBeta, obsession } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const normalizedEmail = email.trim().toLowerCase();

    // Get the glowdown party entry for tracking
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('id, slug, title, venue_address, event_time')
      .eq('slug', 'glowdown')
      .eq('status', 'published')
      .single();

    // Fallback to hardcoded values if party not found (for backwards compatibility)
    const partyDetails = party ? {
      id: party.id,
      title: party.title,
      venueAddress: party.venue_address || '122 Whitney Avenue',
      eventTime: party.event_time ? formatTime(party.event_time) : '10:00pm',
    } : {
      id: null,
      title: 'GlowDown',
      venueAddress: '122 Whitney Avenue',
      eventTime: '10:00pm',
    };

    // Check if email already exists on waitlist
    const { data: existingEntry } = await supabase
      .rpc('get_waitlist_entry_by_email', { p_email: normalizedEmail });

    let waitlistId: string;
    let ticketCode: string | null = null;

    if (existingEntry && existingEntry.length > 0) {
      // User already exists - update their entry
      waitlistId = existingEntry[0].id;
      
      // Check if they already have a ticket
      const { data: existingWaitlist } = await supabase
        .from('waitlist')
        .select('party_ticket_code')
        .eq('id', waitlistId)
        .single();

      if (existingWaitlist?.party_ticket_code) {
        ticketCode = existingWaitlist.party_ticket_code;
      } else {
        // Generate new ticket code
        ticketCode = generateTicketCode();
        
        // Use the secure function to update (bypasses RLS but validates email)
        // Set school to 'McMaster University' for GlowDown registrations
        const { data: updateSuccess, error: updateError } = await supabase
          .rpc('update_waitlist_party_info', {
            p_waitlist_id: waitlistId,
            p_email: normalizedEmail,
            p_party_id: partyDetails.id,
            p_party_ticket_code: ticketCode,
            p_interested_in_beta: interestedInBeta || false,
            p_school: 'McMaster University',
            p_obsession: obsession?.trim() || null,
          });

        if (updateError || !updateSuccess) {
          console.error('Error updating waitlist entry with party info:', updateError);
          // Don't throw - entry exists, just without party info
          // It will still show up in queries by campaign_code
        }
      }
    } else {
      // Create new waitlist entry with party info included (avoids RLS update issue)
      ticketCode = generateTicketCode();
      
      // Use the glowdown-specific function that sets party_id and ticket_code during insert
      // If function doesn't exist yet, fallback to regular create + update
      const { data: result, error: insertError } = await supabase
        .rpc('create_glowdown_waitlist_entry', {
          p_name: name.trim(),
          p_email: normalizedEmail,
          p_interested_in_beta: interestedInBeta || false,
          p_party_id: partyDetails.id,
          p_party_ticket_code: ticketCode,
          p_obsession: obsession?.trim() || null,
        });

      if (insertError) {
        // If function doesn't exist, fallback to old method
        if (insertError.message?.includes('function') || insertError.code === '42883') {
          console.warn('create_glowdown_waitlist_entry function not found, using fallback method');
          
          // Fallback: use regular create_waitlist_entry
          // Set school to 'McMaster University' for GlowDown registrations
          const { data: fallbackResult, error: fallbackError } = await supabase
            .rpc('create_waitlist_entry', {
              p_name: name.trim(),
              p_email: normalizedEmail,
              p_school: 'McMaster University',
              p_campaign_code: 'glowdown',
              p_campaign_id: null,
              p_referred_by_code: null,
              p_interested_in_beta: interestedInBeta || false,
            });

          if (fallbackError) {
            console.error('Error creating waitlist entry (fallback):', fallbackError);
            throw fallbackError;
          }

          if (!fallbackResult || fallbackResult.length === 0) {
            throw new Error('Failed to create waitlist entry');
          }

          waitlistId = fallbackResult[0].id;

          // Try to update using the update function
          // Set school to 'McMaster University' for GlowDown registrations
          const { data: updateSuccess, error: updateError } = await supabase
            .rpc('update_waitlist_party_info', {
              p_waitlist_id: waitlistId,
              p_email: normalizedEmail,
              p_party_id: partyDetails.id,
              p_party_ticket_code: ticketCode,
              p_interested_in_beta: null, // Already set
              p_school: 'McMaster University',
              p_obsession: obsession?.trim() || null,
            });

          if (updateError || !updateSuccess) {
            console.warn('Could not set party info on waitlist entry:', updateError);
            // Entry still created, just without party_id - will show up in campaign_code queries
          }
        } else {
          console.error('Error creating glowdown waitlist entry:', insertError);
          throw insertError;
        }
      } else if (!result || result.length === 0) {
        throw new Error('Failed to create waitlist entry');
      } else {
        waitlistId = result[0].id;
        // Party info and ticket code are already set by the function, no update needed
      }
    }

    // Send email with ticket code via Supabase Edge Function
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseAnonKey) {
        const functionResponse = await fetch(`${supabaseUrl}/functions/v1/send-ticket-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            email: normalizedEmail,
            name: name.trim(),
            ticketCode: ticketCode,
            partyTitle: partyDetails.title,
            venueAddress: partyDetails.venueAddress,
            eventTime: partyDetails.eventTime,
          }),
        });

        if (!functionResponse.ok) {
          const errorText = await functionResponse.text();
          console.error('Email function error:', errorText);
        }
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      ticketCode,
      waitlistId,
    });
  } catch (error: any) {
    console.error('Error in glowdown registration:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateTicketCode(): string {
  // Generate an 8-character alphanumeric code (similar to party RSVP ticket codes)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function formatTime(timeString: string): string {
  // Convert TIME format (HH:MM:SS) to readable format (10:00pm)
  if (!timeString) return '10:00pm';
  
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes}${ampm}`;
}

