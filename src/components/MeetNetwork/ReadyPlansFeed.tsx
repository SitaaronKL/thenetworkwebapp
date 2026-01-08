'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PlanCard from './PlanCard';

interface ReadyPlansFeedProps {
    city: string;
}

interface PlanResponse {
    user_id: string;
    response: 'accepted' | 'declined';
    responded_at: string;
}

interface Invitee {
    id: string;
    full_name: string;
    avatar_url?: string;
    school?: string;
    location?: string;
}

interface ReadyPlan {
    id: string;
    user_id: string;
    city: string;
    time_window_start: string;
    time_window_end: string;
    proposed_start_time: string;
    activity_type: string;
    activity_description: string;
    venue_options: Array<{
        name: string;
        address: string;
        rating?: number;
        distance?: string;
    }>;
    selected_venue?: {
        name: string;
        address: string;
        rating?: number;
        distance?: string;
    };
    invitee_ids: string[];
    invitees?: Invitee[]; // Enriched with profile data
    commit_rule_min_acceptances: number;
    commit_rule_hours: number;
    commit_rule_expires_at: string;
    shared_interests: string[];
    status: string;
    ready_plan_responses?: PlanResponse[];
}

export default function ReadyPlansFeed({ city }: ReadyPlansFeedProps) {
    const [plans, setPlans] = useState<ReadyPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [localFriendCount, setLocalFriendCount] = useState<number | null>(null);
    const [canGeneratePlans, setCanGeneratePlans] = useState(false);
    const [loadingDensity, setLoadingDensity] = useState(true);

    useEffect(() => {
        loadPlans();
        loadLocalDensity();
    }, [city]);

    const loadLocalDensity = async () => {
        try {
            setLoadingDensity(true);
            const response = await fetch(`/api/ready-plans/local-density?city=${encodeURIComponent(city)}`);
            const data = await response.json();
            setLocalFriendCount(data.local_friend_count || 0);
            setCanGeneratePlans(data.can_generate_plans || false);
        } catch (error) {
            console.error('Error loading local density:', error);
            setLocalFriendCount(0);
            setCanGeneratePlans(false);
        } finally {
            setLoadingDensity(false);
        }
    };

    const loadPlans = async () => {
        try {
            const response = await fetch(`/api/ready-plans?city=${encodeURIComponent(city)}`);
            const data = await response.json();
            const plansWithInvitees = await enrichPlansWithInvitees(data.plans || []);
            setPlans(plansWithInvitees);
        } catch (error) {
            console.error('Error loading ready plans:', error);
        } finally {
            setLoading(false);
        }
    };

    // Enrich plans with invitee profile information
    const enrichPlansWithInvitees = async (plans: ReadyPlan[]): Promise<ReadyPlan[]> => {
        // Collect all unique invitee IDs
        const inviteeIds = new Set<string>();
        plans.forEach(plan => {
            plan.invitee_ids?.forEach(id => inviteeIds.add(id));
        });

        if (inviteeIds.size === 0) return plans;

        // Fetch invitee profiles
        try {
            const response = await fetch(`/api/profiles?ids=${Array.from(inviteeIds).join(',')}`);
            const data = await response.json();
            const profiles: Invitee[] = data.profiles || [];

            // Map profiles by ID
            const profileMap = new Map<string, Invitee>(profiles.map((p: Invitee) => [p.id, p]));

            // Enrich plans with invitee info
            return plans.map(plan => ({
                ...plan,
                invitees: plan.invitee_ids?.map(id => profileMap.get(id)).filter((invitee): invitee is Invitee => Boolean(invitee)) || []
            }));
        } catch (error) {
            console.error('Error enriching plans with invitees:', error);
            return plans;
        }
    };

    const handleGeneratePlans = async () => {
        setGenerating(true);
        try {
            const response = await fetch('/api/ready-plans/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city })
            });

            const data = await response.json();
            if (data.success) {
                // Reload plans
                await loadPlans();
            } else {
                alert(data.error || 'Failed to generate plans');
            }
        } catch (error) {
            console.error('Error generating plans:', error);
            alert('Failed to generate plans');
        } finally {
            setGenerating(false);
        }
    };

    const handlePlanResponse = async (planId: string, response: 'accepted' | 'declined') => {
        try {
            const res = await fetch(`/api/ready-plans/${planId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response })
            });

            const data = await res.json();
            if (data.success) {
                // Reload plans to get updated status
                await loadPlans();
            }
        } catch (error) {
            console.error('Error responding to plan:', error);
        }
    };

    if (loading || loadingDensity) {
        return (
            <Card>
                <CardContent className="p-8">
                    <div className="text-center text-muted-foreground">Loading plans...</div>
                </CardContent>
            </Card>
        );
    }

    if (plans.length === 0) {
        const minimumRequired = 3;
        const friendsNeeded = Math.max(0, minimumRequired - (localFriendCount || 0));
        
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Ready Plans</CardTitle>
                    <CardDescription>
                        {canGeneratePlans 
                            ? "No ready plans available yet. Generate some to get started!"
                            : `You need ${friendsNeeded} more ${city} friend${friendsNeeded !== 1 ? 's' : ''} to generate plans.`
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {canGeneratePlans ? (
                        <Button onClick={handleGeneratePlans} disabled={generating}>
                            {generating ? 'Generating...' : 'Generate Ready Plans'}
                        </Button>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                <p className="mb-2">Current status:</p>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex-1 bg-muted rounded-full h-2">
                                        <div 
                                            className="bg-primary h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, ((localFriendCount || 0) / minimumRequired) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm text-muted-foreground min-w-[80px]">
                                        {localFriendCount || 0} / {minimumRequired} friends
                                    </span>
                                </div>
                            </div>
                            <Button disabled variant="outline">
                                Add {friendsNeeded} More {city} Friend{friendsNeeded !== 1 ? 's' : ''} to Unlock
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold">{plans.length} Ready-to-Go Plans</h2>
                    <p className="text-sm text-muted-foreground">
                        Discover new places • Connect with your network • Make productive time
                    </p>
                </div>
                {canGeneratePlans ? (
                    <Button onClick={handleGeneratePlans} disabled={generating} variant="outline">
                        {generating ? 'Generating...' : 'Generate More'}
                    </Button>
                ) : (
                    <Button disabled variant="outline" title={`You need ${Math.max(0, 3 - (localFriendCount || 0))} more ${city} friends to generate plans`}>
                        Need More Friends
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {plans.map((plan) => (
                    <PlanCard
                        key={plan.id}
                        plan={plan}
                        onRespond={handlePlanResponse}
                    />
                ))}
            </div>
        </div>
    );
}
