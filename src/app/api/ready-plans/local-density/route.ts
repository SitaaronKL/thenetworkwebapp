import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET: Get local network density for a user in a city
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const city = searchParams.get('city');

        if (!city) {
            return NextResponse.json({ error: 'City is required' }, { status: 400 });
        }

        // Get all accepted connections (user can be sender or receiver)
        const { data: connections, error: connectionsError } = await supabase
            .from('user_connections')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .eq('status', 'accepted');

        if (connectionsError) {
            console.error('Error fetching connections:', connectionsError);
            return NextResponse.json({ error: connectionsError.message }, { status: 500 });
        }

        if (!connections || connections.length === 0) {
            return NextResponse.json({
                local_friend_count: 0,
                city,
                minimum_required: 3,
                can_generate_plans: false
            });
        }

        // Get the other user ID from each connection
        const connectionIds = connections.map(c => 
            c.sender_id === user.id ? c.receiver_id : c.sender_id
        );
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, location')
            .in('id', connectionIds);

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            return NextResponse.json({ error: profilesError.message }, { status: 500 });
        }

        // Count connections in the same city (case-insensitive match)
        // Location might be "New York City", "NYC", "New York, NY", etc.
        const localFriends = profiles?.filter(p => 
            p.location && p.location.toLowerCase().includes(city.toLowerCase())
        ) || [];
        const localFriendCount = localFriends.length;

        return NextResponse.json({
            local_friend_count: localFriendCount,
            city,
            minimum_required: 3,
            can_generate_plans: localFriendCount >= 3,
            recommended_count: 5 // For optimal plan generation
        });
    } catch (error: any) {
        console.error('Error in GET /api/ready-plans/local-density:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
