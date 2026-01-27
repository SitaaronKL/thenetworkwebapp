import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { ticketCode, checkedInBy } = await request.json();

    if (!ticketCode) {
      return NextResponse.json(
        { error: 'ticketCode is required' },
        { status: 400 }
      );
    }

    // Get Supabase URL and service role key from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    // Call the verify-ticket edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/verify-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        ticketCode: ticketCode.trim().toUpperCase(),
        checkedInBy: checkedInBy || 'scanner',
      }),
    });

    const result = await response.json();

    return NextResponse.json(result, {
      status: result?.success ? 200 : 400,
    });
  } catch (error: any) {
    console.error('Error in verify-ticket API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
