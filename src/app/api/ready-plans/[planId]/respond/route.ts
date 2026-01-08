import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// POST: Accept or decline a ready plan
export async function POST(
    request: Request,
    { params }: { params: Promise<{ planId: string }> }
) {
    try {
        const { planId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { response } = body; // 'accepted' or 'declined'

        if (!response || !['accepted', 'declined'].includes(response)) {
            return NextResponse.json({ error: 'Invalid response. Must be "accepted" or "declined"' }, { status: 400 });
        }

        // Verify user is invited to this plan
        const { data: plan, error: planError } = await supabase
            .from('ready_plans')
            .select('*')
            .eq('id', planId)
            .single();

        if (planError || !plan) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const isInvited = plan.invitee_ids.includes(user.id);
        if (!isInvited && plan.user_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized to respond to this plan' }, { status: 403 });
        }

        // Check if already responded
        const { data: existingResponse } = await supabase
            .from('ready_plan_responses')
            .select('*')
            .eq('plan_id', planId)
            .eq('user_id', user.id)
            .single();

        if (existingResponse) {
            // Update existing response
            const { error: updateError } = await supabase
                .from('ready_plan_responses')
                .update({
                    response,
                    responded_at: new Date().toISOString()
                })
                .eq('id', existingResponse.id);

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }
        } else {
            // Create new response
            const { error: insertError } = await supabase
                .from('ready_plan_responses')
                .insert({
                    plan_id: planId,
                    user_id: user.id,
                    response,
                    responded_at: new Date().toISOString()
                });

            if (insertError) {
                return NextResponse.json({ error: insertError.message }, { status: 500 });
            }
        }

        // Check if plan should be committed (trigger will handle this, but we can also check)
        const { data: updatedPlan } = await supabase
            .from('ready_plans')
            .select('*')
            .eq('id', planId)
            .single();

        return NextResponse.json({
            success: true,
            response,
            plan_status: updatedPlan?.status
        });
    } catch (error: any) {
        console.error('Error in POST /api/ready-plans/[planId]/respond:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
