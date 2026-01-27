# Ticket Scanner Setup

## Installation

Install the html5-qrcode library:

```bash
cd thenetworkwebapp
npm install html5-qrcode
```

## Configuration

1. **Set the password** in `page.tsx`:
   - Change `SCANNER_PASSWORD` constant to your desired password

2. **Set environment variables** in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

   **Important:** The service role key is stored server-side only (not exposed to client). Keep it secure!

## Usage

1. Navigate to `/ticket-scanner`
2. Enter the password
3. Click "Start Scanning"
4. Point camera at QR codes
5. Attendees will be automatically checked in

## Features

- Password-protected access
- Real-time QR code scanning
- Automatic check-in
- Manual ticket code entry
- Success/error feedback
- Check-in counter
- Audio feedback (beep sounds)

## Security Notes

- The service role key should only be used server-side in production
- Consider moving the verify-ticket call to an API route for better security
- Change the password regularly
