import { createClient } from '@/lib/supabase';
import { AriaResponse } from '@/types/aria';

// Helper to construct full Avatar URL
const getFullAvatarUrl = (path?: string) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const bucket = 'profile-images';
    const pathWithBucket = cleanPath.startsWith(bucket) ? cleanPath : `${bucket}/${cleanPath}`;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${pathWithBucket}`;
};

// Helper to process connections
const processConnections = (requests: any[], userId: string) => {
    const connections = new Set<string>();
    const pending = new Set<string>();
    if (requests) {
        requests.forEach((r: any) => {
            const otherId = r.sender_id === userId ? r.receiver_id : r.sender_id;
            if (r.status === 'accepted') {
                connections.add(otherId);
            } else if (r.status === 'pending') {
                if (r.sender_id === userId) pending.add(otherId);
            }
        });
    }
    return { connections, pending };
}

export const AriaService = {
    // Send message to Aria Router (intelligent routing to agents)
    // mode: 'network' for searching connected users, 'suggestions' for finding new connections
    sendMessage: async (message: string, history: any[] = [], mode: 'network' | 'suggestions' = 'suggestions'): Promise<AriaResponse | null> => {
        const supabase = createClient();

        try {
            // Get current user for user_id
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return null;
            }

            const { data, error } = await supabase.functions.invoke('ari-chat', {
                body: {
                    message,
                    conversation_history: history,
                    user_id: user.id,
                    mode: mode
                },
            });

            if (error) {
                return null;
            }

            // Map people from ari-router response to candidates format
            let candidates: any[] = [];

            // Handle people from PEOPLE_MATCHING or ACTIVITY_MULTI_AGENT
            if (data.people && Array.isArray(data.people)) {
                candidates = data.people.map((p: any) => ({
                    id: p.user_id,
                    name: p.name,
                    username: '', // Will be hydrated
                    matchScore: p.score || 0,
                    matchReason: p.reason || '',
                    avatarUrl: undefined, // Will be hydrated below
                })).filter((c: any) => c.matchScore > 0.1);
            }

            // Also handle venues if they're in the response (for display)
            // Venues are separate from candidates - could be stored in metadata

            // Hydrate logic
            if (candidates.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', candidates.map((c: any) => c.id));

                const { data: { user } } = await supabase.auth.getUser();
                if (user && profiles) {
                    const { data: requests } = await supabase
                        .from('user_connections')
                        .select('sender_id, receiver_id, status')
                        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

                    const { connections, pending } = processConnections(requests || [], user.id);

                    candidates = candidates.map((c: any) => {
                        const profile = profiles.find((p: any) => p.id === c.id) as any;
                        return {
                            ...c,
                            name: profile?.full_name || c.name,
                            avatarUrl: getFullAvatarUrl(profile?.avatar_url) || c.avatarUrl,
                            isConnected: connections.has(c.id),
                            isPending: pending.has(c.id)
                        };
                    });
                }
            }

            return {
                response: data.response,
                intent: data.intent || 'chat',
                candidates: candidates,
            };
        } catch (e) {
            return null;
        }
    },

    // Store message in Supabase
    storeMessage: async (userId: string, content: string, isFromUser: boolean) => {
        const supabase = createClient();
        try {
            await supabase.from('aria_conversations').insert({
                user_id: userId,
                message: content,
                is_from_user: isFromUser,
            });
        } catch (e) {
            // Error storing message
        }
    },

    // Get conversation history
    getHistory: async (userId: string, limit = 50) => {
        const supabase = createClient();
        try {
            const { data } = await supabase
                .from('aria_conversations')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (!data) return [];

            const history = data.map((msg: any) => ({
                ...msg,
                candidates: msg.metadata?.candidates || []
            }));

            // Collect all candidate IDs
            const allCandidateIds = new Set<string>();
            history.forEach((msg: any) => {
                if (msg.candidates) {
                    msg.candidates.forEach((c: any) => allCandidateIds.add(c.id));
                }
            });

            if (allCandidateIds.size > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', Array.from(allCandidateIds));

                // Fetch connections for user
                const { data: requests } = await supabase
                    .from('user_connections')
                    .select('sender_id, receiver_id, status')
                    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

                const { connections, pending } = processConnections(requests || [], userId);

                if (profiles) {
                    history.forEach((msg: any) => {
                        if (msg.candidates) {
                            msg.candidates = msg.candidates.map((c: any) => {
                                const profile = profiles.find((p: any) => p.id === c.id) as any;
                                return {
                                    ...c,
                                    name: profile?.full_name || c.name,
                                    matchScore: c.match_score || c.matchScore || 0,
                                    matchReason: c.match_reason || c.reasoning || c.matchReason,
                                    avatarUrl: getFullAvatarUrl(profile?.avatar_url) || c.avatarUrl,
                                    isConnected: connections.has(c.id),
                                    isPending: pending.has(c.id)
                                };
                            }).filter((c: any) => (c.matchScore || 0) > 0.1);
                        }
                    });
                }
            }

            return history.reverse();
        } catch (e) {
            return [];
        }
    }
};
