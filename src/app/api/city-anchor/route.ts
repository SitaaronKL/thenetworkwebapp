import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET: Get user's active city anchor
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: anchor, error } = await supabase
            .from('user_city_anchors')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ anchor: anchor || null });
    } catch (error: any) {
        console.error('Error in GET /api/city-anchor:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Set user's city anchor
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { city, source, sourceData } = body;

        if (!city) {
            return NextResponse.json({ error: 'City is required' }, { status: 400 });
        }

        // Deactivate existing anchors for this user
        await supabase
            .from('user_city_anchors')
            .update({ is_active: false })
            .eq('user_id', user.id)
            .eq('is_active', true);

        // Create or update anchor
        const { data: anchor, error } = await supabase
            .from('user_city_anchors')
            .upsert({
                user_id: user.id,
                city,
                source: source || 'manual',
                source_data: sourceData || {},
                is_active: true,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,city'
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ anchor });
    } catch (error: any) {
        console.error('Error in POST /api/city-anchor:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
