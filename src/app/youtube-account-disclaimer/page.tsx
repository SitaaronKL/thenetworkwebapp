'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function YouTubeAccountDisclaimerPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [shake, setShake] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  // Theme persistence - sync with homepage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme_mode');
    if (saved === 'light') {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Apply global theme class
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Clean up any leftover style filters (this page has its own theme handling)
    document.documentElement.style.filter = '';
    document.documentElement.classList.remove('theme-light');
  }, [theme, mounted]);

  // If already authenticated, redirect
  if (!loading && user) {
    router.push('/network');
    return null;
  }

  if (loading || !mounted) {
    return null;
  }

  const handleContinue = () => {
    if (!hasAcknowledged) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    // Store acknowledgment
    localStorage.setItem('youtube_account_disclaimer_acknowledged', 'true');
    // Navigate to onboarding
    router.push('/consent');
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 py-8 transition-colors duration-500 ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
      {/* Back Button */}
      <div className="absolute top-8 left-8">
        <button
          onClick={() => router.back()}
          className={`flex items-center gap-2 hover:opacity-70 transition-opacity font-display ${theme === 'dark' ? 'text-white' : 'text-black'}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
      </div>

      <div className="max-w-2xl w-full">
        {/* Icon/Visual */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className={`text-4xl md:text-5xl font-bold text-center mb-8 font-display tracking-tight transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
          Use Your Most Active YouTube Account
        </h1>

        {/* Main Content */}
        <div className="space-y-6 mb-8">
          <div className={`rounded-2xl p-6 border transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a1a1a] border-[rgba(255,255,255,0.1)]' : 'bg-[#f3f3f5] border-[rgba(0,0,0,0.1)]'}`}>
            <p className={`text-lg leading-relaxed font-display transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
              <strong className="font-semibold">Important:</strong> TheNetwork uses your YouTube watch history to understand your interests and connect you with like-minded people.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 transition-colors duration-500 ${theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}>
                1
              </div>
              <div>
                <p className={`text-base leading-relaxed font-display transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  <strong className="font-semibold">Sign in with the Google account</strong> that has your most accurate YouTube history
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 transition-colors duration-500 ${theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}>
                2
              </div>
              <div>
                <p className={`text-base leading-relaxed font-display transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  This should be the account where you <strong className="font-semibold">actively watch videos</strong>, subscribe to channels, and like content
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 transition-colors duration-500 ${theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}>
                3
              </div>
              <div>
                <p className={`text-base leading-relaxed font-display transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  The more accurate your YouTube history, the <strong className="font-semibold">better we can match you</strong> with people who share your genuine interests
                </p>
              </div>
            </div>
          </div>

          <div className={`border rounded-xl p-4 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#2a2a1a] border-[#ffd700]/30' : 'bg-[#fff9e6] border-[#ffd700]/30'}`}>
            <p className={`text-sm font-display transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
              <strong className="font-semibold">Note:</strong> If you use a work account or an account with limited YouTube activity, you may not get the best experience. We recommend using your personal account with the most YouTube history.
            </p>
          </div>
        </div>

        {/* Acknowledgment Checkbox */}
        <div className="flex items-center gap-3 mb-6">
          <input
            type="checkbox"
            id="acknowledge-checkbox"
            checked={hasAcknowledged}
            onChange={(e) => setHasAcknowledged(e.target.checked)}
            className={`w-5 h-5 cursor-pointer rounded transition-colors duration-500 ${theme === 'dark' ? 'accent-white' : 'accent-black'}`}
          />
          <label htmlFor="acknowledge-checkbox" className={`text-base cursor-pointer select-none font-display transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
            I understand and will use my most active YouTube account
          </label>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className={`w-full relative group transition-all duration-200 ${!hasAcknowledged ? 'opacity-50 grayscale' : 'opacity-100'} ${shake ? 'animate-shake' : ''}`}
        >
          <div className={`flex items-center justify-center overflow-clip px-6 py-4 relative rounded-[100px] transition-all duration-500 group-hover:scale-105 ${theme === 'dark' ? 'bg-white shadow-[0px_0px_2px_0px_rgba(255,255,255,0.1),0px_1px_8px_0px_rgba(255,255,255,0.1)]' : 'bg-white shadow-[0px_0px_2px_0px_rgba(0,0,0,0.1),0px_1px_8px_0px_rgba(0,0,0,0.1)]'}`}>
            <div className={`absolute inset-0 pointer-events-none rounded-[100px] transition-all duration-500 ${theme === 'dark' ? 'shadow-[inset_3px_3px_0.5px_-3.5px_white,inset_2px_2px_0.5px_-2px_#ffffff,inset_-2px_-2px_0.5px_-2px_#ffffff,inset_0px_0px_0px_1px_#a6a6a6,inset_0px_0px_8px_0px_#f2f2f2]' : 'shadow-[inset_3px_3px_0.5px_-3.5px_white,inset_2px_2px_0.5px_-2px_#262626,inset_-2px_-2px_0.5px_-2px_#262626,inset_0px_0px_0px_1px_#a6a6a6,inset_0px_0px_8px_0px_#f2f2f2]'}`} />
            <span className={`text-lg font-semibold font-display tracking-tight mr-2 transition-colors duration-500 ${theme === 'dark' ? 'text-black' : 'text-black'}`}>
              Continue
            </span>
            <span className={`text-lg font-semibold font-display transition-colors duration-500 ${theme === 'dark' ? 'text-black' : 'text-black'}`}>
              →
            </span>
          </div>
        </button>

        <style jsx>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
          .animate-shake {
            animation: shake 0.2s ease-in-out 0s 2;
          }
        `}</style>
      </div>
    </div>
  );
}
