export interface EmailData {
    name: string;
    ticketCode: string;
    partyTitle: string;
    venueAddress?: string;
    eventTime?: string;
}

export const renderHtmlBody = (data: EmailData) => {
    const { name, ticketCode, partyTitle, venueAddress, eventTime } = data;
    return `
<!DOCTYPE html>
<html>
<head>
 <meta charset="utf-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>Your GlowDown Ticket</title>
 <style>
    @keyframes glow-shift {
        0%, 100% { background-position: 0% 0%; }
        25% { background-position: 10% 20%; }
        50% { background-position: 20% 10%; }
        75% { background-position: 10% -10%; }
    }
    @keyframes borderGlow {
        0% { border-color: #00ffe7; }
        33% { border-color: #8a2be2; }
        66% { border-color: #ff00cc; }
        100% { border-color: #00ffe7; }
    }
    @keyframes rainbow-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    .dynamic-bg {
        background-color: #000000 !important;
        background-image: 
            radial-gradient(circle at 20% 30%, rgba(138, 43, 226, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(0, 255, 231, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(255, 0, 204, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 70% 20%, rgba(0, 255, 231, 0.f) 0%, transparent 40%),
            radial-gradient(ellipse at top, #1a0033 0%, #000000 100%) !important;
        background-size: 200% 200% !important;
        background-attachment: fixed !important;
        animation: glow-shift 12s ease-in-out infinite !important;
    }
    .glow-border {
        animation: borderGlow 6s ease-in-out infinite !important;
    }
    .ticket-bg {
        background: linear-gradient(270deg, rgba(0,255,231,0.1), rgba(92,150,248,0.1), rgba(138,43,226,0.1), rgba(255,0,204,0.1), rgba(249,115,22,0.1), rgba(234,179,8,0.1), rgba(34,197,94,0.1));
        background-size: 400% 400%;
        background-color: rgba(0, 0, 0, 0.95);
        animation: rainbow-shift 15s ease infinite;
    }
 </style>
</head>
<body class="dynamic-bg" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #ffffff; max-width: 600px; margin: 0 auto; padding: 20px;">
 <div style="text-align: center; padding: 40px 0 20px 0;">
   <h1 style="font-size: 52px; font-weight: 900; letter-spacing: 0.15em; background: linear-gradient(90deg, #00ffe7 20%, #ff00cc 80%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 30px 0; filter: drop-shadow(0 0 20px rgba(0, 255, 231, 0.6)) drop-shadow(0 0 40px rgba(255, 0, 204, 0.4));">GLOWDOWN</h1>
   <div style="height: 2px; width: 60px; background: linear-gradient(90deg, #00ffe7, #ff00cc); margin: 15px auto;"></div>
   <p style="color: #ffffff; margin: 10px 0; opacity: 0.6; font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase;">Pike welcomes you</p>
 </div>

 <div style="background: linear-gradient(135deg, #00ffe7, #5c96f8, #8a2be2, #ff00cc, #f97316, #eab308, #22c55e); padding: 2px; border-radius: 24px; margin-bottom: 30px; box-shadow: 0 0 40px rgba(138, 43, 226, 0.2);">
   <div class="ticket-bg" style="padding: 40px; border-radius: 22px; border: 1px solid rgba(138, 43, 226, 0.3);">
     <h2 style="color: #ffffff; margin-top: 0; font-size: 28px; font-weight: 700; text-align: center; margin-bottom: 30px; letter-spacing: 0.05em; text-shadow: 0 0 20px rgba(255,255,255,0.3);">YOUR TICKET</h2>
     
     <div style="background-color: #ffffff; padding: 30px; border-radius: 16px; margin: 20px 0; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
       <p style="color: #94A3B8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 20px 0;">Scan at Entrance</p>
       
       <!-- QR Code Image -->
       <div style="margin: 20px 0; display: inline-block; padding: 15px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
         <img
           src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticketCode)}"
           alt="Ticket QR Code"
           style="width: 180px; height: 180px; display: block;"
         />
       </div>
       
       <!-- Text Code (backup) -->
       <div style="margin-top: 25px; padding-top: 25px; border-top: 2px dashed #e2e8f0;">
         <p style="color: #94A3B8; font-size: 10px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">Ticket Ref:</p>
         <div style="font-family: 'Courier New', monospace; font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: 4px;">
           ${ticketCode}
         </div>
       </div>
     </div>

     <div style="margin-top: 30px; padding: 20px; background: rgba(138, 43, 226, 0.05); border-radius: 12px; border: 1px solid rgba(138, 43, 226, 0.1);">
       <table style="width: 100%; border-collapse: collapse;">
         <tr>
           <td style="padding: 10px 0; color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em;">Event</td>
           <td style="padding: 10px 0; color: #00ffe7; font-weight: 600; text-align: right; text-shadow: 0 0 10px rgba(0,255,231,0.3);">${partyTitle}</td>
         </tr>
         <tr>=
           <td style="padding: 10px 0; color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em;">Venue</td>
           <td style="padding: 10px 0; color: #ffc400ff; font-weight: 600; text-align: right;">${venueAddress || 'To be announced'}</td>
         </tr>
         <tr>
           <td style="padding: 10px 0; color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em;">Time</td>
           <td style="padding: 10px 0; color: #ff00cc; font-weight: 600; text-align: right; text-shadow: 0 0 10px rgba(255,0,204,0.3);">${eventTime || '10:00 PM'}</td>
         </tr>
       </table>
     </div>
   </div>
 </div>

 <div style="padding: 0 20px; color: #ffffff; font-size: 15px; line-height: 1.8; text-align: center;">
   <p style="opacity: 0.9;">Hey <strong>${name}</strong>,
   <p style="opacity: 0.7;">You're officially on the list.</p>

   <div style="margin-top: 40px; text-align: center;">
     <img src="https://thenetwork.life/mcmaster/pike.svg" alt="Pike" style="display: block; margin: 0 auto; width: 160px; height: auto; border: 0;">
     <div style="height: 25px; line-height: 25px;">&nbsp;</div>
     <a href="https://www.thenetwork.life/mcmaster" target="_blank" style="text-decoration: none; display: inline-block;">
       <img src="https://thenetwork.life/mcmaster/TheNetwork.svg" alt="The Network" style="display: block; margin: 0 auto; width: 500px; height: auto; border: 0; filter: brightness(0) invert(1);">
     </a>
   </div>
 </div>

 <div style="margin-top: 60px; padding: 40px 20px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
   <p style="color: #ffffff; opacity: 0.3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">© 2026 The Network. All rights reserved.</p>
 </div>
</body>
</html>
`;
};

export const renderTextBody = (data: EmailData) => {
    const { name, ticketCode, partyTitle, venueAddress, eventTime } = data;
    return `
GlowDown - Your Ticket

Hey ${name},

You're officially on the list! We're excited to have you at the most anticipated event of the year.

Your Ticket Ref: ${ticketCode}

Event: ${partyTitle}
Location: ${venueAddress || 'To be announced'}
Time: ${eventTime || '10:00 PM'}

Wear White. Bring Energy. ✨

Show this code at the door when you arrive.

See you Friday!

© 2026 The Network
`;
};
