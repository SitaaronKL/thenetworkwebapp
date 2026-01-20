'use client';

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
  const [isDigitalDnaOpen, setIsDigitalDnaOpen] = useState(false);
  const [isInverted, setIsInverted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth <= 768);
    
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    
    const saved = localStorage.getItem('theme_mode');
    // Default to dark mode (false) if not set
    if (saved === 'light') {
      setIsInverted(true);
    } else {
      setIsInverted(false);
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem('theme_mode', isInverted ? 'light' : 'dark');

    const applyInvert = (active: boolean) => {
      if (active) {
        document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
        document.documentElement.classList.add('theme-inverted');
      } else {
        document.documentElement.style.filter = '';
        document.documentElement.classList.remove('theme-inverted');
      }
    };

    applyInvert(isInverted);
  }, [isInverted, mounted]);

  const handleToggle = () => {
    setIsInverted(!isInverted);
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

            {/* Digital DNA Toggle */}
            <div className={styles.settingsSection}>
              <button
                className={styles.settingsToggle}
                onClick={() => setIsDigitalDnaOpen(!isDigitalDnaOpen)}
              >
                DIGITAL DNA
              </button>

              <div className={`${styles.subMenu} ${isDigitalDnaOpen ? styles.show : ''}`}>
                <Link
                  href="/network-profile"
                  onClick={() => setIsOpen(false)}
                  className={styles.subMenuItem}
                >
                  YOUR NETWORK PROFILE
                </Link>
                <Link
                  href="/digital-dna"
                  onClick={() => setIsOpen(false)}
                  className={styles.subMenuItem}
                >
                  DNA VISUALIZATION
                </Link>
              </div>
            </div>

            {/* ARI Link */}
            <Link
              href="/msg-aria"
              onClick={() => setIsOpen(false)}
            >
              ARI
            </Link>

            {/* Settings Toggle */}
            <div className={styles.settingsSection}>
              <button
                className={styles.settingsToggle}
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              >
                SETTINGS
              </button>

              <div className={`${styles.subMenu} ${isSettingsOpen ? styles.show : ''}`}>
                <Link
                  href="/edit-profile"
                  onClick={() => setIsOpen(false)}
                  className={styles.subMenuItem}
                >
                  EDIT PROFILE
                </Link>
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

        <div 
          className={styles.menuFooter}
          style={isMobile ? { bottom: '150px' } : undefined}
        >
          <div
            className={`${styles.toggle} ${isInverted ? styles.active : ''}`}
            onClick={handleToggle}
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

