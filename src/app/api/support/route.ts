import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const { email, message } = await req.json();

        if (!message || typeof message !== 'string' || !message.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error } = await supabase.from('support_requests').insert({
            email: email && typeof email === 'string' ? email.trim() : null,
            message: message.trim(),
        });

        if (error) {
            console.error('Support request insert error:', error);
            return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Support route error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
