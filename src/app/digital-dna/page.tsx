'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/Menu';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';
import dynamic from 'next/dynamic';
const InterestGraph = dynamic(() => import('@/components/InterestGraph'), { ssr: false });
import InterestExplanationModal from '@/components/InterestExplanationModal';

// Types for archetypes
interface Archetype {
    name: string;
    percentage: number;
}

// Types for doppelgängers
interface Doppelganger {
    name: string;
}

// Tab types
type TabType = 'interests' | 'archetypes' | 'doppelgangers';

export default function DigitalDnaPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [interests, setInterests] = useState<string[]>([]);
    const [hierarchicalInterests, setHierarchicalInterests] = useState<any[]>([]);
    const [userFullName, setUserFullName] = useState('Me');
    const [isLoadingGraph, setIsLoadingGraph] = useState(true);
    const [isGraphReady, setIsGraphReady] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('interests');

    // Archetypes state
    const [archetypes, setArchetypes] = useState<Archetype[]>([]);

    // Doppelgängers state
    const [doppelgangers, setDoppelgangers] = useState<Doppelganger[]>([]);

    // Modal state
    const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isExplanationLoading, setIsExplanationLoading] = useState(false);
    const [explanationError, setExplanationError] = useState<string | null>(null);

    // Auth Redirect
    useEffect(() => {
        if (!loading && !user) router.push('/');
    }, [user, loading, router]);

    // Memoize handlers to prevent graph re-renders
    const handleInterestClick = React.useCallback(async (interest: string) => {
        setSelectedInterest(interest);
        setIsExplanationLoading(true);
        setExplanationError(null);
        setExplanation(null);

        try {
            const supabase = createClient();

            // Find relevant tags for this interest
            const categoryData = hierarchicalInterests.find((h: any) => h.category.toLowerCase() === interest.toLowerCase());
            const tags = categoryData?.tags || [];

            const { data, error } = await supabase.functions.invoke('generate-interest-explanation', {
                body: { interest, tags }
            });

            if (error) throw error;
            if (data?.success) {
                setExplanation(data.explanation);
            } else {
                throw new Error(data?.error || 'Failed to fetch explanation');
            }
        } catch (err: any) {
            setExplanationError('Failed to load insight. Please try again.');
        } finally {
            setIsExplanationLoading(false);
        }
    }, [hierarchicalInterests]);

    const handleGraphLoaded = React.useCallback(() => {
        setIsGraphReady(true);
    }, []);

    // Fetch Data
    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setIsLoadingGraph(true);
            const supabase = createClient();

            // Try fetching with retries in case interests are still being generated
            let retries = 0;
            const maxRetries = 10;
            let fetchedInterests: string[] = [];
            let fetchedName = 'Me';
            let fetchedHierarchical: any[] = [];
            let fetchedArchetypes: Archetype[] = [];
            let fetchedDoppelgangers: Doppelganger[] = [];

            while (retries < maxRetries) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('interests, full_name, hierarchical_interests, personality_archetypes, doppelgangers')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    break;
                }

                fetchedInterests = (profile?.interests as string[]) || [];
                if (profile?.full_name) fetchedName = profile.full_name;
                fetchedHierarchical = (profile?.hierarchical_interests as any[]) || [];
                fetchedArchetypes = (profile?.personality_archetypes as Archetype[]) || [];
                fetchedDoppelgangers = (profile?.doppelgangers as Doppelganger[]) || [];

                // If we have interests, break. Otherwise, wait and retry (in case they're being generated)
                if (fetchedInterests.length > 0 || retries >= maxRetries - 1) {
                    break;
                }

                // Wait 2 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
                retries++;
            }

            setInterests(fetchedInterests);
            setHierarchicalInterests(fetchedHierarchical);
            setUserFullName(fetchedName);
            setArchetypes(fetchedArchetypes);
            setDoppelgangers(fetchedDoppelgangers);
            setIsLoadingGraph(false);
        };
        fetchData();
    }, [user?.id]);

    // Show loading spinner until both data is loaded AND graph is ready
    const showLoading = loading || isLoadingGraph || !isGraphReady;

    // Archetype colors for visual distinction - more vibrant and distinct
    const archetypeColors = [
        { bg: 'linear-gradient(145deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)', border: 'rgba(99, 102, 241, 0.35)', accent: '#818CF8' }, // Indigo
        { bg: 'linear-gradient(145deg, rgba(236, 72, 153, 0.15) 0%, rgba(236, 72, 153, 0.05) 100%)', border: 'rgba(236, 72, 153, 0.35)', accent: '#F472B6' }, // Pink
        { bg: 'linear-gradient(145deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)', border: 'rgba(34, 197, 94, 0.35)', accent: '#4ADE80' }, // Emerald
        { bg: 'linear-gradient(145deg, rgba(251, 146, 60, 0.15) 0%, rgba(251, 146, 60, 0.05) 100%)', border: 'rgba(251, 146, 60, 0.35)', accent: '#FB923C' }, // Orange
    ];

    // State for generated archetype descriptions
    const [archetypeDescriptions, setArchetypeDescriptions] = useState<{ [key: string]: string }>({});
    const [isLoadingDescriptions, setIsLoadingDescriptions] = useState(false);

    // State for generated doppelgänger descriptions
    const [doppelgangerDescriptions, setDoppelgangerDescriptions] = useState<{ [key: string]: string }>({});
    const [isLoadingDoppelgangerDescriptions, setIsLoadingDoppelgangerDescriptions] = useState(false);

    // Fetch archetype descriptions from cache, fallback to edge function if needed
    useEffect(() => {
        if (!user || archetypes.length === 0) return;
        if (Object.keys(archetypeDescriptions).length > 0) return; // Already loaded

        const fetchDescriptions = async () => {
            setIsLoadingDescriptions(true);
            const supabase = createClient();

            try {
                // First, try to fetch from the cache table directly
                const { data: cachedData, error: cacheError } = await supabase
                    .from('archetype_descriptions')
                    .select('archetype_name, description')
                    .eq('user_id', user.id);

                if (!cacheError && cachedData && cachedData.length > 0) {
                    // Found cached descriptions
                    const descriptionsMap: { [key: string]: string } = {};
                    cachedData.forEach(item => {
                        descriptionsMap[item.archetype_name] = item.description;
                    });

                    // Check if we have all archetypes cached
                    const allCached = archetypes.every(a => descriptionsMap[a.name]);

                    if (allCached) {
                        setArchetypeDescriptions(descriptionsMap);
                        setIsLoadingDescriptions(false);
                        return;
                    }
                }

                // If no cache or incomplete, call edge function to generate (only if we have interests)
                if (interests.length > 0) {
                    const { data, error } = await supabase.functions.invoke('generate-archetype-descriptions', {
                        body: {
                            user_id: user.id,
                            archetypes: archetypes.map(a => a.name),
                            interests: interests.slice(0, 10),
                        }
                    });

                    if (error) throw error;
                    if (data?.descriptions) {
                        setArchetypeDescriptions(data.descriptions);
                    }
                }
            } catch (err) {
                // Will fall back to generic descriptions via getArchetypeDescription()
            } finally {
                setIsLoadingDescriptions(false);
            }
        };

        fetchDescriptions();
    }, [user, archetypes, interests, archetypeDescriptions]);

    // Fetch doppelgänger descriptions from cache, fallback to edge function if needed
    useEffect(() => {
        if (!user || doppelgangers.length === 0) return;
        if (Object.keys(doppelgangerDescriptions).length > 0) return; // Already loaded

        const fetchDoppelgangerDescriptions = async () => {
            setIsLoadingDoppelgangerDescriptions(true);
            const supabase = createClient();

            try {
                // First, try to fetch from the cache table directly
                const { data: cachedData, error: cacheError } = await supabase
                    .from('doppelganger_descriptions')
                    .select('doppelganger_name, description')
                    .eq('user_id', user.id);

                if (!cacheError && cachedData && cachedData.length > 0) {
                    // Found cached descriptions
                    const descriptionsMap: { [key: string]: string } = {};
                    cachedData.forEach(item => {
                        descriptionsMap[item.doppelganger_name] = item.description;
                    });

                    // Check if we have all doppelgängers cached
                    const allCached = doppelgangers.every(d => descriptionsMap[d.name]);

                    if (allCached) {
                        setDoppelgangerDescriptions(descriptionsMap);
                        setIsLoadingDoppelgangerDescriptions(false);
                        return;
                    }
                }

                // If no cache or incomplete, call edge function to generate (only if we have interests)
                if (interests.length > 0) {
                    const { data, error } = await supabase.functions.invoke('generate-doppelganger-descriptions', {
                        body: {
                            user_id: user.id,
                            doppelgangers: doppelgangers.map(d => d.name),
                            interests: interests.slice(0, 10),
                        }
                    });

                    if (error) throw error;
                    if (data?.descriptions) {
                        setDoppelgangerDescriptions(data.descriptions);
                    }
                }
            } catch (err) {
                // Will fall back to generic descriptions
            } finally {
                setIsLoadingDoppelgangerDescriptions(false);
            }
        };

        fetchDoppelgangerDescriptions();
    }, [user, doppelgangers, interests, doppelgangerDescriptions]);

    // Clean archetype name (remove "The " prefix if present for cleaner display)
    const cleanArchetypeName = (name: string): string => {
        return name.replace(/^The\s+/i, '');
    };

    // Get archetype description - from generated or fallback
    const getArchetypeDescription = (name: string, index: number): string => {
        // Check if we have a generated description
        if (archetypeDescriptions[name]) {
            return archetypeDescriptions[name];
        }

        // Fallback descriptions based on common archetype patterns
        const cleanName = cleanArchetypeName(name).toLowerCase();
        const fallbackDescriptions: { [key: string]: string } = {
            'explorer': 'Curiosity drives you. You\'re always seeking new experiences, ideas, and perspectives that expand your worldview.',
            'creator': 'Expression is your currency. You see the world as raw material for something new and meaningful.',
            'scholar': 'Knowledge is your pursuit. You dive deep into subjects, seeking understanding that goes beyond the surface.',
            'entertainer': 'You bring energy and joy. Connection through shared experiences and laughter is your gift.',
            'builder': 'You create and build. You\'re drawn to turning ideas into reality, whether it\'s code, content, or communities.',
            'night owl': 'Your best ideas come when the world is quiet. Late nights are when your mind truly comes alive.',
            'tech optimist': 'You see technology as a force for good. You\'re excited about the future and what\'s possible.',
            'analyst': 'Data speaks to you. You find patterns others miss and make decisions based on evidence.',
            'connector': 'You bring people together. Your superpower is seeing how different worlds can intersect.',
            'philosopher': 'You question everything. Deep thinking about life\'s big questions is your natural state.',
            'strategist': 'You think three moves ahead. Planning and long-term thinking come naturally to you.',
            'dreamer': 'You see possibilities where others see limits. Your imagination shapes how you envision the future.',
            'achiever': 'Goals fuel you. You\'re driven to accomplish, improve, and reach new heights in everything you do.',
            'innovator': 'You challenge the status quo. Finding new ways to solve old problems is second nature to you.',
            'storyteller': 'Narratives captivate you. You understand that stories shape how we see the world and each other.',
            'mentor': 'You find fulfillment in helping others grow. Sharing knowledge and guidance comes naturally.',
            'adventurer': 'The unknown excites you. You\'re drawn to experiences that push boundaries and test limits.',
            'visionary': 'You see the bigger picture. While others focus on today, you\'re already imagining tomorrow.',
            'curator': 'You have an eye for quality. Collecting, organizing, and sharing the best of what you find is your talent.',
            'rebel': 'Rules are suggestions to you. You question authority and forge your own path.',
        };

        // Try to match the clean name
        if (fallbackDescriptions[cleanName]) {
            return fallbackDescriptions[cleanName];
        }

        // If no match, create a contextual fallback using interests
        if (interests.length > 0) {
            const relevantInterests = interests.slice(index * 2, index * 2 + 2).join(' and ');
            return `This side of you is drawn to ${relevantInterests || 'diverse topics'}. It shapes how you explore and engage with the world.`;
        }

        return `This aspect of your personality influences how you think, create, and connect with the world around you.`;
    };

    // Get doppelgänger description - from generated or fallback
    const getDoppelgangerDescription = (name: string): string => {
        // Check if we have a generated description
        if (doppelgangerDescriptions[name]) {
            return doppelgangerDescriptions[name];
        }

        // Fallback generic description
        return `Shares your wavelength and creative energy.`;
    };

    // Get initials for avatar
    const getInitials = (name: string): string => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Doppelgänger colors for visual distinction
    const doppelgangerColors = [
        { bg: 'linear-gradient(135deg, #667eea, #764ba2)', accent: '#667eea' },
        { bg: 'linear-gradient(135deg, #f093fb, #f5576c)', accent: '#f093fb' },
        { bg: 'linear-gradient(135deg, #4facfe, #00f2fe)', accent: '#4facfe' },
    ];

    return (
        <div className={styles.wrapper}>
            <Menu />

            {/* Loading Overlay - Fixed position, covers entire screen */}
            {showLoading && activeTab === 'interests' && (
                <div className={styles.loadingOverlay}>
                    <div style={{ textAlign: 'center' }}>
                        <div className={styles.loader}></div>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className={styles.tabNavigation}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'interests' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('interests')}
                >
                    Interests
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'archetypes' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('archetypes')}
                >
                    Archetypes
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'doppelgangers' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('doppelgangers')}
                >
                    Twins
                </button>
            </div>

            {/* Interests Tab - Graph (always mounted, hidden via CSS to avoid re-initialization lag) */}
            <div style={{
                width: '100vw',
                height: '100vh',
                visibility: showLoading || activeTab !== 'interests' ? 'hidden' : 'visible',
                position: activeTab !== 'interests' ? 'absolute' : 'relative',
                pointerEvents: activeTab !== 'interests' ? 'none' : 'auto',
                zIndex: 1, // Keep below menu (z-index: 19)
            }}>
                {!isLoadingGraph && interests.length > 0 && (
                    <InterestGraph
                        interests={interests}
                        userFullName={userFullName}
                        onInterestClick={handleInterestClick}
                        onGraphLoaded={handleGraphLoaded}
                    />
                )}
            </div>

            {/* Archetypes Tab */}
            <div
                className={styles.contentContainer}
                style={{
                    display: activeTab === 'archetypes' ? 'flex' : 'none'
                }}
            >
                <div className={styles.contentHeader}>
                    <h1 className={styles.contentTitle}>Your Personality Archetypes</h1>
                    <p className={styles.contentSubtitle}>
                        Based on your YouTube activity, here&apos;s what makes you, you.
                    </p>
                </div>
                <div className={styles.cardsGrid}>
                    {archetypes.length > 0 ? (
                        archetypes.slice(0, 4).map((archetype, index) => (
                            <div
                                key={index}
                                className={styles.archetypeCard}
                                style={{
                                    background: archetypeColors[index % 4].bg,
                                    borderColor: archetypeColors[index % 4].border,
                                }}
                            >
                                <div className={styles.archetypeHeader}>
                                    <span
                                        className={styles.archetypePercentage}
                                        style={{ color: archetypeColors[index % 4].accent }}
                                    >
                                        {archetype.percentage}%
                                    </span>
                                    <span className={styles.archetypeName}>{archetype.name}</span>
                                </div>
                                <p className={styles.archetypeDescription}>
                                    {isLoadingDescriptions ? (
                                        <span className={styles.descriptionLoading}>Generating insight...</span>
                                    ) : (
                                        getArchetypeDescription(archetype.name, index)
                                    )}
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className={styles.emptyState}>
                            <p>No archetypes found yet. Complete onboarding to generate your personality archetypes.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Doppelgängers Tab */}
            <div
                className={styles.contentContainer}
                style={{
                    display: activeTab === 'doppelgangers' ? 'flex' : 'none'
                }}
            >
                <div className={styles.contentHeader}>
                    <h1 className={styles.contentTitle}>Your Digital Twins</h1>
                    <p className={styles.contentSubtitle}>
                        Famous minds who share your wavelength.
                    </p>
                </div>
                <div className={styles.twinsContainer}>
                    {doppelgangers.filter(d => d.name.toLowerCase() !== userFullName.toLowerCase()).length > 0 ? (
                        doppelgangers
                            .filter(d => d.name.toLowerCase() !== userFullName.toLowerCase())
                            .slice(0, 3)
                            .map((doppelganger, index) => (
                                <div
                                    key={index}
                                    className={styles.twinCard}
                                >
                                    <div className={styles.twinGlow} style={{ background: doppelgangerColors[index % 3].bg }} />
                                    <div
                                        className={styles.twinAvatar}
                                        style={{
                                            background: doppelgangerColors[index % 3].bg
                                        }}
                                    >
                                        <span className={styles.twinInitials}>{getInitials(doppelganger.name)}</span>
                                    </div>
                                    <h3 className={styles.twinName}>{doppelganger.name}</h3>
                                    <div className={styles.twinDivider} style={{ background: doppelgangerColors[index % 3].accent }} />
                                    <p className={styles.twinDescription}>
                                        {isLoadingDoppelgangerDescriptions ? (
                                            <span className={styles.descriptionLoading}>Discovering connection...</span>
                                        ) : (
                                            getDoppelgangerDescription(doppelganger.name)
                                        )}
                                    </p>
                                </div>
                            ))
                    ) : (
                        <div className={styles.emptyState}>
                            <p>No digital twins found yet. Complete onboarding to discover who shares your wavelength.</p>
                        </div>
                    )}
                </div>
            </div>

            {selectedInterest && (
                <InterestExplanationModal
                    interest={selectedInterest}
                    explanation={explanation}
                    isLoading={isExplanationLoading}
                    error={explanationError}
                    onClose={() => setSelectedInterest(null)}
                />
            )}
        </div>
    );
}
