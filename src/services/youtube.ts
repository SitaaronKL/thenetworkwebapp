import { createClient } from '@/lib/supabase';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YouTubeSubscription {
  snippet: {
    title: string;
    resourceId: {
      channelId: string;
    };
    thumbnails: {
      default: {
        url: string;
      };
    };
  };
}

interface YouTubeLikedVideo {
  snippet: {
    title: string;
    channelTitle: string;
    resourceId: {
      videoId: string;
    };
    thumbnails: {
      default: {
        url: string;
      };
    };
    publishedAt: string;
  };
}

export const YouTubeService = {
  /**
   * Get Google access token from Supabase session
   * Note: Supabase stores provider_token in the session after OAuth sign-in
   */
  async getAccessToken(): Promise<string | null> {
    const supabase = createClient();

    // Get current session
    let { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    // Check if provider_token is available
    if (session?.provider_token) {
      return session.provider_token;
    }

    // Try to refresh the session
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      console.error('Error refreshing session:', refreshError);
      return null;
    }

    if (refreshedSession?.provider_token) {
      return refreshedSession.provider_token;
    }

    // If still no token, check URL hash (OAuth callback might have it)
    if (typeof window !== 'undefined') {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        return accessToken;
      }
    }

    console.warn('No provider token found in session. User may need to sign in again.');
    return null;
  },

  /**
   * Fetch YouTube subscriptions (single page)
   */
  async fetchSubscriptions(accessToken: string, maxResults: number = 50, pageToken?: string): Promise<{ items: YouTubeSubscription[]; nextPageToken?: string }> {
    const url = new URL(`${YOUTUBE_API_BASE}/subscriptions`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('mine', 'true');
    url.searchParams.set('maxResults', maxResults.toString());
    url.searchParams.set('order', 'relevance');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return {
      items: data.items || [],
      nextPageToken: data.nextPageToken,
    };
  },

  /**
   * Fetch all YouTube subscriptions (with pagination)
   */
  async fetchAllSubscriptions(accessToken: string, pageSize: number = 50): Promise<YouTubeSubscription[]> {
    const all: YouTubeSubscription[] = [];
    let pageToken: string | undefined;

    do {
      const result = await this.fetchSubscriptions(accessToken, pageSize, pageToken);
      all.push(...result.items);
      pageToken = result.nextPageToken;
    } while (pageToken);

    return all;
  },

  /**
   * Fetch YouTube liked videos (from the "Liked videos" playlist) - single page
   */
  async fetchLikedVideos(accessToken: string, maxResults: number = 50, pageToken?: string): Promise<{ items: YouTubeLikedVideo[]; nextPageToken?: string }> {
    const url = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('playlistId', 'LL'); // LL is the special playlist ID for liked videos
    url.searchParams.set('maxResults', maxResults.toString());
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return {
      items: data.items || [],
      nextPageToken: data.nextPageToken,
    };
  },

  /**
   * Fetch all YouTube liked videos (with pagination)
   */
  async fetchAllLikedVideos(accessToken: string, pageSize: number = 50, maxItems: number = 800): Promise<YouTubeLikedVideo[]> {
    const all: YouTubeLikedVideo[] = [];
    let pageToken: string | undefined;

    do {
      if (maxItems > 0 && all.length >= maxItems) break;

      let effectivePageSize = pageSize;
      if (maxItems > 0) {
        const remaining = maxItems - all.length;
        if (remaining < effectivePageSize) {
          effectivePageSize = remaining;
        }
        if (effectivePageSize <= 0) break;
      }

      const result = await this.fetchLikedVideos(accessToken, effectivePageSize, pageToken);
      all.push(...result.items);
      pageToken = result.nextPageToken;
    } while (pageToken);

    return all;
  },

  /**
   * Sync subscriptions to Supabase
   */
  async syncSubscriptionsToSupabase(userId: string, subscriptions: YouTubeSubscription[]): Promise<number> {
    const supabase = createClient();

    const rows = subscriptions
      .map((item) => {
        const channelId = item.snippet?.resourceId?.channelId;
        if (!channelId) return null;

        return {
          user_id: userId,
          channel_id: channelId,
          title: item.snippet?.title || null,
          thumbnail_url: item.snippet?.thumbnails?.default?.url || null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length === 0) {
      console.log('No subscription rows to sync');
      return 0;
    }

    console.log(`Syncing ${rows.length} subscriptions to database...`);
    const { data, error } = await supabase
      .from('youtube_subscriptions')
      .upsert(rows, { onConflict: 'user_id,channel_id' })
      .select();

    if (error) {
      console.error('Subscription sync error:', error);
      throw new Error(`Failed to sync subscriptions: ${error.message}`);
    }

    console.log(`Successfully synced ${rows.length} subscriptions`);
    return rows.length;
  },

  /**
   * Sync liked videos to Supabase
   */
  async syncLikedVideosToSupabase(userId: string, likedVideos: YouTubeLikedVideo[]): Promise<number> {
    const supabase = createClient();

    const rows = likedVideos
      .map((item) => {
        const videoId = item.snippet?.resourceId?.videoId;
        if (!videoId) return null;

        return {
          user_id: userId,
          video_id: videoId,
          title: item.snippet?.title || null,
          channel_title: item.snippet?.channelTitle || null,
          thumbnail_url: item.snippet?.thumbnails?.default?.url || null,
          published_at: item.snippet?.publishedAt || null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length === 0) {
      console.log('No liked video rows to sync');
      return 0;
    }

    console.log(`Syncing ${rows.length} liked videos to database...`);
    const { data, error } = await supabase
      .from('youtube_liked_videos')
      .upsert(rows, { onConflict: 'user_id,video_id' })
      .select();

    if (error) {
      console.error('Liked videos sync error:', error);
      throw new Error(`Failed to sync liked videos: ${error.message}`);
    }

    console.log(`Successfully synced ${rows.length} liked videos`);
    return rows.length;
  },

  /**
   * Full sync: fetch and store YouTube data (fetches ALL data with pagination)
   */
  async syncYouTubeData(userId: string): Promise<{ subsCount: number; likesCount: number }> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('No Google access token available. Please sign in again.');
    }

    console.log('Starting full YouTube data sync (fetching all subscriptions and liked videos)...');

    // Fetch all data with pagination
    const [subscriptions, likedVideos] = await Promise.all([
      this.fetchAllSubscriptions(accessToken, 50),
      this.fetchAllLikedVideos(accessToken, 50, 800), // Limit liked videos to 800 to avoid excessive API calls
    ]);

    console.log(`Fetched ${subscriptions.length} subscriptions and ${likedVideos.length} liked videos`);

    // Sync to database
    const [subsCount, likesCount] = await Promise.all([
      this.syncSubscriptionsToSupabase(userId, subscriptions),
      this.syncLikedVideosToSupabase(userId, likedVideos),
    ]);

    console.log('Sync completed:', { subsCount, likesCount, subsLength: subscriptions.length, likesLength: likedVideos.length });

    return { subsCount, likesCount };
  },

  /**
   * Verify YouTube data exists for user
   */
  async verifyYouTubeData(userId: string): Promise<{ hasSubs: boolean; hasLikes: boolean; subsCount: number; likesCount: number }> {
    const supabase = createClient();

    try {
      // Simple check - just see if we can get any rows
      const [subsData, likesData] = await Promise.all([
        supabase
          .from('youtube_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .limit(1),
        supabase
          .from('youtube_liked_videos')
          .select('id')
          .eq('user_id', userId)
          .limit(1),
      ]);

      const subsCount = subsData.data?.length || 0;
      const likesCount = likesData.data?.length || 0;

      console.log('Verification result:', {
        subsError: subsData.error,
        likesError: likesData.error,
        subsCount,
        likesCount
      });

      return {
        hasSubs: subsCount > 0,
        hasLikes: likesCount > 0,
        subsCount,
        likesCount,
      };
    } catch (error) {
      console.error('Error verifying YouTube data:', error);
      return {
        hasSubs: false,
        hasLikes: false,
        subsCount: 0,
        likesCount: 0,
      };
    }
  },

  /**
   * Call derive_interests edge function
   */
  async deriveInterests(userId: string): Promise<string[]> {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured. Please check your environment variables.');
    }

    const supabase = createClient();

    // Ensure we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error(`No active session: ${sessionError?.message || 'Session not found'}`);
    }

    if (!session.access_token) {
      throw new Error('No access token in session. Please sign in again.');
    }

    console.log('Calling derive_interests for user:', userId);
    console.log('Session available:', !!session);
    console.log('Access token available:', !!session.access_token);
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    try {
      // Try using the Supabase client first
      const { data, error } = await supabase.functions.invoke('derive_interests', {
        body: { user_id: userId, max_interests: 15 },
      });

      console.log('Edge function response:', {
        hasData: !!data,
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : [],
        errorMessage: error?.message
      });

      if (error) {
        console.error('Edge function error details:', {
          message: error.message,
          context: error.context,
          status: error.status,
          fullError: JSON.stringify(error, null, 2)
        });

        // Try to get more details from the error response
        let errorDetails = error.message || 'Unknown error';
        if (error.context) {
          try {
            const contextData = typeof error.context === 'string' ? JSON.parse(error.context) : error.context;
            if (contextData.error) {
              errorDetails = contextData.error;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }

        // If the Supabase client method fails, try direct fetch as fallback
        if (error.message?.includes('Failed to send') || error.message?.includes('CORS')) {
          console.log('Attempting direct fetch to edge function...');
          return await this.deriveInterestsDirectFetch(userId, session.access_token);
        }

        throw new Error(`Failed to derive interests: ${errorDetails}`);
      }

      // Log the full response for debugging
      console.log('Full edge function data:', JSON.stringify(data, null, 2));

      // Check if the response contains an error (even with 200 status)
      if (data && typeof data === 'object' && 'error' in data) {
        console.error('Edge function returned error in response:', data);
        throw new Error(`Edge function error: ${data.error || JSON.stringify(data)}`);
      }

      if (!data) {
        throw new Error('No data returned from derive_interests function');
      }

      console.log('Successfully derived interests:', data.interests);

      // Verify the interests were actually saved to the profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('interests')
        .eq('id', userId)
        .single();

      console.log('Profile interests after derive:', profile?.interests);

      return data?.interests || [];
    } catch (err: any) {
      console.error('Exception calling derive_interests:', err);
      // If it's already our error, rethrow it
      if (err.message?.includes('Failed to derive interests')) {
        throw err;
      }
      // Otherwise wrap it
      throw new Error(`Failed to derive interests: ${err.message || String(err)}`);
    }
  },

  /**
   * Fallback: Call derive_interests directly via fetch
   */
  async deriveInterestsDirectFetch(userId: string, accessToken: string): Promise<string[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
    }

    const functionUrl = `${supabaseUrl}/functions/v1/derive_interests`;

    console.log('Calling edge function directly:', functionUrl);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ user_id: userId, max_interests: 15 }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Direct fetch error:', response.status, errorText);
      throw new Error(`Edge function returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data?.interests || [];
  },

  /**
   * Disconnect YouTube: Delete all YouTube data and revoke OAuth token
   */
  async disconnectYouTube(): Promise<void> {
    const supabase = createClient();

    // Ensure we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error(`No active session: ${sessionError?.message || 'Session not found'}`);
    }

    if (!session.access_token) {
      throw new Error('No access token in session. Please sign in again.');
    }

    console.log('Calling disconnect-youtube edge function');

    try {
      const { data, error } = await supabase.functions.invoke('disconnect-youtube', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Edge function error details:', {
          message: error.message,
          context: error.context,
          status: error.status,
        });
        throw new Error(`Failed to disconnect YouTube: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      console.log('Successfully disconnected YouTube');
    } catch (err: any) {
      console.error('Exception calling disconnect-youtube:', err);
      if (err.message?.includes('Failed to disconnect YouTube')) {
        throw err;
      }
      throw new Error(`Failed to disconnect YouTube: ${err.message || String(err)}`);
    }
  },
};

