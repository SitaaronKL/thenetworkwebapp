'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';

interface SlideData {
    id: number;
    type: 'intro' | 'loading' | 'data' | 'cta';
    theme: 'dark' | 'light';
    showSphere?: boolean;
    sphereCount?: number;
}

const SLIDES: SlideData[] = [
    { id: 1, type: 'intro', theme: 'dark', showSphere: true, sphereCount: 3 },
    { id: 2, type: 'intro', theme: 'dark', showSphere: true, sphereCount: 2 },
    { id: 3, type: 'intro', theme: 'light', showSphere: false },
    { id: 4, type: 'loading', theme: 'light', showSphere: false },
    { id: 5, type: 'loading', theme: 'dark', showSphere: true, sphereCount: 1 },
    { id: 6, type: 'intro', theme: 'dark', showSphere: false },
    { id: 7, type: 'data', theme: 'dark', showSphere: false },
    { id: 8, type: 'data', theme: 'dark', showSphere: true, sphereCount: 1 },
    { id: 9, type: 'data', theme: 'dark', showSphere: false },
    { id: 10, type: 'data', theme: 'light', showSphere: false },
    { id: 11, type: 'data', theme: 'light', showSphere: false },
    { id: 12, type: 'data', theme: 'light', showSphere: false },
    { id: 13, type: 'data', theme: 'dark', showSphere: true, sphereCount: 1 },
    { id: 14, type: 'cta', theme: 'light', showSphere: false },
];

export default function WrappedPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [interests, setInterests] = useState<string[]>([]);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/landing');
        }
    }, [user, loading, router]);

    // Fetch user interests
    useEffect(() => {
        if (!user) return;

        const fetchInterests = async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('profiles')
                .select('interests')
                .eq('id', user.id)
                .single();

            if (data?.interests) {
                setInterests(data.interests);
            }
        };

        fetchInterests();
    }, [user]);

    // Handle click to advance slides
    const handleAdvance = () => {
        if (isTransitioning) return;

        if (currentSlide < SLIDES.length - 1) {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentSlide(prev => prev + 1);
                setIsTransitioning(false);
            }, 300);
        } else {
            // Final slide - go to home
            router.push('/');
        }
    };

    // Get top 3 interests
    const topInterests = interests.slice(0, 3);

    // Generate sparkle stars for light theme slides
    const renderSparkles = () => (
        <div className={styles.sparklesContainer}>
            {[...Array(20)].map((_, i) => (
                <div
                    key={i}
                    className={styles.sparkle}
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${2 + Math.random() * 2}s`,
                    }}
                />
            ))}
        </div>
    );

    // Generate floating spheres
    const renderSpheres = (count: number) => (
        <div className={styles.spheresContainer}>
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className={`${styles.floatingSphere} ${styles[`sphere${i + 1}`]}`}
                    style={{ animationDelay: `${i * 0.5}s` }}
                >
                    <Image
                        src="/images/Sphere.svg"
                        alt=""
                        width={150 + i * 50}
                        height={150 + i * 50}
                        className={styles.sphereImage}
                    />
                </div>
            ))}
        </div>
    );

    // Render slide content based on current slide
    const renderSlideContent = () => {
        const slide = SLIDES[currentSlide];

        switch (currentSlide) {
            case 0:
                return (
                    <div className={styles.slideContent}>
                        <p className={styles.fadeInText}>You already have a</p>
                        <h1 className={`${styles.fadeInText} ${styles.headline}`}>digital life.</h1>
                        <p className={`${styles.fadeInText} ${styles.delayed1}`}>
                            Streaming history. Liked videos.
                        </p>
                        <p className={`${styles.fadeInText} ${styles.delayed2}`}>
                            Subscriptions. Playlists.
                        </p>
                    </div>
                );
            case 1:
                return (
                    <div className={styles.slideContent}>
                        <p className={styles.fadeInText}>What if all of that</p>
                        <h1 className={`${styles.fadeInText} ${styles.headline}`}>added up</h1>
                        <p className={`${styles.fadeInText} ${styles.delayed1}`}>
                            to something bigger?
                        </p>
                    </div>
                );
            case 2:
                return (
                    <div className={styles.slideContent}>
                        <p className={styles.fadeInText}>Introducing:</p>
                        <h1 className={`${styles.fadeInText} ${styles.headlineGradient}`}>
                            Digital DNA
                        </h1>
                        <h2 className={`${styles.fadeInText} ${styles.subHeadline} ${styles.delayed1}`}>
                            Wrapped
                        </h2>
                        {renderSparkles()}
                    </div>
                );
            case 3:
                return (
                    <div className={styles.slideContent}>
                        <div className={styles.loadingAnimation}>
                            <div className={styles.loadingRing}></div>
                        </div>
                        <p className={`${styles.fadeInText} ${styles.loadingText}`}>
                            Reading your signals...
                        </p>
                        {renderSparkles()}
                    </div>
                );
            case 4:
                return (
                    <div className={styles.slideContent}>
                        <div className={styles.loadingAnimation}>
                            <div className={styles.clusterDots}>
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className={styles.clusterDot} style={{ animationDelay: `${i * 0.1}s` }} />
                                ))}
                            </div>
                        </div>
                        <p className={`${styles.fadeInText} ${styles.loadingText}`}>
                            Clustering your obsessions...
                        </p>
                    </div>
                );
            case 5:
                return (
                    <div className={styles.slideContent}>
                        <p className={styles.fadeInText}>We don&apos;t care</p>
                        <h1 className={`${styles.fadeInText} ${styles.headline}`}>how old you are.</h1>
                        <p className={`${styles.fadeInText} ${styles.delayed1}`}>
                            We care about what makes you, <strong>you</strong>.
                        </p>
                    </div>
                );
            case 6:
                return (
                    <div className={styles.slideContent}>
                        <p className={styles.fadeInText}>Your</p>
                        <h1 className={`${styles.fadeInText} ${styles.headline}`}>Curiosity Map</h1>
                        <div className={`${styles.interestsGrid} ${styles.fadeInText} ${styles.delayed1}`}>
                            {interests.slice(0, 9).map((interest, i) => (
                                <div
                                    key={i}
                                    className={styles.interestTag}
                                    style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                                >
                                    {interest}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 7:
                return (
                    <div className={styles.slideContent}>
                        <p className={styles.fadeInText}>Your brain lives in</p>
                        <h1 className={`${styles.fadeInText} ${styles.headline}`}>three main worlds</h1>
                        <div className={`${styles.worldsContainer} ${styles.delayed1}`}>
                            {topInterests.map((interest, i) => (
                                <div
                                    key={i}
                                    className={`${styles.worldBox} ${styles.fadeInText}`}
                                    style={{ animationDelay: `${0.5 + i * 0.2}s` }}
                                >
                                    {interest}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 8:
                return (
                    <div className={styles.slideContent}>
                        <p className={styles.fadeInText}>Your</p>
                        <h1 className={`${styles.fadeInText} ${styles.headline}`}>Digital Doppelgängers</h1>
                        <p className={`${styles.fadeInText} ${styles.delayed1}`}>
                            People who think like you
                        </p>
                        <div className={`${styles.doppleCircles} ${styles.fadeInText} ${styles.delayed2}`}>
                            <div className={styles.doppleCircle}>94% match</div>
                            <div className={styles.doppleCircle}>89% match</div>
                            <div className={styles.doppleCircle}>87% match</div>
                        </div>
                        <p className={`${styles.fadeInText} ${styles.delayed3} ${styles.smallText}`}>
                            Coming soon
                        </p>
                    </div>
                );
            case 9:
                return (
                    <div className={styles.slideContent}>
                        <p className={styles.fadeInText}>You don&apos;t fit</p>
                        <h1 className={`${styles.fadeInText} ${styles.headline}`}>in one box.</h1>
                        <div className={`${styles.archetypesContainer} ${styles.fadeInText} ${styles.delayed1}`}>
                            <span className={styles.archetype}>Builder</span>
                            <span className={styles.archetype}>Explorer</span>
                            <span className={styles.archetype}>Creator</span>
                        </div>
                        {renderSparkles()}
                    </div>
                );
            case 10:
                return (
                    <div className={styles.slideContent}>
                        <p className={styles.fadeInText}>Your</p>
                        <h1 className={`${styles.fadeInText} ${styles.headlineGradient}`}>Mindprint</h1>
                        <div className={`${styles.mindprintContainer} ${styles.fadeInText} ${styles.delayed1}`}>
                            <div className={styles.mindprintBar} style={{ width: '90%' }}>Curiosity</div>
                            <div className={styles.mindprintBar} style={{ width: '75%' }}>Creativity</div>
                            <div className={styles.mindprintBar} style={{ width: '85%' }}>Analysis</div>
                        </div>
                        {renderSparkles()}
                    </div>
                );
            case 11:
                return (
                    <div className={styles.slideContent}>
                        <p className={styles.fadeInText}>Your Top 3</p>
                        <h1 className={`${styles.fadeInText} ${styles.headlineGradient}`}>Life Algorithms</h1>
                        <div className={`${styles.algorithmsContainer} ${styles.fadeInText} ${styles.delayed1}`}>
                            <div className={styles.algorithm}>🔍 Deep Diver</div>
                            <div className={styles.algorithm}>🌙 Night Owl</div>
                            <div className={styles.algorithm}>⚡ Tech Optimist</div>
                        </div>
                        {renderSparkles()}
                    </div>
                );
            case 12:
                return (
                    <div className={styles.slideContent}>
                        <p className={styles.fadeInText}>You are</p>
                        <h1 className={`${styles.fadeInText} ${styles.headline}`}>Generation</h1>
                        <div className={`${styles.generationBadge} ${styles.fadeInText} ${styles.delayed1}`}>
                            <span className={styles.badgeIcon}>🧬</span>
                            <span className={styles.badgeText}>Digital Native</span>
                        </div>
                    </div>
                );
            case 13:
                return (
                    <div className={styles.slideContent}>
                        <h1 className={`${styles.fadeInText} ${styles.headline}`}>
                            Welcome to
                        </h1>
                        <h2 className={`${styles.fadeInText} ${styles.headlineGradient} ${styles.delayed1}`}>
                            The Network
                        </h2>
                        <button
                            className={`${styles.ctaButton} ${styles.fadeInText} ${styles.delayed2}`}
                            onClick={() => router.push('/')}
                        >
                            Enter Your Network
                        </button>
                        {renderSparkles()}
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className={`${styles.container} ${styles.dark}`}>
                <div className={styles.loader}></div>
            </div>
        );
    }

    const slide = SLIDES[currentSlide];

    return (
        <div
            className={`${styles.container} ${styles[slide.theme]} ${isTransitioning ? styles.transitioning : ''}`}
            onClick={handleAdvance}
        >
            {/* Progress Bar */}
            <div className={styles.progressBar}>
                {SLIDES.map((_, i) => (
                    <div
                        key={i}
                        className={`${styles.progressSegment} ${i <= currentSlide ? styles.active : ''}`}
                    />
                ))}
            </div>

            {/* Floating Spheres */}
            {slide.showSphere && renderSpheres(slide.sphereCount || 1)}

            {/* Slide Content */}
            <main className={styles.main}>
                {renderSlideContent()}
            </main>

            {/* Tap indicator */}
            {currentSlide < SLIDES.length - 1 && (
                <div className={styles.tapIndicator}>
                    <span>Tap to continue</span>
                </div>
            )}
        </div>
    );
}
