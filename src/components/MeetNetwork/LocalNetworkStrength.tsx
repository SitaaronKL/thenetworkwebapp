'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LocalNetworkStrengthProps {
    city: string;
}

interface DensityData {
    local_friend_count: number;
    minimum_required: number;
    can_generate_plans: boolean;
    recommended_count: number;
}

export default function LocalNetworkStrength({ city }: LocalNetworkStrengthProps) {
    const [density, setDensity] = useState<DensityData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDensity();
    }, [city]);

    const loadDensity = async () => {
        try {
            const response = await fetch(`/api/ready-plans/local-density?city=${encodeURIComponent(city)}`);
            const data = await response.json();
            setDensity(data);
        } catch (error) {
            console.error('Error loading network density:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !density) {
        return null;
    }

    const { local_friend_count, minimum_required, can_generate_plans, recommended_count } = density;
    const progress = Math.min((local_friend_count / recommended_count) * 100, 100);
    const needsMore = local_friend_count < minimum_required;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Local Network Strength</CardTitle>
                <CardDescription>
                    {city} plans work best when you have {recommended_count}+ friends here
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">You currently have {local_friend_count} {local_friend_count === 1 ? 'friend' : 'friends'}</span>
                        <span className="text-muted-foreground">{recommended_count} recommended</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full transition-all ${
                                needsMore
                                    ? 'bg-destructive'
                                    : local_friend_count >= recommended_count
                                    ? 'bg-green-500'
                                    : 'bg-yellow-500'
                            }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Status Message */}
                {needsMore ? (
                    <div className="p-4 bg-muted/50 rounded-lg border border-destructive/20">
                        <p className="text-sm font-medium mb-1">Add {minimum_required - local_friend_count} more {city} friends to unlock Ready Plans</p>
                        <p className="text-xs text-muted-foreground">
                            More friends locally means more possible plans and higher acceptance rates
                        </p>
                    </div>
                ) : local_friend_count < recommended_count ? (
                    <div className="p-4 bg-muted/50 rounded-lg border border-yellow-500/20">
                        <p className="text-sm font-medium mb-1">
                            Add {recommended_count - local_friend_count} more {city} friends to unlock 6–10 weekly plans
                        </p>
                        <p className="text-xs text-muted-foreground">
                            You're close! More local friends = more ready-to-go plans
                        </p>
                    </div>
                ) : (
                    <div className="p-4 bg-muted/50 rounded-lg border border-green-500/20">
                        <p className="text-sm font-medium mb-1">Great network density!</p>
                        <p className="text-xs text-muted-foreground">
                            You have enough local friends for optimal plan generation
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
