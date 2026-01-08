/**
 * Dynamic Plan Title Generation
 * Creates varied, engaging titles for ready plans
 */

interface TitleContext {
    activityType: string;
    sharedInterests: string[];
    venueName?: string;
    inviteeName?: string;
    inviteeSchool?: string;
    city?: string;
}

/**
 * Generate a dynamic, engaging plan title
 * Avoids repetition and creates friendly, unique titles
 */
export function generatePlanTitle(context: TitleContext): string {
    const { activityType, sharedInterests, venueName, inviteeName, inviteeSchool, city } = context;
    
    // Normalize and deduplicate interests to avoid repetition
    const normalizedInterests = sharedInterests
        .map(interest => interest?.toLowerCase().trim())
        .filter((interest, index, arr) => interest && arr.indexOf(interest) === index) // Remove duplicates
        .slice(0, 3); // Limit to top 3 to avoid clutter
    
    const primaryInterest = normalizedInterests[0] || '';
    const secondaryInterest = normalizedInterests[1] || '';
    
    // Helper to avoid word repetition in titles
    const avoidRepetition = (text: string, avoidWords: string[]): string => {
        const words = text.toLowerCase().split(/\s+/);
        const seen = new Set<string>();
        const filtered = words.filter(word => {
            const normalized = word.replace(/[^a-z]/g, '');
            if (avoidWords.some(avoid => normalized.includes(avoid) || avoid.includes(normalized))) {
                if (seen.has(normalized)) return false;
                seen.add(normalized);
            }
            return true;
        });
        return filtered.join(' ');
    };
    
    // Friendly, varied title templates
    const titleTemplates: Record<string, string[]> = {
        'coffee': [
            venueName ? `Coffee at ${venueName}` : 'Coffee & catch up',
            primaryInterest ? `Chat about ${primaryInterest}` : 'Coffee conversation',
            venueName ? `Try ${venueName}` : 'Coffee meetup',
            primaryInterest ? `Talk ${primaryInterest} over coffee` : 'Coffee & connect',
            venueName ? `Visit ${venueName}` : 'Coffee break together',
            inviteeName ? `Coffee with ${inviteeName.split(' ')[0]}` : 'Coffee & hang',
        ],
        'walk': [
            city ? `Walk around ${city}` : 'Neighborhood stroll',
            primaryInterest ? `Talk about ${primaryInterest} while walking` : 'Walk & talk',
            'Explore together',
            primaryInterest ? `Stroll & discuss ${primaryInterest}` : 'City walk',
            'Walking meetup',
            inviteeName ? `Walk with ${inviteeName.split(' ')[0]}` : 'Explore the area',
        ],
        'casual_food': [
            venueName ? `Dinner at ${venueName}` : 'Grab dinner together',
            primaryInterest ? `Talk ${primaryInterest} over dinner` : 'Dinner & catch up',
            venueName ? `Try ${venueName}` : 'Try a new spot',
            primaryInterest ? `Food & ${primaryInterest} conversation` : 'Casual dinner',
            venueName ? `Check out ${venueName}` : 'New restaurant discovery',
            inviteeName ? `Dinner with ${inviteeName.split(' ')[0]}` : 'Dinner together',
        ],
        'museum': [
            venueName ? `Visit ${venueName}` : 'Museum exploration',
            primaryInterest ? `Explore ${primaryInterest} together` : 'Museum visit',
            venueName ? `See ${venueName}` : 'Cultural discovery',
            primaryInterest ? `Learn about ${primaryInterest}` : 'Museum day',
            'Art & culture',
            inviteeName ? `Museum visit with ${inviteeName.split(' ')[0]}` : 'Gallery exploration',
        ],
        'art': [
            venueName ? `See ${venueName}` : 'Gallery visit',
            primaryInterest ? `Explore ${primaryInterest} art` : 'Art gallery',
            venueName ? `Check out ${venueName}` : 'Art discovery',
            primaryInterest ? `Discuss ${primaryInterest} at the gallery` : 'Gallery exploration',
            'Art & culture',
            inviteeName ? `Art with ${inviteeName.split(' ')[0]}` : 'Creative meetup',
        ],
        'concert': [
            venueName ? `Live show at ${venueName}` : 'Live music',
            primaryInterest ? `Enjoy ${primaryInterest} & music` : 'Concert night',
            venueName ? `See a show at ${venueName}` : 'Music night',
            primaryInterest ? `Connect through ${primaryInterest} & live music` : 'Live performance',
            'Music & vibes',
            inviteeName ? `Concert with ${inviteeName.split(' ')[0]}` : 'Music discovery',
        ],
        'sports': [
            venueName ? `Watch at ${venueName}` : 'Game night',
            primaryInterest ? `Sports & ${primaryInterest} chat` : 'Sports viewing',
            venueName ? `Catch the game at ${venueName}` : 'Game together',
            'Sports & hang',
            inviteeName ? `Game with ${inviteeName.split(' ')[0]}` : 'Watch the game',
        ],
        'fitness': [
            'Workout together',
            primaryInterest ? `Fitness & ${primaryInterest} talk` : 'Active meetup',
            'Exercise & connect',
            primaryInterest ? `Stay active & discuss ${primaryInterest}` : 'Fitness session',
            'Workout & hang',
            inviteeName ? `Workout with ${inviteeName.split(' ')[0]}` : 'Get active',
        ],
        'bookstore': [
            venueName ? `Browse ${venueName}` : 'Bookstore visit',
            primaryInterest ? `Books & ${primaryInterest} discussion` : 'Bookstore exploration',
            venueName ? `Check out ${venueName}` : 'Literary discovery',
            primaryInterest ? `Talk ${primaryInterest} at the bookstore` : 'Book meetup',
            'Books & conversation',
            inviteeName ? `Bookstore with ${inviteeName.split(' ')[0]}` : 'Literary hangout',
        ],
    };

    // Get templates for this activity type
    const templates = titleTemplates[activityType] || titleTemplates['coffee'];
    
    // Add context-specific variations (avoid repetition)
    const contextualTemplates: string[] = [];
    
    if (inviteeName && venueName) {
        const firstName = inviteeName.split(' ')[0];
        contextualTemplates.push(
            `Meet ${firstName} at ${venueName}`,
            `Hang with ${firstName} at ${venueName}`,
            `${firstName} & you at ${venueName}`
        );
    }
    
    if (inviteeSchool && primaryInterest) {
        contextualTemplates.push(
            `${inviteeSchool} meetup: ${primaryInterest}`,
            `Connect over ${primaryInterest}`
        );
    }
    
    if (venueName && primaryInterest && !venueName.toLowerCase().includes(primaryInterest.toLowerCase())) {
        // Only add if venue name doesn't already contain the interest (avoid "music music")
        contextualTemplates.push(
            `${venueName}: ${primaryInterest} conversation`,
            `Explore ${venueName} & talk ${primaryInterest}`
        );
    }
    
    if (primaryInterest && secondaryInterest && primaryInterest !== secondaryInterest) {
        contextualTemplates.push(
            `Talk ${primaryInterest} & ${secondaryInterest}`,
            `Connect over ${primaryInterest} & ${secondaryInterest}`
        );
    }

    // Combine all templates
    const allTemplates = [...contextualTemplates, ...templates];
    
    // Select a template (deterministic but varied based on context)
    const seed = (venueName?.length || 0) + (primaryInterest?.length || 0) + (inviteeName?.length || 0) + (activityType?.length || 0);
    const index = seed % allTemplates.length;
    
    let title = allTemplates[index];
    
    // Clean up title: remove repetition, capitalize properly
    if (title) {
        // Remove duplicate words (case-insensitive)
        const words = title.split(/\s+/);
        const seen = new Set<string>();
        const uniqueWords = words.filter(word => {
            const lower = word.toLowerCase().replace(/[^a-z]/g, '');
            if (seen.has(lower)) return false;
            seen.add(lower);
            return true;
        });
        title = uniqueWords.join(' ');
        
        // Avoid patterns like "music music" or "discover discover"
        const avoidWords = [primaryInterest, secondaryInterest, activityType].filter(Boolean);
        title = avoidRepetition(title, avoidWords);
    }
    
    // Fallback if title is empty or too short
    if (!title || title.trim().length < 3) {
        if (venueName) {
            title = `Meet at ${venueName}`;
        } else if (primaryInterest) {
            title = `Connect over ${primaryInterest}`;
        } else if (inviteeName) {
            title = `Meet ${inviteeName.split(' ')[0]}`;
        } else {
            title = "Let's meet up";
        }
    }
    
    // Capitalize first letter and ensure proper formatting
    title = title.trim();
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    // Final check: remove any obvious repetition
    const finalWords = title.split(/\s+/);
    const cleanedWords: string[] = [];
    let lastWord = '';
    for (const word of finalWords) {
        const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
        if (normalized !== lastWord || normalized.length < 3) {
            cleanedWords.push(word);
            lastWord = normalized;
        }
    }
    
    return cleanedWords.join(' ') || title;
}
