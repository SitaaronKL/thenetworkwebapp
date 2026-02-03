import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, conversation_history, thread_id } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'message is required' },
                { status: 400 }
            );
        }

        // Create Supabase client
        const supabase = await createClient();

        // Call the ari-chat edge function
        const { data, error } = await supabase.functions.invoke('ari-chat', {
            body: {
                message,
                conversation_history: conversation_history || [],
                thread_id
            }
        });

        if (error) {
            console.error('Edge function error:', error);

            // Try to get more details from the error
            const errorContext = (error as any).context;
            if (errorContext) {
                try {
                    const errorBody = await errorContext.json();
                    return NextResponse.json(
                        { error: errorBody.error || error.message },
                        { status: errorContext.status || 500 }
                    );
                } catch (e) {
                    // Couldn't parse error body
                }
            }

            return NextResponse.json(
                { error: error.message || 'something went wrong' },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('API route error:', err);
        return NextResponse.json(
            { error: err.message || 'internal server error' },
            { status: 500 }
        );
    }
}
