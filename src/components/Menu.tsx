'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Menu.module.css';
import HelpIcon from './HelpIcon';
import HelpModal from './HelpModal';

const menuItems = [
  { label: 'THENETWORK', href: '/', authHref: '/network' },
  { label: 'DIGITAL DNA', href: '/digital-dna' },
  { label: 'ARI', href: '/msg-aria' },
];

export default function Menu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInverted, setIsInverted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme_mode');
    // Default to dark mode (false) if not set
    if (saved === 'light') {
      setIsInverted(true);
    } else {
      setIsInverted(false);
    }
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
      <HelpIcon onClick={() => setIsHelpOpen(true)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

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

        <div className={styles.menuFooter}>
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

