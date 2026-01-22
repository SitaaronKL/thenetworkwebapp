'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// Reserved routes that should not be treated as campaign codes
const RESERVED_ROUTES = [
  'about',
  'api',
  'auth',
  'consent',
  'digital-dna',
  'discord',
  'edit-profile',
  'invite',
  'invite-friends',
  'invite-leaderboard',
  'memo',
  'msg-aria',
  'network',
  'network-profile',
  'privacy-policy',
  'profile-setup',
  'school-leaderboard',
  'terms-of-service',
  'terms-of-use',
  'youtube-account-disclaimer',
  'youtube-data-review',
];

export default function CampaignLandingPage() {
  const router = useRouter();
  const params = useParams();
  const campaignCode = params?.campaign_code as string;
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const handleCampaign = async () => {
      // Check if this is a reserved route - if so, let Next.js handle it normally
      if (RESERVED_ROUTES.includes(campaignCode)) {
        // This shouldn't happen due to route priority, but just in case
        router.push(`/${campaignCode}`);
        return;
      }

      if (!campaignCode) {
        router.push('/');
        return;
      }

      const supabase = createClient();

      try {
        // Validate that this campaign code exists
        const { data: campaign, error } = await supabase
          .from('ab_marketing_campaigns')
          .select('campaign_code, campaign_name, school, variant, is_active')
          .eq('campaign_code', campaignCode.toLowerCase())
          .eq('is_active', true)
          .single();

        if (error || !campaign) {
          // Invalid campaign code - redirect to home without storing
          console.log('Invalid or inactive campaign code:', campaignCode);
          router.push('/');
          return;
        }

        // Valid campaign - store the campaign code in localStorage
        localStorage.setItem('marketing_campaign_code', campaign.campaign_code);
        localStorage.setItem('marketing_campaign_name', campaign.campaign_name);
        if (campaign.school) {
          localStorage.setItem('marketing_campaign_school', campaign.school);
        }
        localStorage.setItem('marketing_campaign_variant', campaign.variant);
        localStorage.setItem('marketing_campaign_timestamp', new Date().toISOString());

        // Redirect to the main landing page with campaign context
        router.push('/?campaign=' + encodeURIComponent(campaign.campaign_code));
      } catch (err) {
        console.error('Error validating campaign:', err);
        router.push('/');
      }
    };

    handleCampaign();
  }, [campaignCode, router]);

  // Show a brief loading state while validating
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#000000',
      color: '#ffffff'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderTop: '3px solid #ffffff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ opacity: 0.7 }}>Loading...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
