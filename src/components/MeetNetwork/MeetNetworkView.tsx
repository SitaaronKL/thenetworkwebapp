'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import LocalNetworkStrength from './LocalNetworkStrength';
import ReadyPlansFeed from './ReadyPlansFeed';
import CityAnchorSelector from './CityAnchorSelector';
import AvailabilityCalendar from './AvailabilityCalendar';

interface CityAnchor {
    city: string;
    source: string;
    source_data?: any;
}

export default function MeetNetworkView() {
    const [cityAnchor, setCityAnchor] = useState<CityAnchor | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
    const [availabilityComplete, setAvailabilityComplete] = useState<boolean | null>(null);
    const [availabilityCount, setAvailabilityCount] = useState<number>(0);
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        // Wait for auth to finish loading
        if (authLoading) {
            return;
        }
        
        if (!user) {
            // No user, but auth is done loading
            setLoading(false);
            setProfileComplete(false);
            return;
        }
        
        // Reset loading state
        setLoading(true);
        
        // Safety timeout - always exit loading after 5 seconds
        const timeoutId = setTimeout(() => {
            console.warn('Loading timeout - forcing exit');
            setLoading(false);
            if (profileComplete === null) {
                setProfileComplete(false);
            }
        }, 5000);
        
        // Load all checks in parallel
        const loadData = async () => {
            try {
                await Promise.all([
                    checkProfileCompletion(),
                    checkAvailabilityBlocks(),
                    loadCityAnchor()
                ]);
            } catch (error) {
                console.error('Error loading data:', error);
                // If checks failed, ensure state is set
                setProfileComplete(false);
                setAvailabilityComplete(false);
            } finally {
                clearTimeout(timeoutId);
                setLoading(false);
            }
        };
        
        loadData();
        
        return () => {
            clearTimeout(timeoutId);
        };
    }, [user, authLoading]);

    const checkProfileCompletion = async () => {
        if (!user) {
            setProfileComplete(false);
            return;
        }
        
        try {
            const supabase = createClient();
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('school, location')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error checking profile completion:', error);
                // If profile doesn't exist, that's also incomplete
                setProfileComplete(false);
                return;
            }

            // Check if required fields are filled
            const hasSchool = profile?.school && profile.school.trim() !== '';
            const hasLocation = profile?.location && profile.location.trim() !== '';
            
            const isComplete = hasSchool && hasLocation;
            console.log('Profile check:', { hasSchool, hasLocation, school: profile?.school, location: profile?.location, isComplete });
            
            // Set state - this will trigger a re-render
            setProfileComplete(isComplete);
        } catch (error) {
            console.error('Error checking profile completion:', error);
            setProfileComplete(false);
        }
    };

    const checkAvailabilityBlocks = async () => {
        console.log('🔍 checkAvailabilityBlocks called', { user: user?.id?.substring(0, 8) });
        if (!user) {
            console.log('❌ No user, setting availability to false');
            setAvailabilityComplete(false);
            setAvailabilityCount(0);
            return;
        }
        
        try {
            // Use API route instead of direct Supabase query to ensure proper auth
            const response = await fetch('/api/availability?days_ahead=365'); // Get all future blocks
            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }
            const data = await response.json();
            const blocks = data.blocks || [];
            
            console.log('📊 Blocks from API:', {
                count: blocks.length,
                blocks: blocks.map((b: any) => ({
                    id: b.id?.substring(0, 8),
                    start: b.start_time,
                    end: b.end_time,
                    city: b.city
                }))
            });

            // Filter to only future blocks (end_time > now)
            const now = new Date();
            const futureBlocks = blocks.filter((block: any) => {
                const endTime = new Date(block.end_time);
                return endTime > now;
            });

            const count = futureBlocks.length;
            console.log('✅ Setting availability state:', { 
                totalBlocksFromAPI: blocks.length,
                futureBlocksAfterFilter: count, 
                isComplete: count >= 3, 
                required: 3
            });
            
            setAvailabilityCount(count);
            setAvailabilityComplete(count >= 3);
        } catch (error) {
            console.error('❌ Error checking availability blocks:', error);
            setAvailabilityComplete(false);
            setAvailabilityCount(0);
        }
    };

    const loadCityAnchor = async () => {
        try {
            const response = await fetch('/api/city-anchor');
            if (!response.ok) {
                console.error('Error loading city anchor:', response.statusText);
                return;
            }
            const data = await response.json();
            if (data.anchor) {
                setCityAnchor(data.anchor);
            }
        } catch (error) {
            console.error('Error loading city anchor:', error);
        }
    };

    const handleCityAnchorSet = (anchor: CityAnchor) => {
        setCityAnchor(anchor);
    };

    // Show loading while auth is loading
    if (authLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    // Show loading while we're checking profile and availability (but auth is done)
    if (loading || (user && (profileComplete === null || availabilityComplete === null))) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    // Profile completion gate (must be first)
    if (!profileComplete) {
        return (
            <div className="w-full max-w-4xl mx-auto space-y-6 p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Complete Your Profile First</CardTitle>
                        <CardDescription>
                            To generate ready-to-go plans, please complete your profile with your school and location.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Required fields:</p>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>School/University</li>
                                    <li>Location (City, State)</li>
                                </ul>
                            </div>
                            <Button onClick={() => router.push('/edit-profile')}>
                                Go to Edit Profile
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show availability gate warning (but still allow access to calendar)
    const blocksNeeded = Math.max(0, 3 - availabilityCount);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 p-6">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Your Week in {cityAnchor?.city || 'Your City'}</h1>
                <p className="text-muted-foreground">
                    Discover new places • Connect with your network • Make productive time offline
                </p>
            </div>

            {/* City Anchor Selector */}
            {!cityAnchor && (
                <CityAnchorSelector onAnchorSet={handleCityAnchorSet} />
            )}

            {/* Availability Gate Warning (shown when less than 3 blocks) */}
            {cityAnchor && !availabilityComplete && (
                <Card className="border-yellow-500/50 bg-yellow-500/5">
                    <CardHeader>
                        <CardTitle>Set Your Availability</CardTitle>
                        <CardDescription>
                            To help Aria create personalized plans for you, please block out at least 3 times when you're free.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Current status:</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-muted rounded-full h-2">
                                        <div 
                                            className="bg-primary h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, (availabilityCount / 3) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm text-muted-foreground min-w-[80px]">
                                        {availabilityCount} / 3 blocks
                                    </span>
                                </div>
                                {blocksNeeded > 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        You need {blocksNeeded} more availability block{blocksNeeded !== 1 ? 's' : ''} to enable plan generation.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Why this matters:</p>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>Helps Aria find times when you and your connections are both free</li>
                                    <li>Ensures plans are scheduled at convenient times</li>
                                    <li>Increases the likelihood of plans being accepted</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Local Network Strength Meter */}
            {cityAnchor && (
                <LocalNetworkStrength city={cityAnchor.city} />
            )}

            {/* Availability Calendar - Always shown when city is set */}
            {cityAnchor && (
                <div id="availability-calendar">
                    <AvailabilityCalendar 
                        city={cityAnchor.city} 
                        onBlocksUpdated={() => {
                            console.log('🔄 onBlocksUpdated called from AvailabilityCalendar');
                            checkAvailabilityBlocks();
                        }}
                    />
                </div>
            )}

            {/* Ready Plans Feed - Only shown when availability is complete */}
            {cityAnchor && availabilityComplete && (
                <ReadyPlansFeed city={cityAnchor.city} />
            )}

            {/* Message when availability incomplete but city is set */}
            {cityAnchor && !availabilityComplete && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Add more availability blocks above to enable plan generation.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
