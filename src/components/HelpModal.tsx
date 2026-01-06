'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import styles from './HelpModal.module.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const pageDescriptions: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'The Network',
    description: "This is The Network page where you can see your network of connections visualized as a galaxy. Each person in your network appears as a node connected to you. The 'Ari's Suggestions' panel on the right shows personalized connection recommendations based on your interests and digital DNA. Click on any person in the network to view their profile, or explore the suggestions to discover new connections."
  },
  '/digital-dna': {
    title: 'Digital DNA',
    description: "This is your Digital DNA page, showing a visual representation of your interests, personality archetypes, and digital twins. Your interests are displayed as an interactive graph where you can explore the relationships between different topics. Explore your archetypes to understand your core traits, and discover your digital twins—the people you share the strongest connections with based on your shared footprints."
  },
  '/msg-aria': {
    title: 'ARI',
    description: "This is the ARI page where you can read about The Network's vision and mission. Here you'll find information about how The Network works, our philosophy on building meaningful connections, and how we use your digital footprint (like YouTube and TikTok data) to help you find people you'll genuinely connect with."
  },
  '/invite-leaderboard': {
    title: 'Invite Leaderboard',
    description: "This is the Invite Leaderboard page. Here you can see who has been most active in growing The Network. You can track your own rank and see the total number of friends you've invited. Ranks are updated in real-time as new members join through your referral links. Top contributors are recognized with special indicators!"
  },
  '/edit-profile': {
    title: 'Edit Profile',
    description: "This is where you can customize your public presence on The Network. Update your name, avatar, location, and write a one-liner that describes you. This information helps others get to know you and improves the accuracy of connection suggestions."
  },
  '/profile-setup': {
    title: 'Profile Setup',
    description: "Welcome to the first step of building your Digital DNA! Tell us a bit about yourself—your name, age, and what makes you unique. This information forms the core of your profile on The Network."
  },
  '/profile-setup/signals': {
    title: 'Connect Signals',
    description: "Signals are the building blocks of your Digital DNA. By connecting your social accounts like YouTube, we can understand your interests and personality to help you find truly meaningful connections. Don't worry, we only use this data to build your profile and never share it without your permission."
  },
  '/profile-setup/wrapped': {
    title: 'Digital DNA Wrapped',
    description: "Welcome to your Digital DNA Wrapped experience! We're processing your signals to create a unique representation of who you are. Sit back and watch as we unveil your interest graph, personality archetypes, and find your digital doppelgangers."
  }
};

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const pathname = usePathname();
  const pageInfo = pageDescriptions[pathname] || {
    title: 'Help',
    description: 'Welcome to The Network! Navigate using the menu to explore different pages and features.'
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{pageInfo.title}</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close help"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className={styles.content}>
          <p className={styles.description}>{pageInfo.description}</p>

          <div className={styles.allPagesSection}>
            <h3 className={styles.sectionTitle}>All Pages</h3>
            <div className={styles.pagesList}>
              <div className={styles.pageItem}>
                <strong className={styles.pageName}>The Network</strong>
                <p className={styles.pageDesc}>
                  Visualize your network of connections and discover new people through personalized suggestions.
                </p>
              </div>
              <div className={styles.pageItem}>
                <strong className={styles.pageName}>Digital DNA</strong>
                <p className={styles.pageDesc}>
                  Explore your interests, personality archetypes, and digital twins in an interactive visualization.
                </p>
              </div>
              <div className={styles.pageItem}>
                <strong className={styles.pageName}>ARI</strong>
                <p className={styles.pageDesc}>
                  Learn about The Network's vision, mission, and how we help you build meaningful connections.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

