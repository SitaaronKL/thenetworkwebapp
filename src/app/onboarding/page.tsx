'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function OnboardingPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToTermsOfService, setAgreedToTermsOfService] = useState(false);
  const [agreedToTermsOfUse, setAgreedToTermsOfUse] = useState(false);
  const [shake, setShake] = useState(false);

  const allAgreed = agreedToPrivacy && agreedToTermsOfService && agreedToTermsOfUse;

  // If already authenticated, redirect to home
  useEffect(() => {
    if (!loading && user) {
      router.push('/network');
    }
  }, [user, loading, router]);

  const handleAcceptAll = () => {
    setAgreedToPrivacy(true);
    setAgreedToTermsOfService(true);
    setAgreedToTermsOfUse(true);
  };

  const handleContinue = () => {
    if (!allAgreed) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    // Store consent
    localStorage.setItem('consent_agreed', 'true');
    localStorage.setItem('consent_timestamp', new Date().toISOString());
    // Trigger Google sign-in
    signInWithGoogle();
  };

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full flex flex-col gap-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4 font-display tracking-tight">
            Welcome to TheNetwork
          </h1>
          <p className="text-lg text-gray-600 font-display">
            Connect with people based on who you truly are
          </p>
        </div>

        {/* Accept All Button */}
        <div className="flex justify-center">
          <button
            onClick={handleAcceptAll}
            className="px-6 py-3 bg-black text-white rounded-full font-semibold text-sm hover:bg-gray-800 transition-all duration-200 hover:scale-105 shadow-lg font-display"
          >
            Accept All
          </button>
        </div>

        {/* Agreement Items */}
        <div className="flex flex-col gap-5">
          {/* Privacy Policy */}
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToPrivacy}
                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-black cursor-pointer flex-shrink-0"
              />
              <span className="text-base text-gray-800 font-display leading-relaxed">
                I have read and agree to the{' '}
                <Link href="/privacy-policy" target="_blank" className="underline hover:text-black font-medium">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          {/* Terms of Service */}
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTermsOfService}
                onChange={(e) => setAgreedToTermsOfService(e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-black cursor-pointer flex-shrink-0"
              />
              <span className="text-base text-gray-800 font-display leading-relaxed">
                I have read and agree to the{' '}
                <Link href="/terms-of-service" target="_blank" className="underline hover:text-black font-medium">
                  Terms of Service
                </Link>
              </span>
            </label>
          </div>

          {/* Terms of Use */}
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTermsOfUse}
                onChange={(e) => setAgreedToTermsOfUse(e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-black cursor-pointer flex-shrink-0"
              />
              <span className="text-base text-gray-800 font-display leading-relaxed">
                I have read and agree to the{' '}
                <Link href="/terms-of-use" target="_blank" className="underline hover:text-black font-medium">
                  Terms of Use
                </Link>
              </span>
            </label>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-gray-100 rounded-lg border-l-4 border-black">
          <p className="text-sm text-gray-600 font-display leading-relaxed">
            By agreeing, you acknowledge that you have read, understood, and accept all three policies.
            You can review these policies at any time using the links above.
          </p>
        </div>

        {/* Continue with Google Button */}
        <button
          onClick={handleContinue}
          disabled={!allAgreed}
          className={`relative group transition-all duration-200 ${!allAgreed ? 'opacity-50 grayscale cursor-not-allowed' : 'opacity-100 cursor-pointer'} ${shake ? 'animate-shake' : ''}`}
        >
          <div className="flex items-center justify-center overflow-clip px-6 md:px-8 py-4 md:py-5 relative rounded-[100px] shadow-[0px_0px_2px_0px_rgba(0,0,0,0.1),0px_1px_8px_0px_rgba(0,0,0,0.1)] bg-white transition-transform group-hover:scale-105">
            <div className="absolute inset-0 pointer-events-none shadow-[inset_3px_3px_0.5px_-3.5px_white,inset_2px_2px_0.5px_-2px_#262626,inset_-2px_-2px_0.5px_-2px_#262626,inset_0px_0px_0px_1px_#a6a6a6,inset_0px_0px_8px_0px_#f2f2f2] rounded-[100px]" />
            <span className="text-lg md:text-xl font-semibold text-black font-display tracking-tight mr-2">
              Continue with Google
            </span>
            <span className="text-lg md:text-xl font-semibold text-black font-display">
              →
            </span>
          </div>
        </button>

        {/* YouTube Permissions Notice */}
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500 font-display leading-relaxed max-w-lg mx-auto">
            Please give us permissions to view your YouTube information so that we can connect you to people who are similar to you.
          </p>
        </div>

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
