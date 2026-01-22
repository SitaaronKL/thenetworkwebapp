'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// Default Discord invite URL if campaign doesn't have a specific one
const DEFAULT_DISCORD_URL = 'https://discord.gg/thenetwork';

export default function DiscordTrackingPage() {
  const router = useRouter();
  const params = useParams();
  const campaignCode = params?.campaign_code as string;
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'invalid'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleDiscordClick = async () => {
      if (!campaignCode) {
        // No campaign code - redirect to default Discord
        window.location.href = DEFAULT_DISCORD_URL;
        return;
      }

      const supabase = createClient();

      try {
        // Call the RPC function to increment discord_clicks and get the campaign data
        const { data, error } = await supabase
          .rpc('increment_discord_clicks', { 
            p_campaign_code: campaignCode.toLowerCase() 
          });

        if (error) {
          console.error('Error tracking Discord click:', error);
          // Still redirect to Discord even if tracking fails
          setStatus('redirecting');
          window.location.href = DEFAULT_DISCORD_URL;
          return;
        }

        if (!data || data.length === 0) {
          // Campaign not found or inactive - still redirect to default Discord
          console.log('Campaign not found:', campaignCode);
          setStatus('redirecting');
          window.location.href = DEFAULT_DISCORD_URL;
          return;
        }

        // Successfully tracked - redirect to campaign's Discord URL or default
        const campaign = data[0];
        const discordUrl = campaign.discord_url || DEFAULT_DISCORD_URL;
        
        setStatus('redirecting');
        
        // Store the campaign code in localStorage for attribution (optional)
        if (typeof window !== 'undefined') {
          localStorage.setItem('discord_campaign_code', campaign.campaign_code);
          localStorage.setItem('discord_click_timestamp', new Date().toISOString());
        }

        // Redirect to Discord
        window.location.href = discordUrl;

      } catch (err) {
        console.error('Error handling Discord click:', err);
        // Fallback - still redirect to Discord
        setStatus('redirecting');
        window.location.href = DEFAULT_DISCORD_URL;
      }
    };

    handleDiscordClick();
  }, [campaignCode, router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#000000',
      color: '#ffffff',
      padding: '20px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        {(status === 'loading' || status === 'redirecting') && (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 24px',
            }}>
              {/* Discord Logo */}
              <svg viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3## 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.0525 50.6035 51.2699 52.57 52.5987 54.435C52.6547 54.5139 52.7554 54.5477 52.8478 54.5195C58.6494 52.7249 64.532 50.0174 70.6049 45.5576C70.6581 45.5182 70.6917 45.459 70.6973 45.3942C72.1932 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1099 30.1693C30.1099 34.1136 27.2792 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.937 34.1136 40.937 30.1693C40.937 26.225 43.7636 23.0133 47.3178 23.0133C50.8999 23.0133 53.7545 26.2532 53.7018 30.1693C53.7018 34.1136 50.8999 37.3253 47.3178 37.3253Z" fill="#5865F2"/>
              </svg>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px' }}>
              Redirecting to Discord...
            </h1>
            <p style={{ fontSize: '14px', opacity: 0.7 }}>
              You&apos;ll be redirected automatically
            </p>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTop: '3px solid #5865F2',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '24px auto 0',
            }} />
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </>
        )}
        
        {status === 'invalid' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ margin: '0 auto' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '14px', opacity: 0.7 }}>
              {errorMessage || 'Unable to redirect to Discord'}
            </p>
            <a 
              href={DEFAULT_DISCORD_URL}
              style={{
                display: 'inline-block',
                marginTop: '24px',
                padding: '12px 24px',
                background: '#5865F2',
                color: '#ffffff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Go to Discord
            </a>
          </>
        )}
      </div>
    </div>
  );
}
