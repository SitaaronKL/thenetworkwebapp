'use client';

import { useEffect, useState } from 'react';

type InstagramFloatProps = {
  variant?: 'floating' | 'navbar';
  /** For navbar variant: true = dark background (show white icon), false = light background (show black icon) */
  isOnDarkBackground?: boolean;
};

export default function InstagramFloat({ variant = 'floating', isOnDarkBackground = false }: InstagramFloatProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Only run scroll detection for floating variant
    if (variant !== 'floating') return;

    const handleScroll = () => {
      // Detect if we're scrolled past the first section (hero)
      // Hero section is 100vh, so if scrollY > 50% of viewport height, we're transitioning
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      
      // Start transitioning when we scroll more than 50vh
      if (scrollY > viewportHeight * 0.5) {
        setIsDark(true);
      } else {
        setIsDark(false);
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [variant]);

  const handleClick = () => {
    const instagramUrl = 'https://www.instagram.com/join.thenetwork/';
    
    // Check if mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Try to open Instagram app first, fallback to browser
      window.location.href = instagramUrl;
    } else {
      // Open in new tab for desktop
      window.open(instagramUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const isFloating = variant === 'floating';

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center transition-all duration-700 ease-in-out hover:scale-110 active:scale-95
        ${isFloating ? 'fixed z-50 bottom-12 left-4 w-6 h-6 mix-blend-difference md:bottom-24 md:left-6 md:w-14 md:h-14 md:mix-blend-difference' : 'w-12 h-12 md:w-16 md:h-16'}
        ${
          isFloating
            ? isDark
              ? 'md:mix-blend-difference'
              : 'md:mix-blend-difference'
            : ''
        }`}
      aria-label="Follow us on Instagram"
      title="Follow us on Instagram"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`w-6 h-6 md:w-7 md:h-7 transition-all duration-300 ${
          isFloating 
            ? 'brightness-0 invert' 
            : isOnDarkBackground 
              ? 'brightness-0 invert' 
              : 'brightness-0'
        }`}
      >
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    </button>
  );
}

