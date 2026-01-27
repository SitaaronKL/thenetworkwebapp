'use server'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TZ_EST = 'America/New_York'

/** Start of today 00:00 in America/New_York as ISO string (UTC). Uses 5h offset for EST; ~1h drift possible in EDT. */
function getStartOfTodayEST(): string {
  const n = new Date()
  const [y, m, d] = n.toLocaleDateString('en-CA', { timeZone: TZ_EST }).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0)).toISOString()
}

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

    // 2. "New Today" = waitlist signups since start of today EST (00:00 America/New_York)
    const startOfTodayEST = getStartOfTodayEST()
    const { count: todayCount, error: todayError } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfTodayEST)

    if (todayError) throw todayError

    // 3. Growth over time (Last 30 days) — bucketing uses EST in the UI
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentData, error: recentError } = await supabase
      .from('waitlist')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (recentError) throw recentError

    // 4. Acquisition Sources (All time) + referral metrics. Fetch all for accurate aggregation.
    const { data: sourceData, error: sourceError } = await supabase
      .from('waitlist')
      .select('campaign_code, referred_by_code')
      .limit(50000)

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
    // Note: We fetch a large number of signups so filtering by school works accurately
    // The limit is high enough to include all users when filtering by school
    const { data: recentSignups, error: signupsError } = await supabase
      .from('waitlist')
      .select('*, interested_in_beta, beta_status')
      .order('created_at', { ascending: false })
      .limit(10000) // Large limit to ensure accurate school filtering

    if (signupsError) throw signupsError

    // 5b. Beta Testers - users interested in being beta testers
    const { data: betaTesters, count: betaTestersCount, error: betaError } = await supabase
      .from('waitlist')
      .select('id, name, email, school, created_at, beta_status', { count: 'exact' })
      .eq('interested_in_beta', true)
      .order('created_at', { ascending: false })

    if (betaError) {
      console.warn('Beta testers fetch warning:', betaError)
    }

    // 6. AB Campaign Analytics
    const { data: campaignAnalytics, error: campaignError } = await supabase
      .from('ab_marketing_campaigns')
      .select('id, campaign_code, campaign_name, school, variant, is_active, created_at')
      .order('created_at', { ascending: false })

    // Don't throw on campaign error - it's okay if the table doesn't have the new columns yet
    if (campaignError) {
      console.warn('Campaign analytics fetch warning:', campaignError)
    }

    // Get signup counts per campaign
    const campaignSignupCounts: Record<string, number> = {}
    sourceData.forEach(item => {
      if (item.campaign_code) {
        campaignSignupCounts[item.campaign_code] = (campaignSignupCounts[item.campaign_code] || 0) + 1
      }
    })

    // Merge signup counts with campaign data
    const campaignsWithStats = (campaignAnalytics || []).map(campaign => ({
      ...campaign,
      signup_count: campaignSignupCounts[campaign.campaign_code] || 0,
    }))

    // --- New metrics ---
    const totalReferrals = (sourceData || []).filter((i: any) => i.referred_by_code).length
    const referrersSet = new Set((sourceData || []).filter((i: any) => i.referred_by_code).map((i: any) => i.referred_by_code))
    const referrersCount = referrersSet.size

    const { count: betaInterested } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('interested_in_beta', true)
    const betaAcceptedPct = (totalCount != null && totalCount > 0 && betaInterested != null)
      ? ((betaInterested / totalCount) * 100).toFixed(1) : '0'

    const { count: withInviteCode } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .not('invite_code', 'is', null)
    const shareInvitePct = (withInviteCode != null && withInviteCode > 0)
      ? ((referrersCount / withInviteCode) * 100).toFixed(1) : '0'

    const avgReferralsPerUser = (waitlistCount != null && waitlistCount > 0)
      ? (totalReferrals / waitlistCount).toFixed(2) : '0'

    const { data: schoolTimeTo20, error: timeTo20Err } = await supabase.rpc('get_school_time_to_20')
    if (timeTo20Err) console.warn('get_school_time_to_20 warning:', timeTo20Err)

    // Calculate school counts from both waitlist and profiles
    // Fetch all data to ensure we count everything (not limited by recentSignups limit)
    const { data: waitlistSchools } = await supabase
      .from('waitlist')
      .select('school')
      .not('school', 'is', null)
    
    const { data: profileSchools } = await supabase
      .from('profiles')
      .select('school')
      .not('school', 'is', null)

    // Collect all schools (including duplicates for accurate counting)
    const allSchools: string[] = []
    if (waitlistSchools) {
      waitlistSchools.forEach((item: any) => {
        const school = String(item.school || '').trim()
        if (school) allSchools.push(school)
      })
    }
    if (profileSchools) {
      profileSchools.forEach((item: any) => {
        const school = String(item.school || '').trim()
        if (school) allSchools.push(school)
      })
    }
    
    // Normalization map for known school variations
    const schoolNormalization: Record<string, string> = {
      'mcmaster': 'McMaster University',
      'mcmaster university': 'McMaster University',
      'mcmaster uni': 'McMaster University',
      'hunter college': 'Hunter College',
      'cuny hunter college': 'Hunter College',
      'cuny hunter': 'Hunter College',
      'columbia': 'Columbia University',
      'columbia university': 'Columbia University',
      'columbia uni': 'Columbia University',
      'rutgers': 'Rutgers University',
      'rutgers university': 'Rutgers University',
      'rutgers uni': 'Rutgers University',
      'baruch college': 'Baruch College',
      'cuny baruch': 'Baruch College',
    }

    // Helper function to detect and fix duplicate words in school names
    function fixDuplicateWords(name: string): string {
      // First, fix cases where words are concatenated without spaces (e.g., "McMasterMcMaster")
      let fixed = name.replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
      
      // Then remove duplicate consecutive words
      const words = fixed.split(/\s+/)
      const seen = new Set<string>()
      const cleaned: string[] = []
      
      for (const word of words) {
        const wordLower = word.toLowerCase()
        if (!seen.has(wordLower)) {
          seen.add(wordLower)
          cleaned.push(word)
        }
      }
      
      return cleaned.join(' ')
    }

    // Helper function to get canonical name
    function getCanonicalName(school: string): string {
      const trimmed = school.trim()
      const normalized = trimmed.toLowerCase()
      
      // Check normalization map first
      if (schoolNormalization[normalized]) {
        return schoolNormalization[normalized]
      }
      
      // Check for partial matches
      for (const [key, canonical] of Object.entries(schoolNormalization)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          return canonical
        }
      }
      
      // Fix duplicate words (e.g., "McMasterMcMaster University" -> "McMaster University")
      const fixed = fixDuplicateWords(trimmed)
      
      // Return properly capitalized version
      return fixed.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    }

    // Group schools by finding canonical names
    // Map: canonical key (lowercase) -> { displayName, schools[] }
    const schoolGroups = new Map<string, { displayName: string; schools: string[] }>()
    
    // Process each school and assign to a group
    allSchools.forEach((school) => {
      const trimmed = school.trim()
      if (!trimmed) return
      
      // Get canonical name (this will fix duplicates and normalize)
      const canonicalName = getCanonicalName(trimmed)
      const normalized = canonicalName.toLowerCase()
      
      let assigned = false
      
      // Check if this school matches any existing canonical name
      for (const [canonicalKey, group] of schoolGroups.entries()) {
        // Match if one contains the other (case-insensitive)
        if (canonicalKey.includes(normalized) || normalized.includes(canonicalKey)) {
          group.schools.push(trimmed)
          // Update display name to canonical name (prefer canonical over raw)
          if (canonicalName !== trimmed && !group.displayName.includes(canonicalName)) {
            // Use canonical name if it's better formatted
            group.displayName = canonicalName
          } else if (trimmed.length > group.displayName.length && !trimmed.match(/(\w+)\1/i)) {
            // Only update if longer AND doesn't have duplicate words
            group.displayName = trimmed
          }
          assigned = true
          break
        }
      }
      
      // If no match, create new group with canonical name
      if (!assigned) {
        schoolGroups.set(normalized, {
          displayName: canonicalName,
          schools: [trimmed]
        })
      }
    })
    
    // Convert to count map - ensure no duplicates in display names
    const schoolCounts: Record<string, number> = {}
    const seenDisplayNames = new Set<string>()
    
    schoolGroups.forEach((group) => {
      const displayLower = group.displayName.toLowerCase()
      // If we've seen this display name (case-insensitive), merge counts
      if (seenDisplayNames.has(displayLower)) {
        // Find existing entry and add to it
        const existingKey = Object.keys(schoolCounts).find(k => 
          k.toLowerCase() === displayLower
        )
        if (existingKey) {
          schoolCounts[existingKey] += group.schools.length
        }
      } else {
        schoolCounts[group.displayName] = group.schools.length
        seenDisplayNames.add(displayLower)
      }
    })

    // Convert to array, sort by count (descending), and add rank
    const schoolStats = Object.entries(schoolCounts)
      .map(([school, count]) => ({ school, count }))
      .sort((a, b) => b.count - a.count)
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }))

    // Calculate "Schools Reached" - distinct schools after normalization
    // This should match the count in schoolStats (which uses the same normalization)
    const schoolsReached = schoolStats.length

    // Find top 3 schools closest to 20 users (but under 20)
    const schoolsUnder20 = schoolStats
      .filter(s => s.count < 20)
      .sort((a, b) => b.count - a.count) // Sort by count descending (closest to 20 first)
      .slice(0, 3)

    return {
      success: true,
      data: {
        totalCount: totalCount || 0,
        waitlistCount: waitlistCount || 0,
        profilesCount: profilesCount || 0,
        todayCount: todayCount || 0,
        recentData: recentData || [],
        sourceList,
        recentSignups,
        campaignAnalytics: campaignsWithStats,
        betaTesters: betaTesters || [],
        betaTestersCount: betaTestersCount || 0,
        timeZone: TZ_EST,
        betaAcceptedPct,
        shareInvitePct,
        avgReferralsPerUser,
        schoolsReached,
        schoolTimeTo20: schoolTimeTo20 || [],
        schoolStats: schoolStats || [],
        top3ClosestTo20: schoolsUnder20 || [],
      }
    }

  } catch (error: any) {
    console.error('Admin Data Fetch Error:', error)
    return { error: error.message || 'Failed to fetch data' }
  }
}

export async function updateBetaStatus(password: string, userId: string, status: 'accepted' | 'rejected' | 'pending') {
  if (password !== 'Ironman1234@') {
    return { error: 'Invalid password' }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const { error } = await supabase
      .from('waitlist')
      .update({ beta_status: status })
      .eq('id', userId)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Update Beta Status Error:', error)
    return { error: error.message || 'Failed to update status' }
  }
}
