import { createClient } from '@/lib/supabase';

export interface ReferralStats {
  totalInvites: number;
  acceptedInvites: number;
  referralCode: string;
  inviteLink: string;
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  invite_count: number;
  rank: number;
}
/**
 * Get or create a referral code for the current user
 */
export async function getUserReferralCode(userId: string): Promise<string | null> {
  const supabase = createClient();

  try {
    // Call the database function to get or create referral code
    const { data, error } = await supabase.rpc('get_or_create_referral_code', {
      p_user_id: userId
    });

    if (error) {
      return null;
    }

    return data as string;
  } catch (error) {
    return null;
  }
}

/**
 * Get referral statistics for the current user
 */
export async function getReferralStats(userId: string): Promise<ReferralStats | null> {
  const supabase = createClient();

  try {
    // Get referral code
    const referralCode = await getUserReferralCode(userId);
    if (!referralCode) return null;

    // Get invite counts
    const { data: invites, error } = await supabase
      .from('referral_invites')
      .select('status')
      .eq('referrer_id', userId);

    if (error) {
      return null;
    }

    const totalInvites = invites?.length || 0;
    const acceptedInvites = invites?.filter(inv => inv.status === 'accepted').length || 0;

    const inviteLink = `${window.location.origin}/invite/${referralCode}`;

    return {
      totalInvites,
      acceptedInvites,
      referralCode,
      inviteLink
    };
  } catch (error) {
    return null;
  }
}

/**
 * Track a referral signup - called when a new user signs up with a referral code
 */
export async function trackReferralSignup(
  referrerId: string,
  referredUserId: string,
  referralCode: string
): Promise<boolean> {
  const supabase = createClient();

  try {
    // Find the referral invite record (or create one)
    const { data: existingInvite } = await supabase
      .from('referral_invites')
      .select('id')
      .eq('referrer_id', referrerId)
      .eq('referral_code', referralCode)
      .eq('status', 'pending')
      .maybeSingle();

    // Check if the user has already been referred by ANYONE (prevent double counting)
    const { data: alreadyReferred } = await supabase
      .from('referral_invites')
      .select('id')
      .eq('referred_user_id', referredUserId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (alreadyReferred) {
      // Still return true to proceed with connection logic if needed, or just return true to not block
      return true;
    }

    let inviteId: string;

    if (existingInvite) {
      // Update existing invite
      const { data: updatedInvite, error: updateError } = await supabase
        .from('referral_invites')
        .update({
          status: 'accepted',
          referred_user_id: referredUserId,
          accepted_at: new Date().toISOString()
        })
        .eq('id', existingInvite.id)
        .select('id')
        .single();

      if (updateError || !updatedInvite) {
        return false;
      }
      inviteId = updatedInvite.id;
    } else {
      // Create new invite record
      const { data: newInvite, error: createError } = await supabase
        .from('referral_invites')
        .insert({
          referrer_id: referrerId,
          referral_code: referralCode,
          invite_method: 'link',
          status: 'accepted',
          referred_user_id: referredUserId,
          accepted_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createError || !newInvite) {
        return false;
      }
      inviteId = newInvite.id;
    }

    // Update the profile with the referrer_id (new requirement)
    // We do this separately to ensure the invite tracking works even if profile update fails
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ referred_by: referrerId })
      .eq('id', referredUserId);

    if (profileError) {
      // Continue anyway, as this is secondary to the invite tracking
    }

    // Auto-create connection between referrer and referred user
    // Check if connection already exists first (check both directions)
    const { data: existingConnections } = await supabase
      .from('user_connections')
      .select('id')
      .or(`and(sender_id.eq.${referrerId},receiver_id.eq.${referredUserId}),and(sender_id.eq.${referredUserId},receiver_id.eq.${referrerId})`)
      .limit(1);

    const existingConnection = existingConnections && existingConnections.length > 0 ? existingConnections[0] : null;

    if (!existingConnection) {
      // Create bidirectional connections
      const { error: connectionError } = await supabase
        .from('user_connections')
        .insert({
          sender_id: referrerId,
          receiver_id: referredUserId,
          status: 'accepted',
          initiated_via: 'referral',
          referral_invite_id: inviteId
        })
        .select()
        .single();

      // Also create the reverse connection
      const { error: reverseConnectionError } = await supabase
        .from('user_connections')
        .insert({
          sender_id: referredUserId,
          receiver_id: referrerId,
          status: 'accepted',
          initiated_via: 'referral',
          referral_invite_id: inviteId
        })
        .select()
        .single();

      if (connectionError && reverseConnectionError) {
        // Don't fail the whole operation if connection creation fails
      }
    } else {
      // Connection already exists, just update it to include referral info if needed
      const { error: updateError } = await supabase
        .from('user_connections')
        .update({
          referral_invite_id: inviteId,
          initiated_via: 'referral'
        })
        .eq('id', existingConnection.id);

      if (updateError) {
        // Error updating connection
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get leaderboard data
 * Uses a database function that bypasses RLS to show all users' invite counts
 */
export async function getInviteLeaderboard(
  period: 'all-time' | 'monthly' | 'weekly' = 'all-time'
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();

  try {
    // Call the database function that bypasses RLS
    const { data, error } = await supabase.rpc('get_invite_leaderboard', {
      p_period: period
    });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convert to LeaderboardEntry format
    const entries: LeaderboardEntry[] = data.map((row: any) => ({
      user_id: row.user_id,
      full_name: row.full_name || 'Unknown',
      avatar_url: row.avatar_url || null,
      invite_count: Number(row.invite_count) || 0,
      rank: Number(row.rank) || 0
    }));

    return entries;
  } catch (error) {
    console.error('Error in getInviteLeaderboard:', error);
    return [];
  }
}

/**
 * Get current user's rank and stats
 */
export async function getUserLeaderboardStats(
  userId: string,
  period: 'all-time' | 'monthly' | 'weekly' = 'all-time'
): Promise<{ rank: number; inviteCount: number } | null> {
  const leaderboard = await getInviteLeaderboard(period);
  const userEntry = leaderboard.find(entry => entry.user_id === userId);

  if (!userEntry) {
    // User not in leaderboard, get their count
    const supabase = createClient();
    let query = supabase
      .from('referral_invites')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', userId)
      .eq('status', 'accepted');

    if (period === 'monthly') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      query = query.gte('accepted_at', oneMonthAgo.toISOString());
    } else if (period === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      query = query.gte('accepted_at', oneWeekAgo.toISOString());
    }

    const { count } = await query;
    return { rank: leaderboard.length + 1, inviteCount: count || 0 };
  }

  return {
    rank: userEntry.rank,
    inviteCount: userEntry.invite_count
  };
}
