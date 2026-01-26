'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import { YouTubeService } from '@/services/youtube';
import Image from 'next/image';
import HelpIcon from '@/components/HelpIcon';
import HelpModal from '@/components/HelpModal';

export default function WrappedPage() {
    const { user, session, loading } = useAuth();
    const router = useRouter();
    const [interests, setInterests] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(true);
    const [showInterestModal, setShowInterestModal] = useState(false);
    const [showNoYouTubeDataModal, setShowNoYouTubeDataModal] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const hasStartedProcessing = useRef(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Start processing immediately when page loads
    useEffect(() => {
        if (!user || !session || hasStartedProcessing.current) return;
        hasStartedProcessing.current = true;
        processUserData();
    }, [user, session]);

    const processUserData = async () => {
        if (!user || !session) return;

        const supabase = createClient();

        try {
            // Poll for interests (processing should have started on onboarding page)
            let pollCount = 0;
            const maxPolls = 20; // Reduced since processing started earlier
            
            while (pollCount < maxPolls) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('interests')
                    .eq('id', user.id)
                    .single();

                const existingInterests = (profile?.interests as string[]) || [];
                
                if (existingInterests.length > 0) {
                    setInterests(existingInterests);
                    setIsProcessing(false);
                    return;
                }

                await new Promise(r => setTimeout(r, 500)); // Poll faster
                pollCount++;
            }

            // If still no interests after polling, check YouTube data
            const { data: ytSubs } = await supabase
                .from('youtube_subscriptions')
                .select('user_id')
                .eq('user_id', user.id)
                .limit(1);

            const { data: ytLikes } = await supabase
                .from('youtube_liked_videos')
                .select('user_id')
                .eq('user_id', user.id)
                .limit(1);

            const hasYouTubeData = (ytSubs?.length ?? 0) > 0 || (ytLikes?.length ?? 0) > 0;

            if (!hasYouTubeData) {
                setShowNoYouTubeDataModal(true);
                return;
            }

            // Last resort: trigger processing again
            try {
                await YouTubeService.deriveInterests(user.id);
            } catch (e) {}

            // Final poll
            for (let i = 0; i < 10; i++) {
                await new Promise(r => setTimeout(r, 1000));
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('interests')
                    .eq('id', user.id)
                    .single();

                const interests = (profile?.interests as string[]) || [];
                if (interests.length > 0) {
                    setInterests(interests);
                    setIsProcessing(false);
                    return;
                }
            }

            // If we get here, just show what we have
            setIsProcessing(false);

        } catch (error) {
            setIsProcessing(false);
        }
    };

    const handleContinue = async () => {
        if (!user) {
            router.push('/network');
            return;
        }

        const supabase = createClient();

        // Mark onboarding as completed
        await supabase
            .from('profiles')
            .update({ has_completed_onboarding: true })
            .eq('id', user.id);

        router.push('/network');
    };

    const handleDeleteAccountNoYouTubeData = async () => {
        if (!user || !session || deletingAccount) return;

        setDeletingAccount(true);
        const supabase = createClient();

        try {
            const { data, error } = await supabase.functions.invoke('delete-account', {
                body: {},
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            await supabase.auth.signOut();
            router.push('/');
        } catch (error: any) {
            alert(`Error deleting account: ${error.message || 'An unexpected error occurred'}`);
            setDeletingAccount(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#111111] flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
            <HelpIcon onClick={() => setIsHelpOpen(true)} />
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
            
            <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center px-4 py-12">
                {/* Interest Graph Content */}
                <div className="w-full max-w-[900px] flex flex-col items-center">
                    <h1 className="text-[28px] md:text-[40px] font-bold text-white font-display mb-8 text-center">
                        Your Interest Graph
                    </h1>
                    
                    <div className="w-full px-4 md:px-8 mb-8">
                        {isProcessing ? (
                            <div className="w-full flex flex-col items-center justify-center gap-8">
                                {/* Animated spinner */}
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-2 border-white/10"></div>
                                    <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-white/60 animate-spin"></div>
                                    <div className="absolute inset-2 w-12 h-12 rounded-full border-2 border-transparent border-b-white/30 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                                </div>

                                <p className="text-gray-400 font-display text-[16px] animate-pulse">
                                    Analyzing your interests...
                                </p>

                                {/* Skeleton pills */}
                                <div className="flex flex-wrap gap-3 justify-center items-center max-w-[600px]">
                                    {[120, 80, 100, 90, 110, 70, 95, 85, 105, 75].map((width, index) => (
                                        <div
                                            key={index}
                                            className="h-12 rounded-full bg-white/5 animate-pulse"
                                            style={{
                                                width: `${width}px`,
                                                animationDelay: `${index * 100}ms`,
                                                animationDuration: '1.5s'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : interests.length > 0 ? (
                            <div className="flex flex-wrap gap-3 md:gap-4 justify-center items-center">
                                {interests.map((interest, index) => (
                                    <span
                                        key={index}
                                        className="px-5 md:px-6 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-full text-white text-[15px] md:text-[18px] font-medium font-display hover:bg-white/10 hover:border-white/20 transition-all cursor-default"
                                    >
                                        {interest}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center">
                                No interests found. Continue to explore your network.
                            </p>
                        )}
                    </div>

                    {/* Question Mark Button */}
                    <button
                        onClick={() => setShowInterestModal(true)}
                        className="mb-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white text-2xl font-bold transition-all hover:scale-110"
                    >
                        ?
                    </button>

                    {/* Continue Button */}
                    {!isProcessing && (
                        <button
                            onClick={handleContinue}
                            className="px-10 py-4 bg-white text-black rounded-full text-lg font-semibold hover:bg-gray-100 transition-all hover:scale-105 active:scale-95"
                        >
                            Continue →
                        </button>
                    )}
                </div>

                {/* TN Logo */}
                <div className="fixed left-4 md:left-6 bottom-6 w-[80px] md:w-[100px] h-[60px] md:h-[80px] opacity-80 pointer-events-none">
                    <Image src="/assets/onboarding/tn_logo.png" alt="TN" fill className="object-contain" />
                </div>
            </div>

            {/* Interest Explanation Modal */}
            {showInterestModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowInterestModal(false)}
                >
                    <div
                        className="relative bg-[#1a1a1a] border border-white/10 rounded-t-[24px] md:rounded-[24px] max-w-2xl w-full md:mx-4 max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="md:hidden flex justify-center pt-3 pb-1 sticky top-0 bg-[#1a1a1a] z-10">
                            <div className="w-10 h-1 bg-white/30 rounded-full"></div>
                        </div>

                        <button
                            onClick={() => setShowInterestModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors z-20"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="p-6 md:p-10">
                            <h2 className="text-[24px] md:text-[32px] font-bold text-white font-display mb-6">
                                How We Map Your Interests
                            </h2>
                            
                            <div className="space-y-4 text-gray-300 font-display text-[15px] leading-relaxed">
                                <p>
                                    We analyze your YouTube subscriptions and liked videos to understand what you genuinely care about.
                                </p>
                                <p>
                                    <strong className="text-white">Channels you follow</strong> show what you choose to keep in your orbit.
                                </p>
                                <p>
                                    <strong className="text-white">Videos you like</strong> show what you actively engage with.
                                </p>
                                <p>
                                    These signals help us find people who share your actual interests — not just what you say you like.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* No YouTube Data Modal */}
            {showNoYouTubeDataModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                    <div className="relative bg-[#1a1a1a] border border-white/10 rounded-[24px] max-w-lg w-full mx-4 p-8">
                        <h2 className="text-[24px] font-bold text-white font-display mb-4">
                            No YouTube Data Found
                        </h2>
                        <p className="text-gray-300 font-display text-[15px] leading-relaxed mb-6">
                            We couldn't find any YouTube subscriptions or liked videos on your account.
                            TheNetwork requires YouTube data to create your profile.
                        </p>
                        <button
                            onClick={handleDeleteAccountNoYouTubeData}
                            disabled={deletingAccount}
                            className="w-full px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-100 transition-all disabled:opacity-50"
                        >
                            {deletingAccount ? 'Deleting Account...' : 'Continue'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
