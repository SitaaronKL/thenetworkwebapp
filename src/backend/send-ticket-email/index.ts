import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderHtmlBody, renderTextBody } from './template.ts';


// Email service configuration
// Option 1: Use Resend (recommended - add RESEND_API_KEY to Supabase secrets)
// Option 2: Use SMTP (configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SMTP_HOST = Deno.env.get('SMTP_HOST');
const SMTP_PORT = Deno.env.get('SMTP_PORT') || '587';
const SMTP_USER = Deno.env.get('SMTP_USER');
const SMTP_PASS = Deno.env.get('SMTP_PASS');
// Email sender address
// Set via Supabase secrets: supabase secrets set FROM_EMAIL=sophia@thenetwork.life
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'sophia@thenetwork.life';


interface SendTicketEmailRequest {
    email: string;
    name: string;
    ticketCode: string;
    partyTitle: string;
    venueAddress?: string;
    eventTime?: string;
}


Deno.serve(async (req: Request): Promise<Response> => {
    try {
        const { email, name, ticketCode, partyTitle, venueAddress, eventTime }: SendTicketEmailRequest = await req.json();


        if (!email || !name || !ticketCode || !partyTitle) {
            return new Response(JSON.stringify({ error: 'missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }


        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(JSON.stringify({ error: 'invalid email format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }


        const subject = `Your GlowDown Ticket - ${ticketCode}`;

        const emailData = { name, ticketCode, partyTitle, venueAddress, eventTime };
        const htmlBody = renderHtmlBody(emailData);
        const textBody = renderTextBody(emailData);


        // Try Resend first (if configured)
        if (RESEND_API_KEY) {
            try {
                const resendResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify({
                        from: FROM_EMAIL,
                        to: email,
                        subject: subject,
                        html: htmlBody,
                        text: textBody,
                    }),
                });


                if (resendResponse.ok) {
                    const data = await resendResponse.json();
                    return new Response(JSON.stringify({ success: true, message: 'Email sent via Resend', id: data.id }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    });
                } else {
                    const errorText = await resendResponse.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        errorData = { message: errorText };
                    }

                    console.error('Resend error:', errorText);

                    // Check if it's a domain verification error
                    if (errorData.message?.includes('domain is not verified') || errorData.message?.includes('domain has been registered')) {
                        console.error('DOMAIN ISSUE: Check domain verification at https://resend.com/domains');
                        // If domain is registered but not verified, try test domain as fallback
                        if (errorData.message?.includes('domain is not verified')) {
                            try {
                                const testDomainResponse = await fetch('https://api.resend.com/emails', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                                    },
                                    body: JSON.stringify({
                                        from: 'onboarding@resend.dev', // Resend test domain
                                        to: email,
                                        subject: subject,
                                        html: htmlBody,
                                        text: textBody,
                                    }),
                                });

                                if (testDomainResponse.ok) {
                                    const testData = await testDomainResponse.json();
                                    console.log('Email sent using Resend test domain (onboarding@resend.dev)');
                                    return new Response(JSON.stringify({
                                        success: true,
                                        message: 'Email sent via Resend (test domain)',
                                        id: testData.id,
                                        warning: 'Using test domain. Verify your domain for production.'
                                    }), {
                                        status: 200,
                                        headers: { 'Content-Type': 'application/json' },
                                    });
                                }
                            } catch (testError) {
                                console.error('Test domain also failed:', testError);
                            }
                        }
                    }
                    // Fall through to SMTP or logging
                }
            } catch (resendError) {
                console.error('Resend request failed:', resendError);
                // Fall through to SMTP or logging
            }
        }


        // Try SMTP if configured
        if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
            // For SMTP, you'd use a library like nodemailer or similar
            // This is a placeholder - you'd need to implement SMTP sending
            console.log('SMTP configured but not implemented in this function');
            // You can add SMTP implementation here using a library
        }


        // Fallback: Log the email (for development)
        console.log('=== TICKET EMAIL (NOT SENT - NO EMAIL SERVICE CONFIGURED) ===');
        console.log(`To: ${email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Ticket Code: ${ticketCode}`);
        console.log('==============================================================');


        return new Response(
            JSON.stringify({
                success: true,
                message: 'Email prepared but not sent (no email service configured)',
                email: email,
                // In production, remove ticket code from response for security
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (e) {
        console.error('Error in send-ticket-email:', e);
        return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});



