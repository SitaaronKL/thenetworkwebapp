'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';

interface Platform {
    id: string;
    name: string;
    iconSrc: string;
    available: boolean;
}

const PLATFORMS: Platform[] = [
    { id: 'youtube', name: 'YouTube', iconSrc: '/assets/onboarding/c03b16a838943601b568f85a732d40b331a3645f.png', available: true },
    { id: 'tiktok', name: 'TikTok', iconSrc: '/assets/onboarding/23739bb8c257e76598939f2f873c2af197df83eb.png', available: false },
    { id: 'spotify', name: 'Spotify', iconSrc: '/assets/onboarding/6cbcd0541086377a8e76509a362e721b3b5cdf11.png', available: false },
];

export default function SignalsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
    const [showTooltip, setShowTooltip] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/landing');
        }
    }, [user, loading, router]);

    // Check which platforms are already connected
    useEffect(() => {
        if (!user) return;

        const checkConnectedPlatforms = async () => {
            const supabase = createClient();

            // Check if YouTube data exists
            const { data: ytData } = await supabase
                .from('youtube_subscriptions')
                .select('channel_id')
                .eq('user_id', user.id)
                .limit(1);

            if (ytData && ytData.length > 0) {
                setConnectedPlatforms(['youtube']);
            }
        };

        checkConnectedPlatforms();
    }, [user]);

    const handlePlatformClick = (platform: Platform) => {
        if (!platform.available) {
            setShowTooltip(platform.id);
            setTimeout(() => setShowTooltip(null), 2000);
            return;
        }

        if (platform.id === 'youtube') {
            if (connectedPlatforms.includes('youtube')) {
                // Already connected
                setShowTooltip('youtube-connected');
                setTimeout(() => setShowTooltip(null), 2000);
            } else {
                // YouTube is connected via Google OAuth at sign-in
                // Show that it's already available due to Google sign-in
                setShowTooltip('youtube-ready');
                setTimeout(() => setShowTooltip(null), 2000);
                setConnectedPlatforms(prev => [...prev, 'youtube']);
            }
        }
    };

    const handleContinue = async () => {
        setIsProcessing(true);
        // Navigate to building page - the actual processing happens there
        router.push('/profile-setup/building');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col items-center py-12 px-4 relative overflow-hidden">
            {/* Progress Bar Container */}
            <div className="w-full max-w-[600px] flex flex-col gap-2 mb-12">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[15px] font-normal text-black font-display">Build your Digital DNA</span>
                    <span className="text-[15px] font-normal text-black font-display">50%</span>
                </div>
                <div className="w-full h-[10px] bg-white border border-black relative">
                    <div className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-b from-[#252525] to-[#454545]"></div>
                </div>
            </div>

            <h1 className="text-[30px] font-bold text-black font-display mb-8">Add signals (optional)</h1>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-[600px] justify-items-center">
                {PLATFORMS.map(platform => (
                    <div
                        key={platform.id}
                        onClick={() => handlePlatformClick(platform)}
                        className={`
                            relative w-full max-w-[150px] aspect-[150/100] border border-black flex items-center justify-center cursor-pointer transition-all
                            ${connectedPlatforms.includes(platform.id) ? 'bg-gray-100 ring-2 ring-black' : 'bg-white hover:bg-gray-50'}
                            ${!platform.available ? 'opacity-50 grayscale' : ''}
                        `}
                    >
                        <div className="relative w-full h-full p-4">
                            <Image
                                src={platform.iconSrc}
                                alt={platform.name}
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 50vw, 150px"
                            />
                        </div>

                        {/* Tooltips */}
                        {showTooltip === platform.id && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-xs py-1 px-2 rounded font-display z-20">
                                Coming Soon
                            </div>
                        )}
                        {showTooltip === 'youtube-connected' && platform.id === 'youtube' && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-xs py-1 px-2 rounded font-display z-20">
                                Already connected!
                            </div>
                        )}
                        {showTooltip === 'youtube-ready' && platform.id === 'youtube' && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-green-600 text-white text-xs py-1 px-2 rounded font-display z-20">
                                Connected via Google!
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Continue Button */}
            <button
                onClick={handleContinue}
                disabled={isProcessing}
                className="mt-12 text-[30px] font-bold text-black font-display hover:opacity-70 transition-opacity disabled:opacity-50 cursor-pointer"
            >
                {isProcessing ? 'Processing...' : 'Continue →'}
            </button>
        </div>
    );
}
