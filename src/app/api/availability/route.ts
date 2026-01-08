import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET: Get user's availability blocks
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const city = searchParams.get('city');
        const daysAhead = parseInt(searchParams.get('days_ahead') || '7');

        // Build query
        let query = supabase
            .from('user_availability_blocks')
            .select('*')
            .eq('user_id', user.id)
            .gte('start_time', new Date().toISOString())
            .lte('start_time', new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString())
            .order('start_time', { ascending: true });

        // Filter by city if provided
        if (city) {
            query = query.or(`city.is.null,city.eq.${city}`);
        }

        const { data: blocks, error } = await query;

        if (error) {
            console.error('Error fetching availability:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ blocks: blocks || [] });
    } catch (error: any) {
        console.error('Error in GET /api/availability:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create a new availability block
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { start_time, end_time, city, is_recurring, recurring_day_of_week, notes } = body;

        if (!start_time || !end_time) {
            return NextResponse.json({ error: 'start_time and end_time are required' }, { status: 400 });
        }

        if (new Date(end_time) <= new Date(start_time)) {
            return NextResponse.json({ error: 'end_time must be after start_time' }, { status: 400 });
        }

        const { data: block, error } = await supabase
            .from('user_availability_blocks')
            .insert({
                user_id: user.id,
                start_time,
                end_time,
                city: city || null,
                is_recurring: is_recurring || false,
                recurring_day_of_week: recurring_day_of_week || null,
                notes: notes || null
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating availability block:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ block });
    } catch (error: any) {
        console.error('Error in POST /api/availability:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Delete an availability block
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const blockId = searchParams.get('id');

        if (!blockId) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('user_availability_blocks')
            .delete()
            .eq('id', blockId)
            .eq('user_id', user.id); // Ensure user can only delete their own blocks

        if (error) {
            console.error('Error deleting availability block:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in DELETE /api/availability:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
