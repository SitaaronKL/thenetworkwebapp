export interface NetworkPerson {
    id: string;
    name: string;
    full_name?: string; // When present (e.g. from profile fetch), use for display/first name
    imageUrl?: string;
    starColor?: string;
    x: number;
    y: number;
    compatibilityPercentage?: number; // Percentage (0-100) from user_matches table
    connections: string[];
    bio?: string;
    // Network branching properties
    isBranchNode?: boolean; // True if this node belongs to a friend's network (not user's direct connection)
    isGreyedOut?: boolean; // True if this node should be displayed in greyscale
    parentFriendId?: string; // The friend ID this branch node is connected through
    
    // Discovery node properties (floating circles with no connection lines)
    isDiscoveryNode?: boolean; // True if this is a discovery/suggested user (not connected yet)
    proximityScore?: number; // 0-1, determines distance from user node
    proximityLevel?: 'very_close' | 'close' | 'nearby' | 'distant' | 'far';
    sharedNetworks?: string[]; // Networks shared with current user
    whyYouMightMeet?: string; // Description shown when clicked
    
    // Suggestion node properties (AI-suggested people with invisible links)
    isSuggestionNode?: boolean; // True if this is a suggested user (connected with invisible links)
    similarity?: number; // 0-1, determines link distance. For suggestions: user_overlap_scores.overlap when available, else match_profiles similarity
    suggestionReason?: string; // Why this person is suggested
}

export interface Profile {
    id: string;
    full_name: string;
    bio?: string;
    avatar_url?: string;
    interests?: string[];
    school?: string;
}

// Convert compatibility percentage to stars
// 78%+ = 5 stars, 65-77% = 4 stars, 50-64% = 3 stars, 35-49% = 2 stars, <35% = 1 star
export function percentageToStars(percentage: number | null): number {
    if (percentage === null) return 0;
    if (percentage >= 78) return 5;
    if (percentage >= 65) return 4;
    if (percentage >= 50) return 3;
    if (percentage >= 35) return 2;
    return 1;
}

// Mock people data for demo (matching mobile app)
export function getMockPeople(): NetworkPerson[] {
    return [
        {
            id: "1",
            name: "Sarah",
            imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
            x: 180,
            y: 300,
            compatibilityPercentage: 85,
            connections: ["2", "5", "7"],
        },
        {
            id: "2",
            name: "Marcus",
            imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
            x: 420,
            y: 270,
            compatibilityPercentage: 85,
            connections: ["1", "3", "8"],
        },
        {
            id: "3",
            name: "Emma",
            imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
            x: 300,
            y: 480,
            compatibilityPercentage: 85,
            connections: ["2", "4", "9"],
        },
        {
            id: "4",
            name: "David",
            imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
            x: 510,
            y: 525,
            compatibilityPercentage: 72,
            connections: ["3", "6", "10"],
        },
        {
            id: "5",
            name: "Olivia",
            imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
            x: 120,
            y: 570,
            compatibilityPercentage: 85,
            connections: ["1", "6", "11"],
        },
        {
            id: "6",
            name: "James",
            imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
            x: 360,
            y: 720,
            compatibilityPercentage: 72,
            connections: ["4", "5", "12"],
        },
        {
            id: "7",
            name: "Sophia",
            imageUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80",
            x: 240,
            y: 150,
            compatibilityPercentage: 85,
            connections: ["1", "8", "13"],
        },
        {
            id: "8",
            name: "Michael",
            imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
            x: 480,
            y: 120,
            compatibilityPercentage: 72,
            connections: ["2", "7", "14"],
        },
        {
            id: "9",
            name: "Ava",
            imageUrl: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&q=80",
            x: 150,
            y: 780,
            compatibilityPercentage: 85,
            connections: ["3", "10", "15"],
        },
        {
            id: "10",
            name: "Ethan",
            imageUrl: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&q=80",
            x: 540,
            y: 750,
            compatibilityPercentage: 72,
            connections: ["4", "9", "16"],
        },
        {
            id: "11",
            name: "Isabella",
            imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80",
            x: 60,
            y: 390,
            compatibilityPercentage: 85,
            connections: ["5", "12", "17"],
        },
        {
            id: "12",
            name: "Noah",
            imageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80",
            x: 420,
            y: 870,
            compatibilityPercentage: 72,
            connections: ["6", "11", "18"],
        },
        {
            id: "13",
            name: "Mia",
            imageUrl: "https://images.unsplash.com/photo-1524638431109-93d95c968f03?w=400&q=80",
            x: 90,
            y: 210,
            compatibilityPercentage: 85,
            connections: ["7", "14", "19"],
        },
        {
            id: "14",
            name: "Lucas",
            imageUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80",
            x: 570,
            y: 330,
            compatibilityPercentage: 72,
            connections: ["8", "13", "20"],
        },
        {
            id: "15",
            name: "Charlotte",
            imageUrl: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400&q=80",
            x: 270,
            y: 930,
            compatibilityPercentage: 85,
            connections: ["9", "16"],
        },
        {
            id: "16",
            name: "Benjamin",
            imageUrl: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=400&q=80",
            x: 510,
            y: 960,
            compatibilityPercentage: 72,
            connections: ["10", "15"],
        },
        {
            id: "17",
            name: "Amelia",
            imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80",
            x: 30,
            y: 660,
            compatibilityPercentage: 85,
            connections: ["11", "18"],
        },
        {
            id: "18",
            name: "William",
            imageUrl: "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=400&q=80",
            x: 330,
            y: 1080,
            compatibilityPercentage: 72,
            connections: ["12", "17"],
        },
        {
            id: "19",
            name: "Harper",
            imageUrl: "https://images.unsplash.com/photo-1521566652839-697aa473761a?w=400&q=80",
            x: 210,
            y: 60,
            compatibilityPercentage: 85,
            connections: ["13", "20"],
        },
        {
            id: "20",
            name: "Alex",
            imageUrl: "https://images.unsplash.com/photo-1520409364224-63400afe26e5?w=400&q=80",
            x: 570,
            y: 180,
            compatibilityPercentage: 72,
            connections: ["14", "19"],
        },
    ];
}
