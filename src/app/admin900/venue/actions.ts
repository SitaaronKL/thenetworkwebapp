'use server'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ADMIN_PASSWORD = 'Ironman1234@'

export async function getDinnersAwaitingVenue(password: string) {
  if (password !== ADMIN_PASSWORD) {
    return { error: 'Invalid password' }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // Fetch dinners in picking_time with no venue
    const { data: dinners, error: dinnersError } = await supabase
      .from('dnnrs_dinners')
      .select('*')
      .eq('status', 'picking_time')
      .is('venue_name', null)
      .order('created_at', { ascending: true })

    if (dinnersError) throw dinnersError

    // For each dinner, get host profile and accepted participant count
    const enriched = await Promise.all(
      (dinners || []).map(async (dinner) => {
        // Host profile
        const { data: hostProfile } = await supabase
          .from('dnnrs_profiles')
          .select('display_name, first_name, last_name')
          .eq('user_id', dinner.host_id)
          .maybeSingle()

        const hostName = hostProfile
          ? (hostProfile.first_name && hostProfile.last_name
              ? `${hostProfile.first_name} ${hostProfile.last_name}`
              : hostProfile.display_name || 'Unknown')
          : 'Unknown'

        // Accepted count
        const { count } = await supabase
          .from('dnnrs_participants')
          .select('*', { count: 'exact', head: true })
          .eq('dinner_id', dinner.id)
          .eq('status', 'accepted')

        return {
          id: dinner.id,
          vibe: dinner.vibe,
          date: dinner.date,
          area: dinner.area,
          maxSize: dinner.max_size,
          hostName,
          acceptedCount: count || 0,
          createdAt: dinner.created_at,
        }
      })
    )

    return { data: enriched }
  } catch (error: any) {
    console.error('getDinnersAwaitingVenue error:', error)
    return { error: error.message || 'Failed to fetch dinners' }
  }
}

export async function setVenue(
  password: string,
  dinnerId: string,
  venueName: string,
  address: string
) {
  if (password !== ADMIN_PASSWORD) {
    return { error: 'Invalid password' }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // Call the set_venue RPC
    const { error: rpcError } = await supabase.rpc('set_venue', {
      p_dinner_id: dinnerId,
      p_venue_name: venueName,
      p_address: address,
    })

    if (rpcError) throw rpcError

    // Get accepted participants to notify
    const { data: participants } = await supabase
      .from('dnnrs_participants')
      .select('user_id')
      .eq('dinner_id', dinnerId)
      .eq('status', 'accepted')

    if (participants && participants.length > 0) {
      // Get dinner info for the notification message
      const { data: dinner } = await supabase
        .from('dnnrs_dinners')
        .select('vibe, date')
        .eq('id', dinnerId)
        .single()

      const dateStr = dinner
        ? new Date(dinner.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : ''

      const vibe = dinner?.vibe || ''

      // Create in-app notifications and push queue entries for each participant
      for (const p of participants) {
        await supabase.from('dnnrs_notifications').insert({
          user_id: p.user_id,
          type: 'dinner_venue_suggested',
          dinner_id: dinnerId,
          metadata: {},
        })

        await supabase.from('dnnrs_push_queue').insert({
          receiver_id: p.user_id,
          title: 'Ari found a spot!',
          body: `${venueName} for your ${vibe} dinner on ${dateStr}`,
          data: {
            type: 'dinner_venue_suggested',
            dinner_id: dinnerId,
          },
        })
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('setVenue error:', error)
    return { error: error.message || 'Failed to set venue' }
  }
}
