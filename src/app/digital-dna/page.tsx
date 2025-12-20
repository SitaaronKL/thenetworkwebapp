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

export default function DigitalDnaPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [interests, setInterests] = useState<string[]>([]);
    const [hierarchicalInterests, setHierarchicalInterests] = useState<any[]>([]);
    const [userFullName, setUserFullName] = useState('Me');
    const [isLoadingGraph, setIsLoadingGraph] = useState(true);

    // Modal state
    const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isExplanationLoading, setIsExplanationLoading] = useState(false);
    const [explanationError, setExplanationError] = useState<string | null>(null);

    // Auth Redirect
    useEffect(() => {
        if (!loading && !user) router.push('/landing');
    }, [user, loading, router]);

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

            while (retries < maxRetries) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('interests, full_name, hierarchical_interests')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                    break;
                }

                fetchedInterests = (profile?.interests as string[]) || [];
                if (profile?.full_name) fetchedName = profile.full_name;
                const fetchedHierarchical = (profile?.hierarchical_interests as any[]) || [];

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
            setIsLoadingGraph(false);
        };
        fetchData();
    }, [user]);

    const handleInterestClick = async (interest: string) => {
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
            console.error('Error fetching interest explanation:', err);
            setExplanationError('Failed to load insight. Please try again.');
        } finally {
            setIsExplanationLoading(false);
        }
    };

    if (loading || isLoadingGraph) {
        return (
            <div className={styles.wrapper} style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Menu />
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{
                        width: '48px',
                        height: '48px',
                        border: '3px solid rgba(255, 255, 255, 0.1)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }}></div>
                    <p style={{ color: '#fff', fontSize: '16px' }}>Loading your interest graph...</p>
                    <style jsx>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.wrapper} style={{ background: '#000' }}>
            <Menu />

            <div style={{ width: '100vw', height: '100vh' }}>
                <InterestGraph
                    interests={interests}
                    userFullName={userFullName}
                    onInterestClick={handleInterestClick}
                />
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
