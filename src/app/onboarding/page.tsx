'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

// Card 1: Social media is draining
function Card1({ className = '' }: { className?: string }) {
  return (
    <div className={`relative bg-[rgba(38,38,38,0.55)] h-[600px] w-[393px] overflow-hidden rounded-[40px] flex-shrink-0 ${className}`}>
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute h-[899px] left-[calc(50%+9.5px)] top-[calc(50%+75px)] translate-x-[-50%] translate-y-[-50%] w-[906px]">
            <div className="absolute inset-[-14.3%_-14.19%]">
              <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1164 1157">
                <g filter="url(#filter0_f_5_115)">
                  <ellipse cx="581.592" cy="578.092" fill="url(#paint0_radial_5_115)" rx="453" ry="449.5" />
                </g>
                <defs>
                  <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1156.18" id="filter0_f_5_115" width="1163.18" x="0" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_5_115" stdDeviation="64.296" />
                  </filter>
                  <radialGradient cx="0" cy="0" gradientTransform="translate(581.592 578.092) rotate(90) scale(449.5 453)" gradientUnits="userSpaceOnUse" id="paint0_radial_5_115" r="1">
                    <stop stopColor="#BEE3DB" />
                    <stop offset="0.39" stopColor="#78A1BB" />
                    <stop offset="0.71" stopColor="#1E6091" />
                    <stop offset="1" stopColor="#1B4965" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="absolute left-[calc(50%-0.5px)] size-[906px] top-[calc(50%+93.5px)] translate-x-[-50%] translate-y-[-50%] w-[906px] h-[906px]">
            <div className="absolute inset-[-14.19%]">
              <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1164 1164">
                <g filter="url(#filter0_f_5_117)">
                  <circle cx="581.592" cy="581.592" fill="url(#paint0_radial_5_117)" r="453" />
                </g>
                <defs>
                  <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1163.18" id="filter0_f_5_117" width="1163.18" x="0" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_5_117" stdDeviation="64.296" />
                  </filter>
                  <radialGradient cx="0" cy="0" gradientTransform="translate(581.592 581.592) rotate(90) scale(453)" gradientUnits="userSpaceOnUse" id="paint0_radial_5_117" r="1">
                    <stop stopColor="#4263EB" />
                    <stop offset="0.45" stopColor="#7F77C8" />
                    <stop offset="0.67" stopColor="#B2A5E0" />
                    <stop offset="1" stopColor="#E2D6FA" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
      </div>

      {/* Content */}
      <div className="absolute h-[798px] left-[-1px] top-[-103px] w-[393px]">
          {/* Inner Disks */}
          <div className="absolute left-[calc(50%-0.5px)] size-[906px] top-[calc(50%+181px)] translate-x-[-50%] translate-y-[-50%] w-[906px] h-[906px] pointer-events-none">
            <div className="absolute inset-[-14.19%]">
              <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1164 1164">
                <g filter="url(#filter0_f_5_111)">
                  <circle cx="581.592" cy="581.592" fill="url(#paint0_radial_5_111)" r="453" />
                </g>
                <defs>
                  <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1163.18" id="filter0_f_5_111" width="1163.18" x="0" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_5_111" stdDeviation="64.296" />
                  </filter>
                  <radialGradient cx="0" cy="0" gradientTransform="translate(581.592 581.592) rotate(90) scale(453)" gradientUnits="userSpaceOnUse" id="paint0_radial_5_111" r="1">
                    <stop stopColor="#FFD3B6" />
                    <stop offset="0.45" stopColor="#FFAAA5" />
                    <stop offset="0.67" stopColor="#FC887B" />
                    <stop offset="1" stopColor="#FF6868" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="absolute left-[calc(50%+9.5px)] size-[906px] top-[calc(50%+103px)] translate-x-[-50%] translate-y-[-50%] w-[906px] h-[906px] pointer-events-none">
            <div className="absolute inset-[-14.19%]">
              <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1164 1164">
                <g filter="url(#filter0_f_5_113)">
                  <circle cx="581.592" cy="581.592" fill="url(#paint0_radial_5_113)" r="453" />
                </g>
                <defs>
                  <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1163.18" id="filter0_f_5_113" width="1163.18" x="0" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_5_113" stdDeviation="64.296" />
                  </filter>
                  <radialGradient cx="0" cy="0" gradientTransform="translate(581.592 581.592) rotate(90) scale(453)" gradientUnits="userSpaceOnUse" id="paint0_radial_5_113" r="1">
                    <stop stopColor="#1B4965" />
                    <stop offset="0.39" stopColor="#1E6091" />
                    <stop offset="0.71" stopColor="#78A1BB" />
                    <stop offset="1" stopColor="#BEE3DB" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
          
          {/* Text */}
          <div 
            className="absolute content-stretch flex flex-col gap-[14px] items-start leading-[0] left-[20px] not-italic text-white w-[353px]"
            style={{ top: '512px' }}
          >
            <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center relative shrink-0 text-[34px] tracking-[-1.7px] w-[373px]">
              <p className="leading-[38px] mb-0 font-display">Social media is draining</p>
            </div>
            <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium justify-center min-w-full relative shrink-0 text-[16px] tracking-[-0.48px] w-[min-content]">
              <p className="leading-[24px] font-display">{`And honestly? Kind of broken. Constantly building an online presence for likes. Chasing trends. New posts just to keep things alive. It's exhausting. `}</p>
            </div>
          </div>

          {/* Icon */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 size-[300px] w-[300px] h-[300px]"
            style={{ top: '182px' }}
          >
            <div className="relative w-full h-full">
              <Image 
                src="/assets/onboarding/a2f182e7f7b59b4fe488bf754951d5e8a7987a98.png" 
                alt="" 
                fill 
                className="object-contain"
              />
            </div>
          </div>
      </div>
    </div>
  );
}

// Card 2: Instagram grid
function Card2({ className = '' }: { className?: string }) {
  return (
    <div className={`relative bg-[rgba(38,38,38,0.55)] h-[600px] w-[373px] overflow-hidden rounded-[40px] flex-shrink-0 ${className}`}>
      {/* Background Gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[calc(50%-0.5px)] size-[906px] top-[calc(50%+93.5px)] translate-x-[-50%] translate-y-[-50%] w-[906px] h-[906px]">
          <div className="absolute inset-[-14.19%]">
            <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1164 1164">
              <g filter="url(#filter0_f_5_117)">
                <circle cx="581.592" cy="581.592" fill="url(#paint0_radial_5_117)" r="453" />
              </g>
              <defs>
                <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1163.18" id="filter0_f_5_117" width="1163.18" x="0" y="0">
                  <feFlood floodOpacity="0" result="BackgroundImageFix" />
                  <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                  <feGaussianBlur result="effect1_foregroundBlur_5_117" stdDeviation="64.296" />
                </filter>
                <radialGradient cx="0" cy="0" gradientTransform="translate(581.592 581.592) rotate(90) scale(453)" gradientUnits="userSpaceOnUse" id="paint0_radial_5_117" r="1">
                  <stop stopColor="#FFD600" />
                  <stop offset="0.45" stopColor="#FF6B00" />
                  <stop offset="0.67" stopColor="#D70000" />
                  <stop offset="1" stopColor="#8700FF" />
                </radialGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="absolute h-[798px] left-0 top-[54px] w-[393px]">
        {/* Inner Disk */}
        <div className="absolute left-[calc(50%+0.5px)] size-[906px] top-[calc(50%+96px)] translate-x-[-50%] translate-y-[-50%] w-[906px] h-[906px] pointer-events-none">
          <div className="absolute inset-[-14.19%]">
            <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1164 1164">
              <g filter="url(#filter0_f_5_109)">
                <circle cx="581.592" cy="581.592" fill="url(#paint0_radial_5_109)" r="453" />
              </g>
              <defs>
                <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1163.18" id="filter0_f_5_109" width="1163.18" x="0" y="0">
                  <feFlood floodOpacity="0" result="BackgroundImageFix" />
                  <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                  <feGaussianBlur result="effect1_foregroundBlur_5_109" stdDeviation="64.296" />
                </filter>
                <radialGradient cx="0" cy="0" gradientTransform="translate(581.592 581.592) rotate(90) scale(453)" gradientUnits="userSpaceOnUse" id="paint0_radial_5_109" r="1">
                  <stop stopColor="#D70000" />
                  <stop offset="0.45" stopColor="#FFD600" />
                  <stop offset="0.67" stopColor="#FF6B00" />
                  <stop offset="1" stopColor="#8700FF" />
                </radialGradient>
              </defs>
            </svg>
          </div>
        </div>
        
        {/* Text */}
        <div 
            className="absolute content-stretch flex flex-col items-start left-[20px] w-[353px]"
            style={{ top: '440px' }}
        >
          <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium justify-center leading-[0] not-italic relative shrink-0 text-[16px] text-white tracking-[-0.48px] w-full">
            <p className="leading-[24px] font-display">{`The real you is in your Spotify on repeat, your 3am YouTube rabbit holes, your Discord convos. That's where your actual personality lives.`}</p>
          </div>
        </div>
        <div 
            className="absolute flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center leading-[0] left-[22px] not-italic text-[34px] text-white tracking-[-1.7px] translate-y-[-50%] w-[353px]"
            style={{ top: '380px' }}
        >
          <p className="leading-[38px] mb-0 font-display">Instagram grid is not the real you</p>
        </div>

        {/* Icon */}
        <div 
            className="absolute left-1/2 -translate-x-1/2 size-[300px] w-[300px] h-[300px]"
            style={{ top: '22px' }}
        >
          <div className="relative w-full h-full">
            <Image 
                src="/assets/onboarding/375d0ae05acd14e7200b69d5022248f54102f91f.png" 
                alt="" 
                fill 
                className="object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Card 3: No more performing
function Card3({ className = '' }: { className?: string }) {
  return (
    <div className={`relative bg-[rgba(38,38,38,0.55)] h-[600px] w-[365px] overflow-hidden rounded-[40px] flex-shrink-0 ${className}`}>
      {/* Background Gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[calc(50%-0.5px)] size-[906px] top-[calc(50%+139px)] translate-x-[-50%] translate-y-[-50%] w-[906px] h-[906px]">
            <div className="absolute inset-[-14.19%]">
            <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1164 1164">
                <g filter="url(#filter0_f_5_113)">
                <circle cx="581.592" cy="581.592" fill="url(#paint0_radial_5_113)" r="453" />
                </g>
                <defs>
                <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1163.18" id="filter0_f_5_113" width="1163.18" x="0" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_5_113" stdDeviation="64.296" />
                </filter>
                <radialGradient cx="0" cy="0" gradientTransform="translate(581.592 581.592) rotate(90) scale(453)" gradientUnits="userSpaceOnUse" id="paint0_radial_5_113" r="1">
                    <stop stopColor="#40E842" />
                    <stop offset="0.45" stopColor="#39C9F5" />
                    <stop offset="0.67" stopColor="#2F80ED" />
                    <stop offset="1" stopColor="#9A32CD" />
                </radialGradient>
                </defs>
            </svg>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="absolute h-[798px] left-[11px] top-[-49px] w-[393px]">
        <div className="absolute inset-[-25.39%_-107.78%_-28.02%_-114.4%] pointer-events-none">
            <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1267 1225">
            <g>
                <g filter="url(#filter0_f_5_119)">
                <ellipse cx="633.092" cy="612.092" fill="url(#paint0_radial_5_119)" rx="504.5" ry="483.5" />
                </g>
            </g>
            <defs>
                <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1224.18" id="filter0_f_5_119" width="1266.18" x="-1.52588e-05" y="0">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                <feGaussianBlur result="effect1_foregroundBlur_5_119" stdDeviation="64.296" />
                </filter>
                <radialGradient cx="0" cy="0" gradientTransform="translate(633.092 612.092) rotate(90) scale(483.5 504.5)" gradientUnits="userSpaceOnUse" id="paint0_radial_5_119" r="1">
                <stop stopColor="#9A32CD" />
                <stop offset="0.45" stopColor="#40E842" />
                <stop offset="0.67" stopColor="#39C9F5" />
                <stop offset="1" stopColor="#FF6E66" />
                </radialGradient>
            </defs>
            </svg>
        </div>
      </div>

      {/* Icon */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 size-[300px] w-[300px] h-[300px]"
        style={{ top: '73px' }}
      >
        <div className="relative w-full h-full">
            <Image 
                src="/assets/onboarding/0bf184c5cd6e5a5fd5f2c0aadf7ab81aee0e2cb2.png" 
                alt="" 
                fill 
                className="object-cover"
            />
        </div>
      </div>

        {/* Text */}
      <div 
        className="absolute content-stretch flex flex-col gap-[14px] items-start leading-[0] left-[19px] not-italic text-white w-[327px]"
        style={{ top: '396px' }}
      >
        <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center leading-[38px] relative shrink-0 text-[34px] tracking-[-1.7px] w-full">
            <p className="mb-0 font-display">No more performing.</p>
        </div>
        <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium justify-center relative shrink-0 text-[16px] tracking-[-0.48px] w-full">
            <p className="leading-[24px] font-display">{`TheNetwork distills your online life into who you actually are then connects you with people who get your interests. `}</p>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
    const { user, loading, signInWithGoogle } = useAuth();
    const router = useRouter();

    // Check if user has consented to policies
    useEffect(() => {
        const hasConsented = localStorage.getItem('consent_agreed');
        if (!hasConsented) {
            router.push('/consent');
        }
    }, [router]);

    // If already authenticated, redirect to home
    useEffect(() => {
        if (!loading && user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) {
        return null;
    }

    return (
     <div className="h-screen bg-white flex flex-col items-center pt-12 pb-4 px-4 gap-4 overflow-hidden relative">
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-[1280px] justify-center items-center md:items-start h-full md:scale-[0.70] md:origin-top">
             <Card1 className="snap-center" />
             <Card2 className="snap-center" />
             <Card3 className="snap-center" />
        </div>

        <div className="flex flex-col items-center gap-4 pb-12 fixed bottom-0 left-0 right-0 pointer-events-none">
            <button 
                onClick={signInWithGoogle}
                className="pointer-events-auto relative group"
            >
                <div className="flex items-center overflow-clip px-[21px] py-[14px] relative rounded-[100px] shadow-[0px_0px_2px_0px_rgba(0,0,0,0.1),0px_1px_8px_0px_rgba(0,0,0,0.1)] bg-white transition-transform group-hover:scale-105">
                    <div className="absolute inset-0 pointer-events-none shadow-[inset_3px_3px_0.5px_-3.5px_white,inset_2px_2px_0.5px_-2px_#262626,inset_-2px_-2px_0.5px_-2px_#262626,inset_0px_0px_0px_1px_#a6a6a6,inset_0px_0px_8px_0px_#f2f2f2] rounded-[100px]" />
                    <span className="text-[20px] font-semibold text-black font-display tracking-tight mr-2">
                        Continue with Google
                    </span>
                    <span className="text-[20px] font-semibold text-black font-display">
                        →
                    </span>
                </div>
            </button>
        </div>
    </div>
  );
}
