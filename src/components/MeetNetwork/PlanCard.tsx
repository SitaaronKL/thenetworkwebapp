'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

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
    invitees?: Invitee[];
    commit_rule_min_acceptances: number;
    commit_rule_hours: number;
    commit_rule_expires_at: string;
    shared_interests: string[];
    status: string;
    ready_plan_responses?: PlanResponse[];
}

interface PlanCardProps {
    plan: ReadyPlan;
    onRespond: (planId: string, response: 'accepted' | 'declined') => void;
}

export default function PlanCard({ plan, onRespond }: PlanCardProps) {
    const [responding, setResponding] = useState(false);
    const { user } = useAuth();

    // Get current user's response
    const currentUserId = user?.id;
    const userResponse = currentUserId 
        ? plan.ready_plan_responses?.find(r => r.user_id === currentUserId)
        : null;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const getAcceptanceCount = () => {
        return plan.ready_plan_responses?.filter(r => r.response === 'accepted').length || 0;
    };

    const acceptanceCount = getAcceptanceCount();
    const needsMore = acceptanceCount < plan.commit_rule_min_acceptances;
    const expiresAt = new Date(plan.commit_rule_expires_at);
    const hoursUntilExpiry = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)));

    const handleResponse = async (response: 'accepted' | 'declined') => {
        setResponding(true);
        await onRespond(plan.id, response);
        setResponding(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl">{plan.activity_description || plan.activity_type}</CardTitle>
                        <CardDescription>
                            {formatDate(plan.proposed_start_time)}
                        </CardDescription>
                    </div>
                    <Badge variant={plan.status === 'committed' ? 'default' : 'secondary'}>
                        {plan.status === 'committed' ? 'Committed' : 'Pending'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Single Venue - Discovery Focus */}
                {(plan.selected_venue || (plan.venue_options && plan.venue_options.length > 0)) && (
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-2">📍 Discover</p>
                        {plan.status === 'committed' && plan.selected_venue ? (
                            // When committed, show the booked venue
                            <div>
                                <p className="text-base font-semibold">{plan.selected_venue.name}</p>
                                <p className="text-sm text-muted-foreground mt-1">{plan.selected_venue.address}</p>
                                {plan.selected_venue.rating && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        ⭐ {plan.selected_venue.rating} {plan.selected_venue.distance && `• ${plan.selected_venue.distance}`}
                                    </p>
                                )}
                            </div>
                        ) : (
                            // When pending, show the proposed venue
                            <div>
                                <p className="text-base font-semibold">
                                    {(plan.selected_venue || plan.venue_options[0])?.name}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {(plan.selected_venue || plan.venue_options[0])?.address}
                                </p>
                                {(plan.selected_venue || plan.venue_options[0])?.rating && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        ⭐ {(plan.selected_venue || plan.venue_options[0])?.rating} 
                                        {(plan.selected_venue || plan.venue_options[0])?.distance && ` • ${(plan.selected_venue || plan.venue_options[0])?.distance}`}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Invitees - Show who you're meeting with */}
                {plan.invitees && plan.invitees.length > 0 && (
                    <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-2">👥 Meeting with</p>
                        <div className="space-y-2">
                            {plan.invitees.map((invitee) => {
                                const inviteeResponse = plan.ready_plan_responses?.find(r => r.user_id === invitee.id);
                                const hasAccepted = inviteeResponse?.response === 'accepted';
                                const hasDeclined = inviteeResponse?.response === 'declined';
                                
                                return (
                                    <div key={invitee.id} className="flex items-center gap-2">
                                        {invitee.avatar_url ? (
                                            <img 
                                                src={invitee.avatar_url} 
                                                alt={invitee.full_name}
                                                className="w-8 h-8 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                <span className="text-xs font-medium">
                                                    {invitee.full_name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{invitee.full_name}</p>
                                            {invitee.school && (
                                                <p className="text-xs text-muted-foreground">{invitee.school}</p>
                                            )}
                                        </div>
                                        <div>
                                            {hasAccepted ? (
                                                <Badge variant="default" className="text-xs bg-green-500">✓ Accepted</Badge>
                                            ) : hasDeclined ? (
                                                <Badge variant="outline" className="text-xs">Declined</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-xs">Pending</Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Shared Interests - Show only top 5 to avoid clutter */}
                {plan.shared_interests && plan.shared_interests.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {plan.shared_interests.slice(0, 5).map((interest, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                                {interest}
                            </Badge>
                        ))}
                        {plan.shared_interests.length > 5 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                                +{plan.shared_interests.length - 5} more
                            </Badge>
                        )}
                    </div>
                )}

                {/* Commit Rule Status */}
                <div className={`p-3 rounded-lg ${plan.status === 'committed' ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted/50'}`}>
                    {plan.status === 'committed' ? (
                        <div>
                            <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">
                                ✓ Booked! You're meeting here
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatDate(plan.proposed_start_time)} • {plan.selected_venue?.name || plan.venue_options[0]?.name}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm font-medium mb-1">
                                {needsMore
                                    ? `${plan.commit_rule_min_acceptances - acceptanceCount} more ${plan.commit_rule_min_acceptances - acceptanceCount === 1 ? 'person' : 'people'} need to accept`
                                    : 'Plan is committed!'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {acceptanceCount} of {plan.commit_rule_min_acceptances} accepted
                                {hoursUntilExpiry > 0 && ` • Expires in ${hoursUntilExpiry} ${hoursUntilExpiry === 1 ? 'hour' : 'hours'}`}
                            </p>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {!userResponse && plan.status === 'pending' && currentUserId && (
                    <div className="flex gap-2">
                        <Button
                            onClick={() => handleResponse('accepted')}
                            disabled={responding}
                            className="flex-1"
                        >
                            {responding ? 'Responding...' : 'Accept'}
                        </Button>
                        <Button
                            onClick={() => handleResponse('declined')}
                            disabled={responding}
                            variant="outline"
                            className="flex-1"
                        >
                            Decline
                        </Button>
                    </div>
                )}

                {userResponse && (
                    <div className="text-sm text-muted-foreground">
                        You {userResponse.response === 'accepted' ? 'accepted' : 'declined'} this plan
                    </div>
                )}

                {/* Add Person Button - Only show if plan is pending and user is owner/invitee */}
                {plan.status === 'pending' && currentUserId && (plan.user_id === currentUserId || plan.invitee_ids.includes(currentUserId)) && (
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            // TODO: Open modal to select person from network
                            alert('Add person feature coming soon!');
                        }}
                    >
                        + Add Another Person
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
