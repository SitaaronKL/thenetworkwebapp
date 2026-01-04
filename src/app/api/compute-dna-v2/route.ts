import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Get session to verify user is authenticated
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const body = await request.json().catch(() => ({}));
        const userId = body.user_id || session.user.id;
        const triggerSource = body.trigger_source || 'API_ROUTE_PROXY';

        console.log('compute-dna-v2 API route called for user:', userId);

        // First verify YouTube data exists before calling edge function
        const [{ data: subs, error: subsError }, { data: likes, error: likesError }] = await Promise.all([
            supabase.from('youtube_subscriptions').select('channel_id').eq('user_id', userId).limit(1),
            supabase.from('youtube_liked_videos').select('video_id').eq('user_id', userId).limit(1)
        ]);

        if (subsError) console.error('Error checking subs:', subsError);
        if (likesError) console.error('Error checking likes:', likesError);

        const hasYouTubeData = (subs && subs.length > 0) || (likes && likes.length > 0);
        console.log('YouTube data check:', { subsCount: subs?.length || 0, likesCount: likes?.length || 0, hasYouTubeData });

        if (!hasYouTubeData) {
            console.log('No YouTube data found yet, returning pending status');
            return NextResponse.json({
                status: 'pending',
                message: 'YouTube data not yet available, please retry'
            }, { status: 202 });
        }

        // Call the edge function server-side (no CORS issues)
        // Note: Supabase converts hyphens to underscores in function names
        const { data, error } = await supabase.functions.invoke('compute_dna_v2', {
            body: {
                user_id: userId,
                trigger_source: triggerSource
            }
        });

        if (error) {
            // Try to get more details from the error
            console.error('Edge function error:', error);
            const errorContext = (error as any).context;
            if (errorContext) {
                try {
                    const errorBody = await errorContext.json();
                    console.error('Edge function error body:', errorBody);
                    return NextResponse.json({ error: errorBody.error || error.message }, { status: errorContext.status || 500 });
                } catch (e) {
                    // Couldn't parse error body
                }
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('DNA v2 computation successful:', data);
        return NextResponse.json(data);
    } catch (err: any) {
        console.error('API route error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

