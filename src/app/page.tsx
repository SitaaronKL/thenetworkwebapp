'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [showInfo, setShowInfo] = useState(false);
    
    // Check for review query parameter (for easy testing) - using window.location
    const [isReviewMode, setIsReviewMode] = useState(false);
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setIsReviewMode(params.get('review') === 'true');
        }
    }, []);

    // If already authenticated, redirect to home (unless in review mode)
    useEffect(() => {
        // Ensure theme is not inverted on landing page
        document.documentElement.style.filter = '';
        document.documentElement.style.backgroundColor = '';
        document.documentElement.classList.remove('theme-inverted');

        if (!loading && user && !isReviewMode) {
            router.push('/network');
        }
    }, [user, loading, router, isReviewMode]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (showInfo) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showInfo]);

    if (loading) {
        return null;
    }

    return (
        <div className="relative w-full min-h-screen bg-white flex flex-col items-center overflow-hidden">
             {/* Main Content Centered */}
             <main className="flex-1 flex flex-col items-center justify-center w-full max-w-[1280px] px-4 gap-8">
                {/* Logo Image - Scaled up to remove whitespace */}
                <div className="relative w-full max-w-[862px] aspect-[862/172] scale-[5] origin-center">
                    <Image
                        src="/assets/onboarding/608c2b81e2a5bd67e038a321a7b3790319e41243.png"
                        alt="The Network"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>

                {/* Headline */}
                <h1 className="text-[40px] md:text-[60px] font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-[#333333] via-[#000000] to-[#666666] leading-tight font-display tracking-tight">
                    Control who you are online
                </h1>

                {/* Info Button */}
                <button
                    onClick={() => setShowInfo(true)}
                    type="button"
                    className="flex items-center gap-2 text-[#7a7a7a] hover:text-[#333333] transition-colors font-display text-[14px] cursor-pointer bg-transparent border-none p-2 z-10 relative"
                    aria-label="Learn more about TheNetwork"
                >
                    <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="flex-shrink-0"
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span>Learn more</span>
                </button>

                {/* Modal Overlay */}
                {showInfo && (
                    <>
                        {/* Backdrop */}
                        <div 
                            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                            onClick={() => setShowInfo(false)}
                        >
                            {/* Modal Content */}
                            <div 
                                className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl relative"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Close Button */}
                                <button
                                    onClick={() => setShowInfo(false)}
                                    type="button"
                                    className="absolute top-4 right-4 text-[#7a7a7a] hover:text-[#333333] transition-colors z-10"
                                    aria-label="Close"
                                >
                                    <svg 
                                        width="24" 
                                        height="24" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                    >
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>

                                {/* Modal Content */}
                                <div className="p-8 space-y-6">
                                    <h2 className="text-2xl font-bold text-[#333333] font-display text-center">
                                        About TheNetwork
                                    </h2>
                                    
                                    <div className="space-y-4 text-center">
                                        <p className="text-[16px] md:text-[18px] text-[#333333] leading-relaxed font-display">
                                            Find friends and communities built around shared interests.
                                        </p>
                                        <p className="text-[16px] md:text-[18px] text-[#333333] leading-relaxed font-display">
                                            Sign in with Google to create your profile. If you choose to connect YouTube (read-only), we use your subscriptions and liked videos to infer interest topics and recommend people with similar interests.
                                        </p>
                                        <p className="text-[16px] md:text-[18px] text-[#333333] leading-relaxed font-display">
                                            YouTube access is read-only. We do not upload videos, post comments, modify subscriptions, or change anything in your YouTube account.
                                        </p>
                                        <p className="text-[16px] md:text-[18px] text-[#333333] leading-relaxed font-display">
                                            You can manage your YouTube connection and delete imported YouTube data in Settings.
                                        </p>
                                    </div>
                                    
                                    {/* Links */}
                                    <div className="flex flex-col items-center gap-3 text-center mt-6 pt-6 border-t border-[#e0e0e0]">
                                        {(() => {
                                            const reviewEnabled = process.env.NEXT_PUBLIC_YT_REVIEW_ENABLED === 'true';
                                            const isAuthenticated = !!user;
                                            
                                            // Determine link destination
                                            let youtubeDataLink = '/privacy-policy#youtube';
                                            if (reviewEnabled && isAuthenticated) {
                                                youtubeDataLink = '/youtube-data-review';
                                            }
                                            
                                            return (
                                                <Link 
                                                    href={youtubeDataLink}
                                                    onClick={() => setShowInfo(false)}
                                                    className="text-[14px] text-[#333333] hover:text-[#000000] underline underline-offset-2 font-display transition-colors"
                                                >
                                                    Learn how we use YouTube data
                                                </Link>
                                            );
                                        })()}
                                        <Link 
                                            href="mailto:privacy@thenetwork.life"
                                            onClick={() => setShowInfo(false)}
                                            className="text-[14px] text-[#333333] hover:text-[#000000] underline underline-offset-2 font-display transition-colors"
                                        >
                                            Contact
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* CTA Button */}
                <div className="flex flex-col items-center gap-2">
                    <button 
                        onClick={() => router.push('/consent')}
                        type="button"
                        className="group relative w-[363px] h-[72px] rounded-[70px] bg-gradient-to-r from-[#333333] via-[#000000] to-[#666666] flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer border-none"
                    >
                        <span className="text-white text-[25px] font-bold font-display">
                            Claim my Digital DNA
                        </span>
                    </button>
                </div>
             </main>

             {/* Footer Section */}
             <footer className="w-full py-8 flex flex-col items-center gap-4 text-center">
                <p className="text-black text-[15px] font-display">
                    Private by default • You control what you connect • Delete anytime
                </p>
                <div className="flex gap-8 text-[#7a7a7a] text-[10px] font-display">
                    <a href="/privacy-policy" className="hover:text-black">Privacy</a>
                    <a href="/terms-of-service" className="hover:text-black">Terms of Service</a>
                    <a href="/terms-of-use" className="hover:text-black">Terms of Use</a>
                    <a href="mailto:privacy@thenetwork.life" className="hover:text-black">Contact</a>
                </div>
            </footer>
        </div>
    );
}

