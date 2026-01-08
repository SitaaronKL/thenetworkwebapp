import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET: Get profiles by IDs (for displaying invitee info)
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const idsParam = searchParams.get('ids');

        if (!idsParam) {
            return NextResponse.json({ error: 'ids parameter is required' }, { status: 400 });
        }

        const ids = idsParam.split(',').filter(Boolean);

        if (ids.length === 0) {
            return NextResponse.json({ profiles: [] });
        }

        // Fetch profiles - only return basic info (name, avatar, school)
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, school, location')
            .in('id', ids);

        if (error) {
            console.error('Error fetching profiles:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ profiles: profiles || [] });
    } catch (error: any) {
        console.error('Error in GET /api/profiles:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
