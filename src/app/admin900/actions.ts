'use server'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function getAdminData(password: string) {
  if (password !== 'Ironman1234@') {
    return { error: 'Invalid password' }
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is missing')
      return { error: 'Service configuration error. Check server logs.' }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // 1. Waitlist Count
    const { count: waitlistCount, error: countError } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })

    if (countError) throw countError

    // 1b. Profiles Count (actual users on the webapp)
    const { count: profilesCount, error: profilesError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (profilesError) throw profilesError

    // Total users = waitlist + profiles
    const totalCount = (waitlistCount || 0) + (profilesCount || 0)

    // 2. Today's Count
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const { count: todayCount, error: todayError } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())

    if (todayError) throw todayError

    // 3. Growth over time (Last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentData, error: recentError } = await supabase
      .from('waitlist')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (recentError) throw recentError

    // 4. Acquisition Sources (All time)
    // We fetch just the campaign_code to aggregate
    const { data: sourceData, error: sourceError } = await supabase
      .from('waitlist')
      .select('campaign_code, referred_by_code')
    
    if (sourceError) throw sourceError

    const sources: Record<string, number> = {}
    sourceData.forEach(item => {
        // If they have a referred_by_code, count it as "Referral"
        // If they have a campaign_code, use that
        // Otherwise Direct
        let source = 'Direct / Unknown'
        if (item.referred_by_code) {
            source = 'Referral'
        } else if (item.campaign_code) {
            source = item.campaign_code
        }
        sources[source] = (sources[source] || 0) + 1
    })

    // Calculate percentages based on totalCount (waitlist + profiles) so they add up to 100%
    const sourceList = Object.entries(sources)
      .map(([source, count]) => ({ 
          source, 
          count, 
          percentage: totalCount ? ((count / totalCount) * 100).toFixed(1) : '0' 
      }))
      .sort((a, b) => b.count - a.count)
    
    // Add profiles as a separate source category so we can see where all users came from
    if (profilesCount && profilesCount > 0) {
      sourceList.push({
        source: 'Direct Signup (Profiles)',
        count: profilesCount,
        percentage: totalCount ? ((profilesCount / totalCount) * 100).toFixed(1) : '0'
      })
      // Re-sort after adding profiles
      sourceList.sort((a, b) => b.count - a.count)
    }

    // 5. Recent Signups Table
    const { data: recentSignups, error: signupsError } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (signupsError) throw signupsError

    return {
      success: true,
      data: {
        totalCount: totalCount || 0,
        waitlistCount: waitlistCount || 0,
        profilesCount: profilesCount || 0,
        todayCount: todayCount || 0,
        recentData: recentData || [],
        sourceList,
        recentSignups
      }
    }

  } catch (error: any) {
    console.error('Admin Data Fetch Error:', error)
    return { error: error.message || 'Failed to fetch data' }
  }
}
