'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // If already authenticated, redirect to home
    useEffect(() => {
        // Ensure theme is not inverted on landing page
        document.documentElement.style.filter = '';
        document.documentElement.style.backgroundColor = '';
        document.documentElement.classList.remove('theme-inverted');

        if (!loading && user) {
            router.push('/');
        }
    }, [user, loading, router]);

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

                {/* CTA Button */}
                <button 
                    onClick={() => router.push('/consent')}
                    className="group relative w-[363px] h-[72px] rounded-[70px] bg-gradient-to-r from-[#333333] via-[#000000] to-[#666666] flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer"
                >
                    <span className="text-white text-[25px] font-bold font-display">
                        Claim my Digital DNA
                    </span>
                    </button>
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
                </div>
            </footer>
        </div>
    );
}
