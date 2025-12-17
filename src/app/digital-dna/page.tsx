'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/Menu';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';
import InterestGraph from '@/components/InterestGraph';

export default function DigitalDnaPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [interests, setInterests] = useState<string[]>([]);
    const [userFullName, setUserFullName] = useState('Me');
    const [isLoadingGraph, setIsLoadingGraph] = useState(true);

    // Auth Redirect
    useEffect(() => {
        if (!loading && !user) router.push('/login');
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

            while (retries < maxRetries) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('interests, full_name')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                    break;
                }

                fetchedInterests = (profile?.interests as string[]) || [];
                if (profile?.full_name) fetchedName = profile.full_name;

                // If we have interests, break. Otherwise, wait and retry (in case they're being generated)
                if (fetchedInterests.length > 0 || retries >= maxRetries - 1) {
                    break;
                }

                // Wait 2 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
                retries++;
            }

            setInterests(fetchedInterests);
            setUserFullName(fetchedName);
            setIsLoadingGraph(false);
        };
        fetchData();
    }, [user]);

    if (loading || isLoadingGraph) {
        return (
            <div className={styles.wrapper} style={{ background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Menu />
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{
                        width: '48px',
                        height: '48px',
                        border: '3px solid rgba(0, 0, 0, 0.1)',
                        borderTopColor: '#000',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }}></div>
                    <p style={{ color: '#000', fontSize: '16px' }}>Loading your interest graph...</p>
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
        <div className={styles.wrapper} style={{ background: '#ffffff' }}>
            <Menu />

            <div style={{ width: '100vw', height: '100vh', cursor: 'move' }}>
                <InterestGraph
                    interests={interests}
                    userFullName={userFullName}
                />
            </div>
        </div>
    );
}
