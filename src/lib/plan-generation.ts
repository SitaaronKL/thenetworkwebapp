// Smart Plan Generation Utilities
// This module provides intelligent plan generation using compatibility scores,
// venue deduplication, and smart time/activity matching

import { createClient } from '@/utils/supabase/server';

export interface ConnectionWithScore {
  id: string;
  profile: any;
  similarity: number;
  sharedInterests: string[];
  school: string | null;
  location: string | null;
}

export interface Venue {
  name: string;
  address: string;
  rating: number;
  distance?: string; // Optional - may not always be available
  yelpId?: string;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Parse vector from database format (string or array)
 */
export function parseVector(vector: any): number[] {
  if (Array.isArray(vector)) return vector;
  if (typeof vector === 'string') {
    try {
      return JSON.parse(vector);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Calculate compatibility score between user and connection
 */
export async function calculateCompatibility(
  supabase: any,
  userId: string,
  connectionId: string,
  userInterests: string[] = [],
  connectionInterests: string[] = []
): Promise<{ similarity: number; sharedInterests: string[] }> {
  // Calculate shared interests
  const sharedInterests = userInterests.filter(i => connectionInterests.includes(i));
  
  // Try DNA v2 first (most accurate)
  const [userDnaV2, connectionDnaV2] = await Promise.all([
    supabase.from('digital_dna_v2').select('composite_vector').eq('user_id', userId).single(),
    supabase.from('digital_dna_v2').select('composite_vector').eq('user_id', connectionId).single()
  ]);
  
  let similarity = 0;
  
  if (userDnaV2.data?.composite_vector && connectionDnaV2.data?.composite_vector) {
    const userVec = parseVector(userDnaV2.data.composite_vector);
    const connectionVec = parseVector(connectionDnaV2.data.composite_vector);
    similarity = cosineSimilarity(userVec, connectionVec);
  } else {
    // Fallback to DNA v1
    const [userDnaV1, connectionDnaV1] = await Promise.all([
      supabase.from('digital_dna_v1').select('interest_vector').eq('user_id', userId).single(),
      supabase.from('digital_dna_v1').select('interest_vector').eq('user_id', connectionId).single()
    ]);
    
    if (userDnaV1.data?.interest_vector && connectionDnaV1.data?.interest_vector) {
      const userVec = parseVector(userDnaV1.data.interest_vector);
      const connectionVec = parseVector(connectionDnaV1.data.interest_vector);
      similarity = cosineSimilarity(userVec, connectionVec);
    }
  }
  
  // If no DNA found, use shared interests as fallback
  if (similarity === 0 && sharedInterests.length > 0) {
    const totalInterests = new Set([...userInterests, ...connectionInterests]).size;
    similarity = sharedInterests.length / Math.max(totalInterests, 1);
  }
  
  return { similarity, sharedInterests };
}

/**
 * Get connections ranked by compatibility
 */
export async function getRankedConnections(
  supabase: any,
  userId: string,
  connectionIds: string[],
  userProfile: any
): Promise<ConnectionWithScore[]> {
  const userInterests = (userProfile?.interests || []) as string[];
  const userSchool = userProfile?.school;
  
  // Get all connection profiles (include full_name for titles)
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, location, interests, school, school_id, full_name')
    .in('id', connectionIds);
  
  if (error || !profiles || profiles.length === 0) return [];
  
  // Calculate compatibility for each connection
  const connectionsWithScores: ConnectionWithScore[] = await Promise.all(
    profiles.map(async (profile: any) => {
      const connectionInterests = (profile.interests || []) as string[];
      const { similarity, sharedInterests } = await calculateCompatibility(
        supabase,
        userId,
        profile.id,
        userInterests,
        connectionInterests
      );
      
      // Boost score for same school
      let adjustedSimilarity = similarity;
      if (profile.school === userSchool && userSchool) {
        adjustedSimilarity += 0.1; // Small boost for same school
      }
      
      return {
        id: profile.id,
        profile,
        similarity: adjustedSimilarity,
        sharedInterests,
        school: profile.school,
        location: profile.location
      };
    })
  );
  
  // Sort by similarity (highest first)
  connectionsWithScores.sort((a, b) => b.similarity - a.similarity);
  
  return connectionsWithScores;
}

/**
 * Get used venues from recent plans to avoid duplicates
 */
export async function getUsedVenues(
  supabase: any,
  userId: string,
  city: string,
  daysBack: number = 30
): Promise<Set<string>> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  const { data: recentPlans } = await supabase
    .from('ready_plans')
    .select('venue_options, selected_venue')
    .eq('user_id', userId)
    .eq('city', city)
    .gte('created_at', cutoffDate.toISOString());
  
  const usedVenueNames = new Set<string>();
  
  if (recentPlans) {
    recentPlans.forEach((plan: any) => {
      // Check selected venue
      if (plan.selected_venue?.name) {
        usedVenueNames.add(plan.selected_venue.name.toLowerCase().trim());
      }
      // Check venue options
      if (Array.isArray(plan.venue_options)) {
        plan.venue_options.forEach((venue: any) => {
          if (venue?.name) {
            usedVenueNames.add(venue.name.toLowerCase().trim());
          }
        });
      }
    });
  }
  
  return usedVenueNames;
}

/**
 * Filter out duplicate venues
 */
export function filterDuplicateVenues(venues: Venue[], usedVenueNames: Set<string>): Venue[] {
  return venues.filter(venue => {
    const normalizedName = venue.name.toLowerCase().trim();
    return !usedVenueNames.has(normalizedName);
  });
}

/**
 * Get recent plans with same invitee to avoid repetition
 */
export async function getRecentPlansWithInvitee(
  supabase: any,
  userId: string,
  inviteeId: string,
  daysBack: number = 14
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  const { data: recentPlans } = await supabase
    .from('ready_plans')
    .select('id')
    .eq('user_id', userId)
    .contains('invitee_ids', [inviteeId])
    .gte('created_at', cutoffDate.toISOString());
  
  return recentPlans?.length || 0;
}

/**
 * Generate smart time windows considering availability and school schedules
 */
export function generateSmartTimeWindows(
  userSchool: string | null,
  availabilityBlocks?: Array<{ start_time: string; end_time: string }>
): Array<{ start: string; end: string; proposedTime: string; score: number }> {
  const windows: Array<{ start: string; end: string; proposedTime: string; score: number }> = [];
  const now = new Date();
  
  // If availability blocks exist, use them as primary source
  if (availabilityBlocks && availabilityBlocks.length > 0) {
    for (const block of availabilityBlocks) {
      const start = new Date(block.start_time);
      const end = new Date(block.end_time);
      
      // Skip if block is in the past
      if (end < now) continue;
      
      // Calculate proposed time (middle of block)
      const duration = end.getTime() - start.getTime();
      const proposed = new Date(start.getTime() + duration / 2);
      
      // Score based on day of week and time
      let score = 1.0;
      const dayOfWeek = start.getDay();
      
      // Boost for Thursday/Friday evenings
      if ((dayOfWeek === 4 || dayOfWeek === 5) && start.getHours() >= 17) {
        score = 1.3;
      }
      // Boost for Saturday afternoons
      else if (dayOfWeek === 6 && start.getHours() >= 12 && start.getHours() < 17) {
        score = 1.4;
      }
      // Boost for weekend evenings
      else if ((dayOfWeek === 0 || dayOfWeek === 6) && start.getHours() >= 17) {
        score = 1.2;
      }
      
      windows.push({
        start: start.toISOString(),
        end: end.toISOString(),
        proposedTime: proposed.toISOString(),
        score
      });
    }
    
    // Sort by score and return
    windows.sort((a, b) => b.score - a.score);
    return windows;
  }
  
  // Fallback: Generate default windows if no availability blocks
  // Check if it's finals week (rough heuristic: December or May)
  const month = now.getMonth();
  const isFinalsWeek = month === 11 || month === 4; // December or May
  
  // Generate windows for next 10 days (more options)
  for (let day = 0; day < 10; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    const dayOfWeek = date.getDay();
    
    // Skip if finals week and weekday
    if (isFinalsWeek && dayOfWeek >= 1 && dayOfWeek <= 5) {
      continue;
    }
    
    let score = 1.0;
    
    // Weekday evenings (6pm-8pm) - best for students
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const start = new Date(date);
      start.setHours(18, 0, 0, 0);
      const end = new Date(date);
      end.setHours(20, 0, 0, 0);
      const proposed = new Date(date);
      proposed.setHours(18, 30, 0, 0);
      
      // Boost score for Thursday/Friday (better for social plans)
      if (dayOfWeek === 4 || dayOfWeek === 5) score = 1.3;
      
      windows.push({
        start: start.toISOString(),
        end: end.toISOString(),
        proposedTime: proposed.toISOString(),
        score
      });
    }
    
    // Weekend afternoons (2pm-4pm) - great for discovery
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const start = new Date(date);
      start.setHours(14, 0, 0, 0);
      const end = new Date(date);
      end.setHours(16, 0, 0, 0);
      const proposed = new Date(date);
      proposed.setHours(14, 30, 0, 0);
      
      // Boost score for Saturday (better for weekend plans)
      if (dayOfWeek === 6) score = 1.4;
      
      windows.push({
        start: start.toISOString(),
        end: end.toISOString(),
        proposedTime: proposed.toISOString(),
        score
      });
    }
    
    // Weekend evenings (6pm-8pm) - for dinner/events
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const start = new Date(date);
      start.setHours(18, 0, 0, 0);
      const end = new Date(date);
      end.setHours(20, 0, 0, 0);
      const proposed = new Date(date);
      proposed.setHours(18, 30, 0, 0);
      
      score = dayOfWeek === 6 ? 1.2 : 1.0;
      
      windows.push({
        start: start.toISOString(),
        end: end.toISOString(),
        proposedTime: proposed.toISOString(),
        score
      });
    }
  }
  
  // Sort by score (highest first) and return top options
  windows.sort((a, b) => b.score - a.score);
  
  return windows;
}

/**
 * Select best venue from options considering quality, distance, and uniqueness
 */
export function selectBestVenue(venues: Venue[], usedVenueNames: Set<string>): Venue | null {
  if (venues.length === 0) return null;
  
  // Filter out duplicates
  const uniqueVenues = filterDuplicateVenues(venues, usedVenueNames);
  
  if (uniqueVenues.length === 0) {
    // If all venues are duplicates, pick the best one anyway
    return venues.sort((a, b) => b.rating - a.rating)[0];
  }
  
  // Score venues: rating * 0.6 + distance_score * 0.4
  const scoredVenues = uniqueVenues.map(venue => {
    // Parse distance (e.g., "3.7 mi" -> 3.7)
    let distance = 10; // Default to 10mi if no distance available
    if (venue.distance) {
      const distanceMatch = venue.distance.match(/(\d+\.?\d*)/);
      distance = distanceMatch ? parseFloat(distanceMatch[1]) : 10;
    }
    
    // Distance score: closer is better (inverse)
    const distanceScore = Math.max(0, 1 - (distance / 10)); // Max 10mi considered
    
    // Combined score
    const score = (venue.rating / 5) * 0.6 + distanceScore * 0.4;
    
    return { venue, score };
  });
  
  // Sort by score and pick top one
  scoredVenues.sort((a, b) => b.score - a.score);
  
  return scoredVenues[0].venue;
}
