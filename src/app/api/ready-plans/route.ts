import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET: Fetch ready plans for the current user
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const city = searchParams.get('city');

        // Build query
        let query = supabase
            .from('ready_plans')
            .select(`
                *,
                ready_plan_responses (
                    user_id,
                    response,
                    responded_at
                )
            `)
            .in('status', ['pending', 'committed']) // Include both pending and committed plans
            .gte('commit_rule_expires_at', new Date().toISOString())
            .order('proposed_start_time', { ascending: true });

        // Filter by city if provided
        if (city) {
            query = query.eq('city', city);
        }

        // Get plans where user is the owner or an invitee
        const { data: plans, error } = await query.or(`user_id.eq.${user.id},invitee_ids.cs.{${user.id}}`);

        if (error) {
            console.error('Error fetching ready plans:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Log plan distribution for debugging
        const ownedPlans = plans?.filter(p => p.user_id === user.id) || [];
        const invitedPlans = plans?.filter(p => p.invitee_ids?.includes(user.id)) || [];
        console.log(`[Ready Plans] User ${user.id.substring(0, 8)}...: ${plans?.length || 0} total plans`);
        console.log(`  - ${ownedPlans.length} plans they created`);
        console.log(`  - ${invitedPlans.length} plans they're invited to`);
        
        if (invitedPlans.length > 0) {
            console.log(`  📬 Invited plans:`, invitedPlans.map(p => ({
                id: p.id.substring(0, 8),
                time: new Date(p.proposed_start_time).toLocaleString(),
                activity: p.activity_description
            })));
        }

        return NextResponse.json({ plans: plans || [] });
    } catch (error: any) {
        console.error('Error in GET /api/ready-plans:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Generate new ready plans for a user
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { city, timeWindows } = body;

        if (!city) {
            return NextResponse.json({ error: 'City is required' }, { status: 400 });
        }

        // Check local network density manually
        const { data: connections } = await supabase
            .from('user_connections')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .eq('status', 'accepted');

        if (!connections || connections.length < 3) {
            return NextResponse.json({
                error: 'Insufficient local network density',
                local_friend_count: connections?.length || 0,
                minimum_required: 3
            }, { status: 400 });
        }

        // Generate plans (this would call a more sophisticated plan generation function)
        // For now, return success - actual generation will be handled by a separate endpoint
        return NextResponse.json({
            message: 'Plans generation initiated',
            city,
            timeWindows
        });
    } catch (error: any) {
        console.error('Error in POST /api/ready-plans:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
