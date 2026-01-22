'use client';

/**
 * =============================================================================
 * MENU COMPONENT WITH THEME TOGGLE
 * =============================================================================
 * 
 * This component contains the app-wide navigation menu AND the theme toggle.
 * 
 * THEME SYSTEM:
 * -------------
 * - Dark Mode (default): No filter, no class. Pages show their native dark styling.
 * - Light Mode: Applies `invert(1) hue-rotate(180deg)` filter to <html>.
 *               Also adds `theme-light` class to <html> for CSS targeting.
 * 
 * The filter inverts ALL colors globally, creating light mode automatically.
 * No component needs special light mode styles - the inversion handles everything.
 * 
 * PERSISTENCE:
 * ------------
 * Theme preference is saved to localStorage as 'theme_mode' ('dark' or 'light').
 * 
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Menu.module.css';

const menuItems = [
  { label: 'THENETWORK', href: '/', authHref: '/network' },
];

export default function Menu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // isLightMode: false = dark mode (default), true = light mode (inverted)
  const [isLightMode, setIsLightMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // On mount: load saved theme preference
  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth <= 768);
    
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    
    // Load saved theme preference (default to dark mode)
    const saved = localStorage.getItem('theme_mode');
    setIsLightMode(saved === 'light');
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply theme changes to DOM
  useEffect(() => {
    if (!mounted) return;

    // Save preference
    localStorage.setItem('theme_mode', isLightMode ? 'light' : 'dark');

    /**
     * Apply the theme to the document.
     * 
     * Light mode: Apply invert filter + add class for CSS targeting
     * Dark mode: Remove filter + remove class
     * 
     * The filter inverts all colors globally:
     * - Black backgrounds → White backgrounds
     * - White text → Black text
     * - All other colors get inverted and hue-corrected
     */
    if (isLightMode) {
      document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.style.filter = '';
      document.documentElement.classList.remove('theme-light');
    }
  }, [isLightMode, mounted]);

  // Toggle between dark and light mode
  const handleToggle = () => {
    setIsLightMode(!isLightMode);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <>
      <button
        className={`${styles.menuButton} ${isOpen ? styles.open : ''} ${isOpen ? styles.hidden : ''}`}
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <div className={styles.menuLines}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      <div className={`${styles.menuPanel} ${isOpen ? styles.open : ''}`}>
        <div className={styles.contentWrap}>
          <div className={styles.menuContent}>
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={user && item.authHref ? item.authHref : item.href}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/network-profile"
              onClick={() => setIsOpen(false)}
            >
              YOUR PROFILE
            </Link>

            <Link
              href="/msg-aria"
              onClick={() => setIsOpen(false)}
            >
              ARI
            </Link>

            {/* Settings Toggle */}
            <div 
              className={styles.settingsSection}
              onMouseEnter={() => setIsSettingsOpen(true)}
              onMouseLeave={() => setIsSettingsOpen(false)}
            >
              <button
                className={styles.settingsToggle}
              >
                SETTINGS
              </button>

              <div className={`${styles.subMenu} ${isSettingsOpen ? styles.show : ''}`}>
                <Link
                  href="/invite-leaderboard"
                  onClick={() => setIsOpen(false)}
                  className={styles.subMenuItem}
                >
                  INVITE LEADERBOARD
                </Link>
                {process.env.NEXT_PUBLIC_YT_REVIEW_ENABLED === 'true' && (
                  <Link
                    href="/youtube-data-review"
                    onClick={() => setIsOpen(false)}
                    className={styles.subMenuItem}
                  >
                    YOUTUBE DATA REVIEW
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className={styles.subMenuItem}
                >
                  LOGOUT
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Toggle: Left = Dark Mode, Right = Light Mode */}
        <div 
          className={styles.menuFooter}
          style={isMobile ? { bottom: '150px' } : undefined}
        >
          <div
            className={`${styles.toggle} ${isLightMode ? styles.active : ''}`}
            onClick={handleToggle}
            title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          ></div>
        </div>

        <button
          className={`${styles.menuButton} ${styles.inner}`}
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
          style={{ display: isOpen ? 'grid' : 'none' }}
        >
          <div className={styles.menuLines}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>
    </>
  );
}

