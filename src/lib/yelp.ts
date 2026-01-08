/**
 * Yelp Fusion API Integration
 * Fetches real venue data for plan generation
 */

interface YelpBusiness {
    id: string;
    name: string;
    image_url?: string;
    url: string;
    review_count: number;
    rating: number;
    price?: string;
    location: {
        address1?: string;
        address2?: string;
        address3?: string;
        city: string;
        state: string;
        zip_code: string;
        country: string;
        display_address: string[];
    };
    coordinates: {
        latitude: number;
        longitude: number;
    };
    distance?: number; // in meters
}

interface YelpSearchResponse {
    businesses: YelpBusiness[];
    total: number;
    region: {
        center: {
            latitude: number;
            longitude: number;
        };
    };
}

interface VenueOption {
    name: string;
    address: string;
    rating: number;
    distance?: string;
    yelp_url?: string;
    price?: string;
}

/**
 * Map activity types to Yelp search terms
 */
function getYelpSearchTerm(activityType: string): string {
    const mapping: Record<string, string> = {
        'coffee': 'coffee',
        'walk': 'parks',
        'casual_food': 'restaurants',
        'museum': 'museums',
        'concert': 'music venues',
        'art': 'art galleries',
        'sports': 'sports bars',
        'fitness': 'gyms',
        'bookstore': 'bookstores',
        'library': 'libraries',
    };
    
    return mapping[activityType] || activityType;
}

/**
 * Search Yelp for venues in a city
 */
export async function searchYelpVenues(
    activityType: string,
    city: string,
    limit: number = 5
): Promise<VenueOption[]> {
    const apiKey = process.env.YELP_API_KEY;
    
    if (!apiKey) {
        console.warn('YELP_API_KEY not found, returning empty venues');
        return [];
    }

    const searchTerm = getYelpSearchTerm(activityType);
    const location = city; // e.g., "New York, NY" or "New York"

    try {
        const response = await fetch(
            `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(location)}&limit=${limit}&sort_by=rating`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Yelp API error:', response.status, errorText);
            return [];
        }

        const data: YelpSearchResponse = await response.json();

        return data.businesses
            .filter(business => business.rating >= 4.0) // Only high-rated venues
            .slice(0, limit)
            .map(business => {
                // Convert distance from meters to miles if available
                let distanceStr: string | undefined;
                if (business.distance) {
                    const miles = business.distance / 1609.34; // meters to miles
                    distanceStr = miles < 1 
                        ? `${Math.round(miles * 10) / 10} mi` 
                        : `${Math.round(miles * 10) / 10} mi`;
                }

                // Format address
                const address = business.location.display_address?.join(', ') || 
                               business.location.address1 || 
                               `${business.location.city}, ${business.location.state}`;

                return {
                    name: business.name,
                    address,
                    rating: business.rating,
                    distance: distanceStr,
                    yelp_url: business.url,
                    price: business.price,
                };
            });
    } catch (error) {
        console.error('Error fetching Yelp venues:', error);
        return [];
    }
}

/**
 * Get activity type from shared interests
 * Maps user interests to appropriate activity types
 */
export function getActivityTypeFromInterests(sharedInterests: string[]): string {
    // Priority mapping based on interests
    const interestToActivity: Record<string, string> = {
        'coffee': 'coffee',
        'food': 'casual_food',
        'restaurant': 'casual_food',
        'art': 'art',
        'museum': 'museum',
        'music': 'concert',
        'fitness': 'fitness',
        'sports': 'sports',
        'books': 'bookstore',
        'reading': 'bookstore',
    };

    // Check if any shared interest maps to an activity
    for (const interest of sharedInterests) {
        const lowerInterest = interest.toLowerCase();
        for (const [key, activity] of Object.entries(interestToActivity)) {
            if (lowerInterest.includes(key)) {
                return activity;
            }
        }
    }

    // Default to coffee if no match
    return 'coffee';
}
