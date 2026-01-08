import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { searchYelpVenues, getActivityTypeFromInterests } from '@/lib/yelp';
import {
    getRankedConnections,
    getUsedVenues,
    getRecentPlansWithInvitee,
    generateSmartTimeWindows,
    selectBestVenue
} from '@/lib/plan-generation';
import { generatePlanTitle } from '@/lib/plan-titles';

// POST: Generate ready plans for a user based on their city anchor and local network
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { city } = body;

        if (!city) {
            return NextResponse.json({ error: 'City is required' }, { status: 400 });
        }

        // Get user's accepted connections (user can be sender or receiver)
        const { data: connections, error: connectionsError } = await supabase
            .from('user_connections')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .eq('status', 'accepted');

        if (connectionsError) {
            console.error('Error fetching connections:', connectionsError);
            return NextResponse.json({ error: connectionsError.message }, { status: 500 });
        }

        if (!connections || connections.length === 0) {
            return NextResponse.json({
                error: 'No connections found',
                local_friend_count: 0,
                minimum_required: 3
            }, { status: 400 });
        }

        // Get the other user IDs
        const connectionIds = connections.map(c => 
            c.sender_id === user.id ? c.receiver_id : c.sender_id
        );

        // Get user's profile to check school
        const { data: userProfileFull } = await supabase
            .from('profiles')
            .select('id, location, interests, school, school_id')
            .eq('id', user.id)
            .single();

        // Get profiles of connections to check their locations and schools
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, location, interests, school, school_id')
            .in('id', connectionIds);

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            return NextResponse.json({ error: profilesError.message }, { status: 500 });
        }

        // Filter to connections in the same city (case-insensitive match)
        const cityConnectionIds = profiles?.filter(p => 
            p.location && p.location.toLowerCase().includes(city.toLowerCase())
        ).map(p => p.id) || [];

        if (cityConnectionIds.length < 3) {
            return NextResponse.json({
                error: 'Insufficient local network density',
                local_friend_count: cityConnectionIds.length,
                minimum_required: 3
            }, { status: 400 });
        }

        // Get ranked connections by compatibility (DNA similarity)
        const rankedConnections = await getRankedConnections(
            supabase,
            user.id,
            cityConnectionIds,
            userProfileFull
        );

        if (rankedConnections.length === 0) {
            return NextResponse.json({
                error: 'No compatible connections found',
                local_friend_count: cityConnectionIds.length
            }, { status: 400 });
        }

        // Get used venues to avoid duplicates
        const usedVenueNames = await getUsedVenues(supabase, user.id, city);

        // Get user availability blocks if available
        const { data: availabilityBlocks } = await supabase
            .from('user_availability_blocks')
            .select('start_time, end_time')
            .eq('user_id', user.id)
            .gte('end_time', new Date().toISOString())
            .order('start_time', { ascending: true });

        console.log(`[Plan Generation] Starting generation for user ${user.id} in ${city}`);
        console.log(`[Plan Generation] Creator availability: ${availabilityBlocks?.length || 0} blocks`);
        if (availabilityBlocks && availabilityBlocks.length > 0) {
            console.log(`[Plan Generation] Creator availability blocks:`, availabilityBlocks.map(b => ({
                start: new Date(b.start_time).toLocaleString(),
                end: new Date(b.end_time).toLocaleString()
            })));
        }

        // Generate smart time windows (considers availability blocks, school schedules, finals week, etc.)
        const timeWindows = generateSmartTimeWindows(
            userProfileFull?.school || null,
            availabilityBlocks || []
        );

        console.log(`[Plan Generation] Generated ${timeWindows.length} time windows for creator`);

        const generatedPlans = [];
        const usedInviteeIds = new Set<string>(); // Track invitees to avoid duplicates
        const usedTimeSlots = new Set<string>(); // Track time slots to spread out plans
        const commitRuleHours = 24; // Constant for all plans

        // Generate 5 plans (more options, better quality)
        // First, pre-check all connections for recent plans (batch check)
        const connectionRecentPlans = new Map<string, number>();
        await Promise.all(
            rankedConnections.map(async (conn) => {
                const count = await getRecentPlansWithInvitee(supabase, user.id, conn.id, 14);
                connectionRecentPlans.set(conn.id, count);
            })
        );

        for (let i = 0; i < 5 && i < timeWindows.length; i++) {
            // Pick best available connection (skip if recently used)
            let selectedConnection = null;
            let connectionIndex = 0;
            
            while (connectionIndex < rankedConnections.length && !selectedConnection) {
                const candidate = rankedConnections[connectionIndex];
                
                // Skip if we've already used this invitee in this batch
                if (usedInviteeIds.has(candidate.id)) {
                    connectionIndex++;
                    continue;
                }
                
                // Check if we've had recent plans with this invitee (avoid repetition)
                const recentPlansCount = connectionRecentPlans.get(candidate.id) || 0;
                
                // Skip if we've had 2+ plans with this person in last 2 weeks
                if (recentPlansCount >= 2) {
                    connectionIndex++;
                    continue;
                }
                
                selectedConnection = candidate;
                usedInviteeIds.add(candidate.id);
            }
            
            // If no good connection found, skip this plan
            if (!selectedConnection) continue;
            
            // Get invitee's availability blocks to find overlapping free times
            const { data: inviteeAvailabilityBlocks } = await supabase
                .from('user_availability_blocks')
                .select('start_time, end_time')
                .eq('user_id', selectedConnection.id)
                .gte('end_time', new Date().toISOString())
                .order('start_time', { ascending: true });

            console.log(`\n[Plan Generation] Checking availability for plan ${i + 1}:`);
            console.log(`  Creator: ${user.id.substring(0, 8)}... (${availabilityBlocks?.length || 0} blocks)`);
            console.log(`  Invitee: ${selectedConnection.id.substring(0, 8)}... (${inviteeAvailabilityBlocks?.length || 0} blocks)`);
            
            if (inviteeAvailabilityBlocks && inviteeAvailabilityBlocks.length > 0) {
                console.log(`  Invitee availability:`, inviteeAvailabilityBlocks.map(b => ({
                    start: new Date(b.start_time).toLocaleString(),
                    end: new Date(b.end_time).toLocaleString()
                })));
            }

            // Find overlapping time windows between creator and invitee
            let selectedTimeWindow = null;
            const overlappingWindows: Array<{ start: string; end: string; proposedTime: string; score: number }> = [];

            if (inviteeAvailabilityBlocks && inviteeAvailabilityBlocks.length > 0) {
                // Check each creator time window against invitee availability
                for (const creatorWindow of timeWindows) {
                    const windowStart = new Date(creatorWindow.start);
                    const windowEnd = new Date(creatorWindow.end);
                    const windowProposed = new Date(creatorWindow.proposedTime);

                    // Check if this window overlaps with any invitee availability block
                    for (const inviteeBlock of inviteeAvailabilityBlocks) {
                        const inviteeStart = new Date(inviteeBlock.start_time);
                        const inviteeEnd = new Date(inviteeBlock.end_time);

                        // Check for overlap: windows overlap if start < end and end > start
                        if (windowStart < inviteeEnd && windowEnd > inviteeStart) {
                            // Calculate overlap window
                            const overlapStart = windowStart > inviteeStart ? windowStart : inviteeStart;
                            const overlapEnd = windowEnd < inviteeEnd ? windowEnd : inviteeEnd;
                            
                            // Only use if overlap is at least 1 hour
                            const overlapHours = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);
                            if (overlapHours >= 1) {
                                // Use the proposed time if it's within the overlap, otherwise use middle of overlap
                                let proposedTime = windowProposed;
                                if (windowProposed < overlapStart || windowProposed > overlapEnd) {
                                    proposedTime = new Date(overlapStart.getTime() + (overlapEnd.getTime() - overlapStart.getTime()) / 2);
                                }

                                overlappingWindows.push({
                                    start: overlapStart.toISOString(),
                                    end: overlapEnd.toISOString(),
                                    proposedTime: proposedTime.toISOString(),
                                    score: creatorWindow.score + 0.2 // Boost score for matching availability
                                });

                                console.log(`  ✓ MATCH FOUND! Overlap: ${overlapStart.toLocaleString()} - ${overlapEnd.toLocaleString()} (${overlapHours.toFixed(1)}h)`);
                                console.log(`    Creator window: ${windowStart.toLocaleString()} - ${windowEnd.toLocaleString()}`);
                                console.log(`    Invitee block: ${inviteeStart.toLocaleString()} - ${inviteeEnd.toLocaleString()}`);
                            } else {
                                console.log(`  ✗ Overlap too short: ${overlapHours.toFixed(1)}h (need 1h+)`);
                            }
                        }
                    }
                }

                // Sort overlapping windows by score and pick the best one
                if (overlappingWindows.length > 0) {
                    overlappingWindows.sort((a, b) => b.score - a.score);
                    const timeKey = overlappingWindows[0].start.substring(0, 10);
                    if (!usedTimeSlots.has(timeKey)) {
                        selectedTimeWindow = overlappingWindows[0];
                        usedTimeSlots.add(timeKey);
                        console.log(`  ✅ SELECTED: ${new Date(selectedTimeWindow.start).toLocaleString()} (${overlappingWindows.length} overlaps found)`);
                    } else {
                        console.log(`  ⚠ Time slot already used, trying next overlap...`);
                    }
                } else {
                    console.log(`  ✗ No overlapping availability found - checked ${timeWindows.length} creator windows against ${inviteeAvailabilityBlocks.length} invitee blocks`);
                }
            } else {
                // Invitee has no availability blocks, use creator's windows (fallback)
                console.log(`  ⚠ WARNING: Invitee has no availability blocks set up`);
                console.log(`  → Falling back to creator's availability: ${timeWindows.length} windows available`);
                for (const window of timeWindows) {
                    const timeKey = window.start.substring(0, 10);
                    if (!usedTimeSlots.has(timeKey)) {
                        selectedTimeWindow = window;
                        usedTimeSlots.add(timeKey);
                        console.log(`  → Using creator window: ${new Date(window.start).toLocaleString()}`);
                        break;
                    }
                }
            }

            // If no time window available, use the highest scored one (fallback)
            if (!selectedTimeWindow && timeWindows.length > 0) {
                selectedTimeWindow = timeWindows[0];
                console.log(`  ⚠ Using fallback time window: ${new Date(selectedTimeWindow.start).toLocaleString()}`);
            }

            if (!selectedTimeWindow) {
                console.log(`  ✗ Skipping plan ${i + 1} - no time window available`);
                continue; // Skip if no time window
            }

            const timeWindow = selectedTimeWindow;
            
            // Get shared interests from ranked connection (deduplicate and limit to most relevant)
            const sharedInterests = Array.from(new Set(selectedConnection.sharedInterests || [])).slice(0, 5);

            // Determine activity type from shared interests
            let activityType = 'coffee';
            
            if (sharedInterests.length > 0) {
                activityType = getActivityTypeFromInterests(sharedInterests);
            } else {
                // Fallback: rotate through discovery-focused activities
                const defaults = ['coffee', 'walk', 'casual_food', 'museum', 'art'];
                activityType = defaults[i % defaults.length];
            }

            // Fetch real venues from Yelp API - get more options for better selection
            const venueOptions = await searchYelpVenues(activityType, city, 10);
            
            // Select best venue (considers rating, distance, and avoids duplicates)
            let selectedVenue = selectBestVenue(venueOptions, usedVenueNames);
            
            if (!selectedVenue) {
                // Fallback if no venues found
                console.warn(`No Yelp venues found for ${activityType} in ${city}, using fallback`);
                selectedVenue = {
                    name: `${activityType === 'coffee' ? 'Local Coffee Shop' : activityType === 'walk' ? 'Local Park' : 'Local Restaurant'}`,
                    address: `${city}`,
                    rating: 4.5,
                    distance: '0.5 mi'
                };
            } else {
                // Mark venue as used
                usedVenueNames.add(selectedVenue.name.toLowerCase().trim());
            }
            
            // Get invitee profile for name (if not already loaded)
            let inviteeName: string | undefined;
            if (selectedConnection.profile) {
                // Profile is already loaded in the connection object
                inviteeName = selectedConnection.profile.full_name;
            } else {
                // Fetch if needed (shouldn't happen, but fallback)
                const { data: inviteeProfile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', selectedConnection.id)
                    .single();
                inviteeName = inviteeProfile?.full_name;
            }
            
            // Generate dynamic, engaging title
            const activityDescription = generatePlanTitle({
                activityType,
                sharedInterests,
                venueName: selectedVenue.name,
                inviteeName,
                inviteeSchool: selectedConnection.school || undefined, // Convert null to undefined
                city
            });
            
            // Store as single venue (not array)
            const venueOptionsArray = [selectedVenue];

            // Create plan
            const commitRuleExpiresAt = new Date(timeWindow.start);
            commitRuleExpiresAt.setHours(commitRuleExpiresAt.getHours() + commitRuleHours);

            const { data: plan, error: planError } = await supabase
                .from('ready_plans')
                .insert({
                    user_id: user.id,
                    city,
                    time_window_start: timeWindow.start,
                    time_window_end: timeWindow.end,
                    proposed_start_time: timeWindow.proposedTime,
                    activity_type: activityType,
                    activity_description: activityDescription,
                    venue_options: venueOptionsArray,
                    selected_venue: selectedVenue, // Pre-select the venue
                    invitee_ids: [selectedConnection.id],
                    commit_rule_min_acceptances: 2,
                    commit_rule_hours: commitRuleHours,
                    commit_rule_expires_at: commitRuleExpiresAt.toISOString(),
                    shared_interests: sharedInterests,
                    compatibility_score: selectedConnection.similarity, // Store compatibility score
                    status: 'pending'
                })
                .select()
                .single();

            if (!planError && plan) {
                generatedPlans.push(plan);
                console.log(`  ✅ Plan created: ${plan.id.substring(0, 8)}... for ${selectedConnection.id.substring(0, 8)}... at ${new Date(plan.proposed_start_time).toLocaleString()}`);
            } else if (planError) {
                console.error(`  ✗ Error creating plan:`, planError);
            }
        }

        // Summary log
        console.log(`\n[Plan Generation] SUMMARY:`);
        console.log(`  ✅ Generated ${generatedPlans.length} plans`);
        console.log(`  📍 City: ${city}`);
        console.log(`  👤 Creator: ${user.id.substring(0, 8)}... (${availabilityBlocks?.length || 0} availability blocks)`);
        console.log(`  📅 Plans created:`);
        generatedPlans.forEach((plan, idx) => {
            const inviteeId = plan.invitee_ids?.[0] || 'unknown';
            console.log(`    ${idx + 1}. Plan ${plan.id.substring(0, 8)}... for ${inviteeId.substring(0, 8)}... at ${new Date(plan.proposed_start_time).toLocaleString()}`);
        });
        console.log(`\n  💡 Note: These plans will appear for both the creator and invitees when they view their plans.\n`);

        return NextResponse.json({
            success: true,
            plans_generated: generatedPlans.length,
            plans: generatedPlans
        });
    } catch (error: any) {
        console.error('Error in POST /api/ready-plans/generate:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

