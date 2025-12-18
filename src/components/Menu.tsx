'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import styles from './Menu.module.css';

const menuItems = [
  { label: 'THENETWORK', href: '/' },
  { label: 'DIGITAL DNA', href: '/digital-dna' },
  { label: 'MSG ARIA', href: '/msg-aria' },
];

export default function Menu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInverted, setIsInverted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme_inverted');
    // Default to true (dark mode) if not set, or if set to true
    if (saved === null || saved === 'true') {
      setIsInverted(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem('theme_inverted', isInverted.toString());

    const applyInvert = (active: boolean) => {
      if (active) {
        document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
        document.documentElement.style.backgroundColor = '#111827';
        document.documentElement.classList.add('theme-inverted');
      } else {
        document.documentElement.style.filter = '';
        document.documentElement.style.backgroundColor = '';
        document.documentElement.classList.remove('theme-inverted');
      }
    };

    applyInvert(isInverted);
  }, [isInverted, mounted]);

  const handleToggle = () => {
    setIsInverted(!isInverted);
  };

  const handleLogout = async () => {
    // Reset invert state before logging out
    setIsInverted(false);
    localStorage.removeItem('theme_inverted');
    document.documentElement.style.filter = '';
    document.documentElement.style.backgroundColor = '';
    document.documentElement.classList.remove('theme-inverted');

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/landing');
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
              <Link key={index} href={item.href} onClick={() => setIsOpen(false)}>
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
          <div>Invert</div>
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

