import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// POST: Add another person to an existing plan
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
        const { invitee_id } = body;

        if (!invitee_id) {
            return NextResponse.json({ error: 'invitee_id is required' }, { status: 400 });
        }

        // Verify user owns this plan or is already an invitee
        const { data: plan, error: planError } = await supabase
            .from('ready_plans')
            .select('*')
            .eq('id', planId)
            .single();

        if (planError || !plan) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const isOwner = plan.user_id === user.id;
        const isInvitee = plan.invitee_ids.includes(user.id);

        if (!isOwner && !isInvitee) {
            return NextResponse.json({ error: 'Not authorized to add people to this plan' }, { status: 403 });
        }

        // Check if person is already invited
        if (plan.invitee_ids.includes(invitee_id)) {
            return NextResponse.json({ error: 'Person is already invited to this plan' }, { status: 400 });
        }

        // Check if plan is still pending (can't add people to committed/expired plans)
        if (plan.status !== 'pending') {
            return NextResponse.json({ error: 'Can only add people to pending plans' }, { status: 400 });
        }

        // Add the new invitee
        const updatedInviteeIds = [...plan.invitee_ids, invitee_id];
        
        // Update commit rule if needed (if we now have more people, might need more acceptances)
        const newMinAcceptances = Math.max(plan.commit_rule_min_acceptances, 2);

        const { data: updatedPlan, error: updateError } = await supabase
            .from('ready_plans')
            .update({
                invitee_ids: updatedInviteeIds,
                commit_rule_min_acceptances: newMinAcceptances,
                updated_at: new Date().toISOString()
            })
            .eq('id', planId)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            plan: updatedPlan
        });
    } catch (error: any) {
        console.error('Error in POST /api/ready-plans/[planId]/add-person:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
