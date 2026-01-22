'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Menu from '@/components/Menu';
import InviteModal from '@/components/InviteModal';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';

// Dynamically import InterestGraph to avoid SSR issues with Sigma.js
const InterestGraph = dynamic(() => import('@/components/InterestGraph'), { ssr: false });

// Types
interface ProfileData {
    id: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
    school?: string;
    location?: string;
    interests?: string[];
    hierarchical_interests?: any[];
}

interface ProfileExtras {
    status_text?: string;
    working_on?: string;
    working_on_updated_at?: string;
    gender?: string;
    age?: number;
    hometown?: string;
    looking_for?: string[];
    contact_email?: string;
    contact_phone?: string;
    linkedin_url?: string;
    instagram_url?: string;
    network_handle?: string;
    networks?: string[];
    college?: string;
    high_school?: string;
    company?: string;
    job_description?: string;
}

interface InterestCluster {
    tag: string;
    friendCount: number;
    friends: ClusterFriend[];
}

interface ClusterFriend {
    id: string;
    name: string;
    avatar_url?: string;
}

interface NetworkDistribution {
    network: string;
    myConnections: number;
    totalInNetwork: number;
    percentage: number;
    friends: ClusterFriend[]; // Friends who share this network
}

// Looking for options
const LOOKING_FOR_OPTIONS = [
    'Friends',
    'Collaborators', 
    'Communities',
    'IRL Activities',
    'Mentorship',
    'Dating',
    'Networking',
    'Co-founders'
];

// Hardcoded profile data (to be replaced with DB later)
const HARDCODED_PROFILE = {
    gender: 'Male',
    lookingFor: ['Friends', 'Collaborators', 'Mentorship'],
    hometown: 'Dobbs Ferry, NY',
    age: 22,
    email: 'mzuckerb@fas.harvard.edu',
    networks: ['Hunter College', 'Silicon Valley', 'Google', 'TheNetwork', 'New York, NY'],
    personalInterests: ['social dynamics', 'domination', 'never aunt out'],
    college: 'Harvard - Psychology, Computer Science',
    highSchool: 'Phillips Exeter Academy \'02',
    company: 'Facebook',
    jobDescription: 'I like making things.',
};

// Helper to resolve avatar URL
const getAvatarUrl = (path?: string | null) => {
    if (!path) return undefined;
    // If it's already a full URL (e.g., from Google auth), return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    // Otherwise, construct the Supabase storage URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
        console.warn('NEXT_PUBLIC_SUPABASE_URL is not set');
        return undefined;
    }
    return `${supabaseUrl}/storage/v1/object/public/profile-images/${path}`;
};

// Canonical tag normalization
const normalizeToCanonicalTag = (interest: string): string => {
    const lowerInterest = interest.toLowerCase().trim();
    
    const mappings: Record<string, string> = {
        'artificial intelligence': 'AI & Machine Learning',
        'ai': 'AI & Machine Learning',
        'machine learning': 'AI & Machine Learning',
        'physics': 'Physics',
        'quantum physics': 'Physics',
        'fitness': 'Fitness & Health',
        'health': 'Fitness & Health',
        'health and fitness': 'Fitness & Health',
        'gym': 'Fitness & Health',
        'entrepreneurship': 'Entrepreneurship',
        'startups': 'Entrepreneurship',
        'business': 'Entrepreneurship',
        'coding': 'Software Development',
        'programming': 'Software Development',
        'software': 'Software Development',
        'software development': 'Software Development',
        'music': 'Music',
        'gaming': 'Gaming',
        'philosophy': 'Philosophy',
        'art': 'Art & Design',
        'design': 'Art & Design',
        'creative arts': 'Creative Arts',
        'photography': 'Photography',
        'travel': 'Travel',
        'reading': 'Books & Reading',
        'books': 'Books & Reading',
        'cooking': 'Cooking & Food',
        'food': 'Cooking & Food',
        'movies': 'Film & Cinema',
        'sports': 'Sports',
        'cycling': 'Cycling',
        'biking': 'Biking',
        'hiking': 'Outdoors & Nature',
        'meditation': 'Mindfulness',
        'yoga': 'Mindfulness',
        'finance': 'Finance & Investing',
        'investing': 'Finance & Investing',
        'education': 'Education',
        'science': 'Science',
        'engineering': 'Engineering',
        'diy and engineering': 'DIY & Engineering',
        'history': 'History',
        'comedy': 'Comedy',
        'documentaries': 'Documentaries',
        'environmental awareness': 'Environment',
        'social issues': 'Social Issues',
    };
    
    if (mappings[lowerInterest]) {
        return mappings[lowerInterest];
    }
    
    for (const [key, value] of Object.entries(mappings)) {
        if (lowerInterest.includes(key) || key.includes(lowerInterest)) {
            return value;
        }
    }
    
    return interest.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
};

export default function NetworkProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    
    // State
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [profileExtras, setProfileExtras] = useState<ProfileExtras>({});
    const [interestClusters, setInterestClusters] = useState<InterestCluster[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('about');
    const [selectedCluster, setSelectedCluster] = useState<InterestCluster | null>(null);
    const [selectedNetworkCluster, setSelectedNetworkCluster] = useState<NetworkDistribution | null>(null);
    const [networkScore, setNetworkScore] = useState(0);
    const [connectionsCount, setConnectionsCount] = useState(0);
    const [networkDistribution, setNetworkDistribution] = useState<NetworkDistribution[]>([]);
    const [hoveredNetwork, setHoveredNetwork] = useState<string | null>(null);
    const [totalUsers, setTotalUsers] = useState<number | null>(null);
    
    // Edit Basic Info Modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editGender, setEditGender] = useState('');
    const [editAge, setEditAge] = useState('');
    const [editHometown, setEditHometown] = useState('');
    const [editLookingFor, setEditLookingFor] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    // Edit Contact Info Modal
    const [showContactModal, setShowContactModal] = useState(false);
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editLinkedIn, setEditLinkedIn] = useState('');
    const [editInstagram, setEditInstagram] = useState('');
    const [editNetworkHandle, setEditNetworkHandle] = useState('');
    
    // Edit Networks Modal
    const [showNetworksModal, setShowNetworksModal] = useState(false);
    const [editNetworks, setEditNetworks] = useState<string[]>(['', '', '', '']);
    
    // Edit Education Modal
    const [showEducationModal, setShowEducationModal] = useState(false);
    const [editCollege, setEditCollege] = useState('');
    const [editHighSchool, setEditHighSchool] = useState('');
    
    // Edit Work Modal
    const [showWorkModal, setShowWorkModal] = useState(false);
    const [editCompany, setEditCompany] = useState('');
    const [editJobDescription, setEditJobDescription] = useState('');
    
    // Edit Your Quote Modal
    const [showWorkingOnModal, setShowWorkingOnModal] = useState(false);
    const [editWorkingOn, setEditWorkingOn] = useState('');
    
    // Interests Tab State
    const [interests, setInterests] = useState<string[]>([]);
    const [hierarchicalInterests, setHierarchicalInterests] = useState<any[]>([]);
    const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
    const [interestExplanation, setInterestExplanation] = useState<string | null>(null);
    const [isExplanationLoading, setIsExplanationLoading] = useState(false);
    const [isInterestGraphReady, setIsInterestGraphReady] = useState(false);
    const [friendsWithSelectedInterest, setFriendsWithSelectedInterest] = useState<ClusterFriend[]>([]);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarLoadError, setAvatarLoadError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auth Redirect
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Load profile data
    const loadProfileData = useCallback(async () => {
        if (!user) return;
        
        setIsLoading(true);
        const supabase = createClient();
        
        try {
            // 1. Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, interests, hierarchical_interests')
                .eq('id', user.id)
                .single();
            
            // Fetch interests and location separately if they exist
            // Note: These columns may have been moved or deleted from profiles
            
            if (profile) {
                // Extract interests from either interests column or hierarchical_interests
                const extractInterests = (interests: string[] | null | undefined, hierarchical: any[] | null | undefined): string[] => {
                    // First try to use flat interests array
                    if (interests && Array.isArray(interests) && interests.length > 0) {
                        return interests;
                    }
                    // Fall back to extracting from hierarchical_interests
                    if (hierarchical && Array.isArray(hierarchical)) {
                        const flatInterests: string[] = [];
                        hierarchical.forEach((item: any) => {
                            if (item.tags && Array.isArray(item.tags)) {
                                flatInterests.push(...item.tags);
                            }
                        });
                        return flatInterests;
                    }
                    return [];
                };
                
                const userInterests = extractInterests(profile.interests, profile.hierarchical_interests);
                
                setProfileData({
                    ...profile,
                    interests: userInterests,
                    location: undefined
                });
                setAvatarLoadError(false); // Reset error state when loading profile
                // Set interests for the InterestGraph
                setInterests(userInterests);
                setHierarchicalInterests((profile.hierarchical_interests as any[]) || []);
            }
            
            // 2. Fetch profile extras
            const { data: extras } = await supabase
                .from('user_profile_extras')
                .select('status_text, working_on, working_on_updated_at, gender, age, hometown, looking_for, contact_email, contact_phone, linkedin_url, instagram_url, network_handle, networks, college, high_school, company, job_description')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (extras) {
                setProfileExtras(extras);
                // Initialize edit form with existing values
                setEditGender(extras.gender || '');
                setEditAge(extras.age?.toString() || '');
                setEditHometown(extras.hometown || '');
                setEditWorkingOn(extras.working_on || '');
                setEditLookingFor(extras.looking_for || []);
                setEditEmail(extras.contact_email || '');
                setEditPhone(extras.contact_phone || '');
                setEditLinkedIn(extras.linkedin_url || '');
                setEditInstagram(extras.instagram_url || '');
                setEditNetworkHandle(extras.network_handle || '');
                // Initialize networks with existing values, pad to 4 items
                const existingNetworks = extras.networks || [];
                setEditNetworks([
                    existingNetworks[0] || '',
                    existingNetworks[1] || '',
                    existingNetworks[2] || '',
                    existingNetworks[3] || ''
                ]);
                setEditCollege(extras.college || '');
                setEditHighSchool(extras.high_school || '');
                setEditCompany(extras.company || '');
                setEditJobDescription(extras.job_description || '');
            }
            
            // 3. Calculate network data
            await calculateNetworkData(profile, extras || {});
            
            // 4. Fetch total user count (waitlist + profiles)
            const [waitlistResult, profilesResult] = await Promise.all([
                supabase.from('waitlist').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true })
            ]);
            
            const waitlistCount = waitlistResult.count || 0;
            const profilesCount = profilesResult.count || 0;
            setTotalUsers(waitlistCount + profilesCount);
            
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Calculate network data (clusters + score)
    const calculateNetworkData = async (profile: ProfileData | null, extras: ProfileExtras = {}) => {
        if (!user || !profile) return;
        
        const supabase = createClient();
        
        try {
            // Get friend IDs
            const { data: connections } = await supabase
                .from('user_connections')
                .select('sender_id, receiver_id')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .eq('status', 'accepted');
            
            let allConnections = connections || [];
            if (allConnections.length === 0) {
                const { data: friendRequests } = await supabase
                    .from('friend_requests')
                    .select('sender_id, receiver_id')
                    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                    .eq('status', 'accepted');
                allConnections = friendRequests || [];
            }
            
            const friendIds = allConnections.map(conn => 
                conn.sender_id === user.id ? conn.receiver_id : conn.sender_id
            );
            
            setConnectionsCount(friendIds.length);
            
            // Get friend profiles
            let friendProfiles: any[] = [];
            if (friendIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, interests, hierarchical_interests')
                    .in('id', friendIds);
                friendProfiles = profiles || [];
            }
            
            // Calculate network distribution based on user's networks
            const userNetworks = extras.networks || [];
            if (userNetworks.length > 0 && friendIds.length > 0) {
                // Get friend's networks from user_profile_extras
                const { data: friendExtras } = await supabase
                    .from('user_profile_extras')
                    .select('user_id, networks')
                    .in('user_id', friendIds);
                
                // Get total counts for each network (all users)
                const { data: allUserExtras } = await supabase
                    .from('user_profile_extras')
                    .select('networks');
                
                const distribution: NetworkDistribution[] = userNetworks.map(network => {
                    // Find friends who have this network
                    const friendsWithNetwork = (friendExtras || []).filter(fe => 
                        fe.networks && fe.networks.includes(network)
                    );
                    
                    // Get friend profile details for those who share this network
                    const friendsInNetwork: ClusterFriend[] = friendsWithNetwork.map(fe => {
                        const friendProfile = friendProfiles.find(fp => fp.id === fe.user_id);
                        return {
                            id: fe.user_id,
                            name: friendProfile?.full_name?.split(' ')[0] || 'Friend',
                            avatar_url: friendProfile?.avatar_url
                        };
                    });
                    
                    // Count total users who have this network
                    const totalInNetwork = (allUserExtras || []).filter(ue => 
                        ue.networks && ue.networks.includes(network)
                    ).length;
                    
                    const percentage = totalInNetwork > 0 
                        ? Math.round((friendsInNetwork.length / totalInNetwork) * 100) 
                        : 0;
                    
                    return {
                        network,
                        myConnections: friendsInNetwork.length,
                        totalInNetwork,
                        percentage,
                        friends: friendsInNetwork
                    };
                });
                
                setNetworkDistribution(distribution);
            } else {
                setNetworkDistribution([]);
            }
            
            // Calculate clusters
            const clusterMap = new Map<string, ClusterFriend[]>();
            
            // Helper function to extract flat interests from hierarchical_interests
            const extractInterests = (interests: string[] | null | undefined, hierarchical: any[] | null | undefined): string[] => {
                // First try to use flat interests array
                if (interests && Array.isArray(interests) && interests.length > 0) {
                    return interests;
                }
                // Fall back to extracting from hierarchical_interests
                if (hierarchical && Array.isArray(hierarchical)) {
                    const flatInterests: string[] = [];
                    hierarchical.forEach((item: any) => {
                        if (item.tags && Array.isArray(item.tags)) {
                            flatInterests.push(...item.tags);
                        }
                    });
                    return flatInterests;
                }
                return [];
            };
            
            // Get user's interests (from profile or hierarchical_interests)
            const userInterests = extractInterests(profile.interests, profile.hierarchical_interests);
            const userCanonicalTags = new Set<string>();
            userInterests.forEach(interest => {
                userCanonicalTags.add(normalizeToCanonicalTag(interest));
            });
            
            // Process each friend's interests
            friendProfiles.forEach(friend => {
                const friendInterests = extractInterests(friend.interests, friend.hierarchical_interests);
                friendInterests.forEach((interest: string) => {
                    const canonicalTag = normalizeToCanonicalTag(interest);
                    
                    if (userCanonicalTags.has(canonicalTag)) {
                        if (!clusterMap.has(canonicalTag)) {
                            clusterMap.set(canonicalTag, []);
                        }
                        const existingFriend = clusterMap.get(canonicalTag)!.find(f => f.id === friend.id);
                        if (!existingFriend) {
                            clusterMap.get(canonicalTag)!.push({
                                id: friend.id,
                                name: friend.full_name?.split(' ')[0] || 'Friend',
                                avatar_url: friend.avatar_url,
                            });
                        }
                    }
                });
            });
            
            const clusters: InterestCluster[] = Array.from(clusterMap.entries())
                .filter(([_, friends]) => friends.length >= 1)
                .map(([tag, friends]) => ({
                    tag,
                    friendCount: friends.length,
                    friends: friends, // Store all friends, not just 6
                }))
                .sort((a, b) => b.friendCount - a.friendCount)
                .slice(0, 10);
            
            setInterestClusters(clusters);
            
            // Calculate Network Score
            let completeness = 0;
            if (profile.full_name) completeness += 20;
            if (profile.avatar_url) completeness += 20;
            // Bio removed from profiles table
            if (extras.status_text) completeness += 20;
            if (extras.working_on) completeness += 20;
            
            const connectionScore = friendIds.length * 2;
            const clustersScore = clusters.length * 5;
            const profileScore = completeness * 0.3;
            const finalScore = connectionScore + clustersScore + profileScore;
            
            setNetworkScore(Math.round(finalScore));
            
        } catch (error) {
            console.error('Error calculating network data:', error);
        }
    };

    // Toggle looking for option
    const toggleLookingFor = (option: string) => {
        setEditLookingFor(prev => {
            if (prev.includes(option)) {
                return prev.filter(item => item !== option);
            } else if (prev.length < 3) {
                return [...prev, option];
            }
            return prev; // Max 3 selections
        });
    };

    // Open edit modal
    const openEditModal = () => {
        setEditGender(profileExtras.gender || '');
        setEditAge(profileExtras.age?.toString() || '');
        setEditHometown(profileExtras.hometown || '');
        setEditLookingFor(profileExtras.looking_for || []);
        setShowEditModal(true);
    };

    // Save basic info
    const saveBasicInfo = async () => {
        if (!user) return;
        
        setIsSaving(true);
        const supabase = createClient();
        
        try {
            const { error } = await supabase
                .from('user_profile_extras')
                .upsert({
                    user_id: user.id,
                    gender: editGender || null,
                    age: editAge ? parseInt(editAge) : null,
                    hometown: editHometown || null,
                    looking_for: editLookingFor,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
            
            if (error) {
                console.error('Error saving basic info:', error);
            } else {
                // Update local state
                setProfileExtras(prev => ({
                    ...prev,
                    gender: editGender || undefined,
                    age: editAge ? parseInt(editAge) : undefined,
                    hometown: editHometown || undefined,
                    looking_for: editLookingFor,
                }));
                setShowEditModal(false);
            }
        } catch (error) {
            console.error('Error saving basic info:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Open contact modal
    const openContactModal = () => {
        setEditEmail(profileExtras.contact_email || '');
        setEditPhone(profileExtras.contact_phone || '');
        setEditLinkedIn(profileExtras.linkedin_url || '');
        setEditInstagram(profileExtras.instagram_url || '');
        setEditNetworkHandle(profileExtras.network_handle || '');
        setShowContactModal(true);
    };

    // Save contact info
    const saveContactInfo = async () => {
        if (!user) return;
        
        setIsSaving(true);
        const supabase = createClient();
        
        try {
            const { error } = await supabase
                .from('user_profile_extras')
                .upsert({
                    user_id: user.id,
                    contact_email: editEmail || null,
                    contact_phone: editPhone || null,
                    linkedin_url: editLinkedIn || null,
                    instagram_url: editInstagram || null,
                    network_handle: editNetworkHandle ? `${editNetworkHandle.replace('@', '').replace('.thenetwork', '')}.thenetwork` : null,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
            
            if (error) {
                console.error('Error saving contact info:', error);
            } else {
                // Update local state
                setProfileExtras(prev => ({
                    ...prev,
                    contact_email: editEmail || undefined,
                    contact_phone: editPhone || undefined,
                    linkedin_url: editLinkedIn || undefined,
                    instagram_url: editInstagram || undefined,
                    network_handle: editNetworkHandle || undefined,
                }));
                setShowContactModal(false);
            }
        } catch (error) {
            console.error('Error saving contact info:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Open networks modal
    const openNetworksModal = () => {
        const existingNetworks = profileExtras.networks || [];
        setEditNetworks([
            existingNetworks[0] || '',
            existingNetworks[1] || '',
            existingNetworks[2] || '',
            existingNetworks[3] || ''
        ]);
        setShowNetworksModal(true);
    };

    // Update a single network input
    const updateNetwork = (index: number, value: string) => {
        setEditNetworks(prev => {
            const updated = [...prev];
            updated[index] = value;
            return updated;
        });
    };

    // Save networks
    const saveNetworks = async () => {
        if (!user) return;
        
        setIsSaving(true);
        const supabase = createClient();
        
        try {
            // Filter out empty strings
            const networksToSave = editNetworks.filter(n => n.trim() !== '');
            
            const { error } = await supabase
                .from('user_profile_extras')
                .upsert({
                    user_id: user.id,
                    networks: networksToSave,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
            
            if (error) {
                console.error('Error saving networks:', error);
            } else {
                // Update local state
                setProfileExtras(prev => ({
                    ...prev,
                    networks: networksToSave,
                }));
                setShowNetworksModal(false);
            }
        } catch (error) {
            console.error('Error saving networks:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Open education modal
    const openEducationModal = () => {
        setEditCollege(profileExtras.college || '');
        setEditHighSchool(profileExtras.high_school || '');
        setShowEducationModal(true);
    };

    // Save education
    const saveEducation = async () => {
        if (!user) return;
        
        setIsSaving(true);
        const supabase = createClient();
        
        try {
            const { error } = await supabase
                .from('user_profile_extras')
                .upsert({
                    user_id: user.id,
                    college: editCollege || null,
                    high_school: editHighSchool || null,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
            
            if (error) {
                console.error('Error saving education:', error);
            } else {
                setProfileExtras(prev => ({
                    ...prev,
                    college: editCollege || undefined,
                    high_school: editHighSchool || undefined,
                }));
                setShowEducationModal(false);
            }
        } catch (error) {
            console.error('Error saving education:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Open work modal
    const openWorkModal = () => {
        setEditCompany(profileExtras.company || '');
        setEditJobDescription(profileExtras.job_description || '');
        setShowWorkModal(true);
    };

    // Save work
    const saveWork = async () => {
        if (!user) return;
        
        setIsSaving(true);
        const supabase = createClient();
        
        try {
            const { error } = await supabase
                .from('user_profile_extras')
                .upsert({
                    user_id: user.id,
                    company: editCompany || null,
                    job_description: editJobDescription || null,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
            
            if (error) {
                console.error('Error saving work:', error);
            } else {
                setProfileExtras(prev => ({
                    ...prev,
                    company: editCompany || undefined,
                    job_description: editJobDescription || undefined,
                }));
                setShowWorkModal(false);
            }
        } catch (error) {
            console.error('Error saving work:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Open working on modal
    const openWorkingOnModal = () => {
        setEditWorkingOn(profileExtras.working_on || '');
        setShowWorkingOnModal(true);
    };

    // Save working on
    const saveWorkingOn = async () => {
        if (!user) return;
        
        setIsSaving(true);
        const supabase = createClient();
        
        try {
            const { error } = await supabase
                .from('user_profile_extras')
                .upsert({
                    user_id: user.id,
                    working_on: editWorkingOn || null,
                    working_on_updated_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
            
            if (error) {
                console.error('Error saving your quote:', error);
            } else {
                setProfileExtras(prev => ({
                    ...prev,
                    working_on: editWorkingOn || undefined,
                    working_on_updated_at: new Date().toISOString(),
                }));
                setShowWorkingOnModal(false);
            }
        } catch (error) {
            console.error('Error saving your quote:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle interest click from the graph
    const handleInterestClick = useCallback(async (interest: string) => {
        setSelectedInterest(interest);
        setIsExplanationLoading(true);
        setInterestExplanation(null);
        
        // Find friends who share this interest from clusters
        const matchingCluster = interestClusters.find(c => 
            c.tag.toLowerCase() === interest.toLowerCase()
        );
        setFriendsWithSelectedInterest(matchingCluster?.friends || []);
        
        try {
            const supabase = createClient();
            
            // Find relevant tags for this interest
            const categoryData = hierarchicalInterests.find((h: any) => 
                h.category.toLowerCase() === interest.toLowerCase()
            );
            const tags = categoryData?.tags || [];
            
            const { data, error } = await supabase.functions.invoke('generate-interest-explanation', {
                body: { interest, tags }
            });
            
            if (error) throw error;
            if (data?.success) {
                setInterestExplanation(data.explanation);
            } else {
                throw new Error(data?.error || 'Failed to fetch explanation');
            }
        } catch (err: any) {
            setInterestExplanation('Unable to load insight for this interest.');
        } finally {
            setIsExplanationLoading(false);
        }
    }, [hierarchicalInterests, interestClusters]);
    
    // Handle graph loaded
    const handleGraphLoaded = useCallback(() => {
        setIsInterestGraphReady(true);
    }, []);
    
    // Handle avatar upload
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }
        const file = event.target.files[0];
        await uploadAvatar(file);
    };
    
    const uploadAvatar = async (file: File) => {
        setIsUploadingAvatar(true);
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
            setIsUploadingAvatar(false);
            return;
        }
        
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('profile-images')
                .upload(filePath, file, { upsert: true });
            
            if (uploadError) throw uploadError;
            
            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: filePath, updated_at: new Date().toISOString() })
                .eq('id', authUser.id);
            
            if (updateError) throw updateError;
            
            // Update local state
            if (profileData) {
                setProfileData({
                    ...profileData,
                    avatar_url: filePath
                });
                setAvatarLoadError(false); // Reset error state for new avatar
            }
            
            // Reload profile data to get updated avatar
            await loadProfileData();
            
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            alert(`Error uploading image: ${error.message}`);
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    // Load data on mount
    useEffect(() => {
        loadProfileData();
    }, [loadProfileData]);

    if (loading || isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loader}></div>
            </div>
        );
    }

    if (!user || !profileData) {
        return null;
    }

    const avatarUrl = getAvatarUrl(profileData.avatar_url);
    const displayName = profileData.full_name || 'User';
    const firstName = displayName.split(' ')[0];

    // Build network tags from database
    const networkTagsList = (profileExtras.networks || []).filter(Boolean);

    return (
        <div className={styles.wrapper}>
            <Menu />
            
            {/* Header Section */}
            <div className={styles.headerSection}>
                <div className={styles.headerContent}>
                    {/* Profile Image - Clickable to upload */}
                    <div 
                        className={styles.profileImageContainer}
                        onClick={handleAvatarClick}
                        style={{ cursor: 'pointer', position: 'relative' }}
                    >
                        {isUploadingAvatar && (
                            <div className={styles.uploadingOverlay}>
                                <div className={styles.uploadingSpinner}></div>
                            </div>
                        )}
                        {avatarUrl && !avatarLoadError ? (
                            <img 
                                src={avatarUrl} 
                                alt={displayName} 
                                className={`${styles.profileImageLarge} invert-media`}
                                onError={() => setAvatarLoadError(true)}
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className={styles.profileImagePlaceholder}>
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className={styles.avatarEditOverlay}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                    
                    {/* Header Info */}
                    <div className={styles.headerInfo}>
                        <div className={styles.nameRow}>
                            <h1 className={styles.profileName}>{displayName}</h1>
                        </div>
                        
                        {/* Network Handle */}
                        {profileExtras.network_handle && (
                            <div className={styles.networkHandleRow}>
                                <span className={styles.networkHandle}>
                                    @{profileExtras.network_handle.replace('.thenetwork', '')}
                                </span>
                            </div>
                        )}
                        
                        {/* Location */}
                        {profileData.location && (
                            <div className={styles.locationRow}>
                                <span className={styles.profileLocation}>{profileData.location}</span>
                            </div>
                        )}
                        
                        <div className={styles.networkTags}>
                            {networkTagsList.map((tag, i) => (
                                <React.Fragment key={tag}>
                                    <span className={styles.networkTag}>{tag}</span>
                                    {i < networkTagsList.length - 1 && (
                                        <span className={styles.networkTagSeparator}>,</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                        
                        {/* Tab Navigation */}
                        <div className={styles.tabNav}>
                            <button 
                                className={`${styles.tabButton} ${activeTab === 'about' ? styles.tabButtonActive : styles.tabButtonInactive}`}
                                onClick={() => setActiveTab('about')}
                            >
                                About
                            </button>
                            <button 
                                className={`${styles.tabButton} ${activeTab === 'network' ? styles.tabButtonActive : styles.tabButtonInactive}`}
                                onClick={() => setActiveTab('network')}
                            >
                                Network
                            </button>
                            <button 
                                className={`${styles.tabButton} ${activeTab === 'interests' ? styles.tabButtonActive : styles.tabButtonInactive}`}
                                onClick={() => setActiveTab('interests')}
                            >
                                Interests
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid - About Tab */}
            {activeTab === 'about' && (
            <div className={styles.mainContent}>
                {/* Left Column */}
                <div className={styles.leftColumn}>
                    {/* Network Score Card */}
                    <div className={styles.scoreCard}>
                        <h3 className={styles.scoreTitle}>Network Score</h3>
                        <div className={styles.scoreNumber}>{networkScore}</div>
                        <p className={styles.scoreBadge}>Prestige/Badge/Etc Nickname</p>
                        <p className={styles.scoreStats}>{connectionsCount} connections  {interestClusters.length} clusters</p>
                        {totalUsers !== null && (
                            <p className={styles.scoreStats} style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                                {totalUsers.toLocaleString()} total users on The Network
                            </p>
                        )}
                    </div>

                    {/* Your Quote Card */}
                    <div className={styles.updateCard}>
                        <div className={styles.updateHeader}>
                            <h3 className={styles.updateTitle}>Your Quote</h3>
                            <button 
                                className={styles.editButton}
                                onClick={openWorkingOnModal}
                                aria-label="Edit your quote"
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8.75 1.75L12.25 5.25M10.5 0.875C10.8452 0.52982 11.3048 0.333252 11.7812 0.333252C12.2577 0.333252 12.7173 0.52982 13.0625 0.875C13.4077 1.22018 13.6042 1.67982 13.6042 2.15625C13.6042 2.63268 13.4077 3.09232 13.0625 3.4375L3.5 13H0V9.5L9.5625 0C9.90768 -0.345178 10.3673 -0.541746 10.8438 -0.541746C11.3202 -0.541746 11.7798 -0.345178 12.125 0L10.5 0.875Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>
                        <p className={styles.updateText}>
                            {profileExtras.working_on || 'Building something that increases interactions between humans.'}
                        </p>
                        <p className={styles.updateDate}>
                            Updated {profileExtras.working_on_updated_at 
                                ? new Date(profileExtras.working_on_updated_at).toLocaleDateString('en-GB')
                                : new Date().toLocaleDateString('en-GB')}
                        </p>
                    </div>

                    {/* Network Visualization Card */}
                    <div className={styles.vizCard}>
                        <h3 className={styles.vizTitle}>Network Connections</h3>
                        {networkDistribution.length > 0 ? (
                            <div className={styles.radarChart}>
                                {(() => {
                                    const n = networkDistribution.length;
                                    const centerX = 140;
                                    const centerY = 110;
                                    const maxRadius = 50;
                                    const maxConnections = Math.max(...networkDistribution.map(d => d.myConnections), 1);
                                    
                                    // Calculate points for each network
                                    const getPoint = (index: number, value: number) => {
                                        const angle = (index * 2 * Math.PI / n) - Math.PI / 2;
                                        const radius = (value / maxConnections) * maxRadius;
                                        return {
                                            x: centerX + radius * Math.cos(angle),
                                            y: centerY + radius * Math.sin(angle)
                                        };
                                    };
                                    
                                    // Get outer label positions
                                    const getLabelPoint = (index: number) => {
                                        const angle = (index * 2 * Math.PI / n) - Math.PI / 2;
                                        const radius = maxRadius + 45;
                                        return {
                                            x: centerX + radius * Math.cos(angle),
                                            y: centerY + radius * Math.sin(angle)
                                        };
                                    };
                                    
                                    // Create background grid polygons
                                    const gridLevels = [0.33, 0.66, 1];
                                    const gridPolygons = gridLevels.map(level => {
                                        const points = Array.from({ length: n }, (_, i) => {
                                            const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
                                            const radius = level * maxRadius;
                                            return `${centerX + radius * Math.cos(angle)},${centerY + radius * Math.sin(angle)}`;
                                        }).join(' ');
                                        return points;
                                    });
                                    
                                    // Create data polygon
                                    const dataPoints = networkDistribution.map((d, i) => {
                                        const point = getPoint(i, d.myConnections);
                                        return `${point.x},${point.y}`;
                                    }).join(' ');
                                    
                                    return (
                                        <svg className={styles.radarSvg} viewBox="0 0 280 220" preserveAspectRatio="xMidYMid meet">
                                            {/* Grid lines from center */}
                                            {networkDistribution.map((_, i) => {
                                                const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
                                                const endX = centerX + maxRadius * Math.cos(angle);
                                                const endY = centerY + maxRadius * Math.sin(angle);
                                                return (
                                                    <line
                                                        key={`grid-line-${i}`}
                                                        x1={centerX}
                                                        y1={centerY}
                                                        x2={endX}
                                                        y2={endY}
                                                        stroke="rgba(255,255,255,0.1)"
                                                        strokeWidth="1"
                                                    />
                                                );
                                            })}
                                            
                                            {/* Background grid polygons */}
                                            {gridPolygons.map((points, i) => (
                                                <polygon
                                                    key={`grid-${i}`}
                                                    points={points}
                                                    fill="none"
                                                    stroke="rgba(255,255,255,0.15)"
                                                    strokeWidth="1"
                                                />
                                            ))}
                                            
                                            {/* Data polygon */}
                                            <polygon
                                                points={dataPoints}
                                                fill="rgba(103, 126, 234, 0.3)"
                                                stroke="rgba(103, 126, 234, 0.8)"
                                                strokeWidth="2"
                                            />
                                            
                                            {/* Data points with hover */}
                                            {networkDistribution.map((d, i) => {
                                                const point = getPoint(i, d.myConnections);
                                                const isHovered = hoveredNetwork === d.network;
                                                return (
                                                    <g key={`point-${i}`}>
                                                        <circle
                                                            cx={point.x}
                                                            cy={point.y}
                                                            r={isHovered ? 6 : 4}
                                                            fill={isHovered ? "#a8b4ff" : "rgba(103, 126, 234, 1)"}
                                                            stroke="#fff"
                                                            strokeWidth="2"
                                                            style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                                                            onMouseEnter={() => setHoveredNetwork(d.network)}
                                                            onMouseLeave={() => setHoveredNetwork(null)}
                                                        />
                                                    </g>
                                                );
                                            })}
                                            
                                            {/* Labels */}
                                            {networkDistribution.map((d, i) => {
                                                const labelPoint = getLabelPoint(i);
                                                const isHovered = hoveredNetwork === d.network;
                                                // Determine text anchor based on position
                                                let textAnchor: 'start' | 'middle' | 'end' = 'middle';
                                                if (labelPoint.x < centerX - 10) textAnchor = 'end';
                                                else if (labelPoint.x > centerX + 10) textAnchor = 'start';
                                                
                                                return (
                                                    <g 
                                                        key={`label-${i}`}
                                                        onMouseEnter={() => setHoveredNetwork(d.network)}
                                                        onMouseLeave={() => setHoveredNetwork(null)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        {/* Invisible hit area for better hover */}
                                                        <rect
                                                            x={textAnchor === 'end' ? labelPoint.x - 100 : textAnchor === 'start' ? labelPoint.x : labelPoint.x - 50}
                                                            y={labelPoint.y - 12}
                                                            width="100"
                                                            height={isHovered ? 32 : 18}
                                                            fill="transparent"
                                                        />
                                                        <text
                                                            x={labelPoint.x}
                                                            y={labelPoint.y}
                                                            textAnchor={textAnchor}
                                                            fontSize="11"
                                                            fontWeight="500"
                                                            fill={isHovered ? "#a8b4ff" : "rgba(255,255,255,0.75)"}
                                                            style={{ pointerEvents: 'none', transition: 'fill 0.2s' }}
                                                        >
                                                            {d.network}
                                                        </text>
                                                        {isHovered && (
                                                            <text
                                                                x={labelPoint.x}
                                                                y={labelPoint.y + 14}
                                                                textAnchor={textAnchor}
                                                                fontSize="10"
                                                                fill="#a8b4ff"
                                                                fontWeight="600"
                                                                style={{ pointerEvents: 'none' }}
                                                            >
                                                                {d.myConnections} ({d.percentage}%)
                                                            </text>
                                                        )}
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    );
                                })()}
                                
                            </div>
                        ) : (
                            <div className={styles.radarEmpty}>
                                <p>Add networks to see your connection distribution</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Center Column - About */}
                <div className={styles.centerColumn}>
                    <div className={styles.aboutCard}>
                        <h2 className={styles.aboutTitle}>About</h2>

                        {/* Basic Info */}
                        <div className={styles.infoSection}>
                            <div className={styles.infoSectionHeader}>
                                <svg className={styles.infoSectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M12 16v-4M12 8h.01"/>
                                </svg>
                                <h4 className={styles.infoSectionTitle}>Basic Info</h4>
                                <button className={styles.editButton} title="Edit Basic Info" onClick={openEditModal}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                </button>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Gender:</span>
                                <span className={styles.infoValue}>{profileExtras.gender || 'Not set'}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Age:</span>
                                <span className={styles.infoValue}>{profileExtras.age || 'Not set'}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Hometown:</span>
                                <span className={styles.infoValue}>{profileExtras.hometown || 'Not set'}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Looking for:</span>
                                <div className={styles.lookingForTags}>
                                    {(profileExtras.looking_for && profileExtras.looking_for.length > 0) ? (
                                        profileExtras.looking_for.map((item, i) => (
                                            <span key={i} className={styles.lookingForTag}>{item}</span>
                                        ))
                                    ) : (
                                        <span className={styles.infoValue}>Not set</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className={styles.infoSection}>
                            <div className={styles.infoSectionHeader}>
                                <svg className={styles.infoSectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                                <h4 className={styles.infoSectionTitle}>Contact</h4>
                                <button className={styles.editButton} title="Edit Contact Info" onClick={openContactModal}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                </button>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Email:</span>
                                {profileExtras.contact_email ? (
                                    <a href={`mailto:${profileExtras.contact_email}`} className={styles.infoValueLink}>
                                        {profileExtras.contact_email}
                                    </a>
                                ) : (
                                    <span className={styles.infoValue}>Not set</span>
                                )}
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Phone:</span>
                                {profileExtras.contact_phone ? (
                                    <a href={`tel:${profileExtras.contact_phone}`} className={styles.infoValueLink}>
                                        {profileExtras.contact_phone}
                                    </a>
                                ) : (
                                    <span className={styles.infoValue}>Not set</span>
                                )}
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>LinkedIn:</span>
                                {profileExtras.linkedin_url ? (
                                    <a href={profileExtras.linkedin_url.startsWith('http') ? profileExtras.linkedin_url : `https://${profileExtras.linkedin_url}`} target="_blank" rel="noopener noreferrer" className={styles.infoValueLink}>
                                        {profileExtras.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '')}
                                    </a>
                                ) : (
                                    <span className={styles.infoValue}>Not set</span>
                                )}
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Instagram:</span>
                                {profileExtras.instagram_url ? (
                                    <a href={profileExtras.instagram_url.startsWith('http') ? profileExtras.instagram_url : `https://instagram.com/${profileExtras.instagram_url.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className={styles.infoValueLink}>
                                        @{profileExtras.instagram_url.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace('@', '').replace(/\/$/, '')}
                                    </a>
                                ) : (
                                    <span className={styles.infoValue}>Not set</span>
                                )}
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>TheNetwork:</span>
                                {profileExtras.network_handle ? (
                                    <span className={styles.networkHandleValue}>
                                        @{profileExtras.network_handle.replace('@', '').replace('.thenetwork', '')}<span className={styles.handleSuffixDisplay}>.thenetwork</span>
                                    </span>
                                ) : (
                                    <span className={styles.infoValue}>Not set</span>
                                )}
                            </div>
                        </div>

                        {/* Networks */}
                        <div className={styles.infoSection}>
                            <div className={styles.infoSectionHeader}>
                                <svg className={styles.infoSectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="5" r="3"/>
                                    <circle cx="5" cy="19" r="3"/>
                                    <circle cx="19" cy="19" r="3"/>
                                    <path d="M12 8v4m-5 4l5-4 5 4"/>
                                </svg>
                                <h4 className={styles.infoSectionTitle}>Networks</h4>
                                <button className={styles.editButton} title="Edit Networks" onClick={openNetworksModal}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                </button>
                            </div>
                            <div className={styles.tagsList}>
                                {(profileExtras.networks && profileExtras.networks.length > 0) ? (
                                    profileExtras.networks.map((network, i) => (
                                        <span key={i} className={styles.tag}>{network}</span>
                                    ))
                                ) : (
                                    <span className={styles.infoValue}>Not set</span>
                                )}
                            </div>
                        </div>

                        {/* Interests */}
                        <div className={styles.infoSection}>
                            <div className={styles.infoSectionHeader}>
                                <h4 className={styles.infoSectionTitle}>Interests</h4>
                            </div>
                            <div className={styles.tagsList}>
                                {(profileData.interests || HARDCODED_PROFILE.personalInterests).map((interest, i) => (
                                    <span key={i} className={styles.tag}>{interest}</span>
                                ))}
                            </div>
                        </div>

                        {/* Education */}
                        <div className={styles.infoSection}>
                            <div className={styles.infoSectionHeader}>
                                <svg className={styles.infoSectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                                </svg>
                                <h4 className={styles.infoSectionTitle}>Education</h4>
                                <button className={styles.editButton} title="Edit Education" onClick={openEducationModal}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                </button>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>College:</span>
                                <span className={styles.infoValue}>{profileExtras.college || 'Not set'}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>High School:</span>
                                <span className={styles.infoValue}>{profileExtras.high_school || 'Not set'}</span>
                            </div>
                        </div>

                        {/* Work */}
                        <div className={styles.infoSection}>
                            <div className={styles.infoSectionHeader}>
                                <svg className={styles.infoSectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                                </svg>
                                <h4 className={styles.infoSectionTitle}>Work</h4>
                                <button className={styles.editButton} title="Edit Work" onClick={openWorkModal}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                </button>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Company:</span>
                                <span className={styles.infoValue}>{profileExtras.company || 'Not set'}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>What are you doing?:</span>
                                <span className={styles.infoValue}>{profileExtras.job_description || 'Not set'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Network Friends */}
                <div className={styles.rightColumn}>
                    {(profileExtras.networks || []).length === 0 ? (
                        <div className={styles.clusterCard}>
                            <h3 className={styles.clusterTitle}>No networks yet</h3>
                            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                                Add networks to see friends from your communities!
                            </p>
                            <button 
                                className={styles.seeAllButton}
                                onClick={openNetworksModal}
                                style={{ marginTop: 12 }}
                            >
                                Add Networks
                            </button>
                        </div>
                    ) : (
                        (profileExtras.networks || []).map((network, index) => {
                            const networkData = networkDistribution.find(nd => nd.network === network);
                            const friends = networkData?.friends || [];
                            return (
                                <div key={network || index} className={styles.clusterCard}>
                                    <h3 className={styles.clusterTitle}>
                                        Friends from<br />
                                        {network || `Network ${index + 1}`} <span className={styles.clusterCount}>({friends.length})</span>
                                    </h3>
                                    
                                    {friends.length > 0 ? (
                                        <>
                                            <div className={styles.clusterAvatars}>
                                                {friends.slice(0, 6).map((friend) => (
                                                    <div key={friend.id} className={styles.avatarWithName}>
                                                        {friend.avatar_url ? (
                                                            <img
                                                                src={getAvatarUrl(friend.avatar_url)}
                                                                alt={friend.name}
                                                                className={`${styles.clusterAvatar} invert-media`}
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        ) : (
                                                            <div className={styles.clusterAvatarPlaceholder}>
                                                                {friend.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <span className={styles.avatarName}>{friend.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {friends.length > 6 && (
                                                <button 
                                                    className={styles.seeAllButton}
                                                    onClick={() => setSelectedNetworkCluster(networkData || null)}
                                                >
                                                    See All
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <div className={styles.emptyNetworkCard}>
                                            <p>No connections yet</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            )}

            {/* Interests Tab Content */}
            {activeTab === 'interests' && (
                <div className={styles.interestsTabContent}>
                    {/* Left Sidebar - Same as About tab */}
                    <div className={styles.interestsLeftColumn}>
                        {/* Network Score Card */}
                        <div className={styles.scoreCard}>
                            <h3 className={styles.scoreTitle}>Network Score</h3>
                            <div className={styles.scoreNumber}>{networkScore}</div>
                            <p className={styles.scoreBadge}>Prestige/Badge/Etc Nickname</p>
                            <p className={styles.scoreStats}>{connectionsCount} connections  {interestClusters.length} clusters</p>
                            {totalUsers !== null && (
                                <p className={styles.scoreStats} style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                                    {totalUsers.toLocaleString()} total users on The Network
                                </p>
                            )}
                        </div>

                        {/* Your Quote Card */}
                        <div className={styles.updateCard}>
                            <div className={styles.updateHeader}>
                                <h3 className={styles.updateTitle}>Your Quote</h3>
                            </div>
                            <p className={styles.updateText}>
                                {profileExtras.working_on || 'Building something that increases interactions between humans.'}
                            </p>
                            <p className={styles.updateDate}>
                                Updated {profileExtras.working_on_updated_at 
                                    ? new Date(profileExtras.working_on_updated_at).toLocaleDateString('en-GB')
                                    : new Date().toLocaleDateString('en-GB')}
                            </p>
                        </div>

                        {/* Network Visualization Card */}
                        <div className={styles.vizCard}>
                            <h3 className={styles.vizTitle}>Network Connections</h3>
                            {networkDistribution.length > 0 ? (
                                <div className={styles.radarChart}>
                                    {(() => {
                                        const n = networkDistribution.length;
                                        const centerX = 140;
                                        const centerY = 110;
                                        const maxRadius = 50;
                                        const maxConnections = Math.max(...networkDistribution.map(d => d.myConnections), 1);
                                        
                                        // Calculate points for each network
                                        const getPoint = (index: number, value: number) => {
                                            const angle = (index * 2 * Math.PI / n) - Math.PI / 2;
                                            const radius = (value / maxConnections) * maxRadius;
                                            return {
                                                x: centerX + radius * Math.cos(angle),
                                                y: centerY + radius * Math.sin(angle)
                                            };
                                        };
                                        
                                        // Get outer label positions
                                        const getLabelPoint = (index: number) => {
                                            const angle = (index * 2 * Math.PI / n) - Math.PI / 2;
                                            const radius = maxRadius + 45;
                                            return {
                                                x: centerX + radius * Math.cos(angle),
                                                y: centerY + radius * Math.sin(angle)
                                            };
                                        };
                                        
                                        // Create background grid polygons
                                        const gridLevels = [0.33, 0.66, 1];
                                        const gridPolygons = gridLevels.map(level => {
                                            const points = Array.from({ length: n }, (_, i) => {
                                                const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
                                                const radius = level * maxRadius;
                                                return `${centerX + radius * Math.cos(angle)},${centerY + radius * Math.sin(angle)}`;
                                            }).join(' ');
                                            return points;
                                        });
                                        
                                        // Create data polygon
                                        const dataPoints = networkDistribution.map((d, i) => {
                                            const point = getPoint(i, d.myConnections);
                                            return `${point.x},${point.y}`;
                                        }).join(' ');
                                        
                                        return (
                                            <svg className={styles.radarSvg} viewBox="0 0 280 220" preserveAspectRatio="xMidYMid meet">
                                                {/* Grid lines from center */}
                                                {networkDistribution.map((_, i) => {
                                                    const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
                                                    const endX = centerX + maxRadius * Math.cos(angle);
                                                    const endY = centerY + maxRadius * Math.sin(angle);
                                                    return (
                                                        <line
                                                            key={`grid-line-${i}`}
                                                            x1={centerX}
                                                            y1={centerY}
                                                            x2={endX}
                                                            y2={endY}
                                                            stroke="rgba(255,255,255,0.1)"
                                                            strokeWidth="1"
                                                        />
                                                    );
                                                })}
                                                
                                                {/* Background grid polygons */}
                                                {gridPolygons.map((points, i) => (
                                                    <polygon
                                                        key={`grid-${i}`}
                                                        points={points}
                                                        fill="none"
                                                        stroke="rgba(255,255,255,0.15)"
                                                        strokeWidth="1"
                                                    />
                                                ))}
                                                
                                                {/* Data polygon */}
                                                <polygon
                                                    points={dataPoints}
                                                    fill="rgba(103, 126, 234, 0.3)"
                                                    stroke="rgba(103, 126, 234, 0.8)"
                                                    strokeWidth="2"
                                                />
                                                
                                                {/* Data points */}
                                                {networkDistribution.map((d, i) => {
                                                    const point = getPoint(i, d.myConnections);
                                                    return (
                                                        <circle
                                                            key={`point-${i}`}
                                                            cx={point.x}
                                                            cy={point.y}
                                                            r={4}
                                                            fill="rgba(103, 126, 234, 1)"
                                                            stroke="#fff"
                                                            strokeWidth="2"
                                                        />
                                                    );
                                                })}
                                                
                                                {/* Labels */}
                                                {networkDistribution.map((d, i) => {
                                                    const labelPoint = getLabelPoint(i);
                                                    let textAnchor: 'start' | 'middle' | 'end' = 'middle';
                                                    if (labelPoint.x < centerX - 10) textAnchor = 'end';
                                                    else if (labelPoint.x > centerX + 10) textAnchor = 'start';
                                                    
                                                    return (
                                                        <text
                                                            key={`label-${i}`}
                                                            x={labelPoint.x}
                                                            y={labelPoint.y}
                                                            textAnchor={textAnchor}
                                                            fontSize="11"
                                                            fontWeight="500"
                                                            fill="rgba(255,255,255,0.75)"
                                                        >
                                                            {d.network}
                                                        </text>
                                                    );
                                                })}
                                            </svg>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className={styles.radarEmpty}>
                                    <p>Add networks to see your connection distribution</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Center - Interest Graph */}
                    <div className={styles.interestsGraphContainer}>
                        {!isInterestGraphReady && interests.length > 0 && (
                            <div className={styles.graphLoadingOverlay}>
                                <div className={styles.loader}></div>
                            </div>
                        )}
                        {interests.length > 0 ? (
                            <InterestGraph
                                interests={interests}
                                userFullName={profileData?.full_name || 'Me'}
                                onInterestClick={handleInterestClick}
                                onGraphLoaded={handleGraphLoaded}
                            />
                        ) : (
                            <div className={styles.noInterestsMessage}>
                                <p>No interests found yet. Complete your profile to see your interest map.</p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Interest Details */}
                    <div className={styles.interestsRightPanel}>
                        {selectedInterest ? (
                            <>
                                {/* Interest Explanation Card */}
                                <div className={styles.interestDetailCard}>
                                    <button 
                                        className={styles.interestDetailClose}
                                        onClick={() => setSelectedInterest(null)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 6L6 18M6 6l12 12"/>
                                        </svg>
                                    </button>
                                    <h3 className={styles.interestDetailTitle}>{selectedInterest}</h3>
                                    <div className={styles.interestDetailContent}>
                                        {isExplanationLoading ? (
                                            <div className={styles.explanationLoading}>
                                                <div className={styles.loaderSmall}></div>
                                                <p>Analyzing your interest...</p>
                                            </div>
                                        ) : (
                                            <p className={styles.interestDetailText}>{interestExplanation}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Friends with this interest */}
                                {friendsWithSelectedInterest.length > 0 && (
                                    <div className={styles.friendsInterestCard}>
                                        <h4 className={styles.friendsInterestTitle}>
                                            Friends interested in {selectedInterest}
                                        </h4>
                                        <div className={styles.friendsHorizontalScroll}>
                                            {friendsWithSelectedInterest.map((friend) => (
                                                <div key={friend.id} className={styles.friendScrollItem}>
                                                    {friend.avatar_url ? (
                                                        <img
                                                            src={getAvatarUrl(friend.avatar_url)}
                                                            alt={friend.name}
                                                            className={`${styles.friendScrollAvatar} invert-media`}
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    ) : (
                                                        <div className={styles.friendScrollAvatarPlaceholder}>
                                                            {friend.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className={styles.friendScrollName}>{friend.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className={styles.selectInterestPrompt}>
                                <h4>Select an Interest</h4>
                                <p>Click on any interest in the map to see details and friends who share it.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cluster Friends Modal */}
            {selectedCluster && (
                <div className={styles.modalOverlay} onClick={() => setSelectedCluster(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Friends interested in {selectedCluster.tag}</h3>
                            <button 
                                className={styles.modalCloseButton}
                                onClick={() => setSelectedCluster(null)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.friendsList}>
                                {selectedCluster.friends.map((friend) => (
                                    <div key={friend.id} className={styles.friendItem}>
                                        {friend.avatar_url ? (
                                            <img
                                                src={getAvatarUrl(friend.avatar_url)}
                                                alt={friend.name}
                                                className={`${styles.friendAvatar} invert-media`}
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <div className={styles.clusterAvatarPlaceholder}>
                                                {friend.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className={styles.friendInfo}>
                                            <p className={styles.friendName}>{friend.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Network Friends Modal */}
            {selectedNetworkCluster && (
                <div className={styles.modalOverlay} onClick={() => setSelectedNetworkCluster(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Friends from {selectedNetworkCluster.network}</h3>
                            <button 
                                className={styles.modalCloseButton}
                                onClick={() => setSelectedNetworkCluster(null)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.friendsList}>
                                {selectedNetworkCluster.friends.map((friend) => (
                                    <div key={friend.id} className={styles.friendItem}>
                                        {friend.avatar_url ? (
                                            <img
                                                src={getAvatarUrl(friend.avatar_url)}
                                                alt={friend.name}
                                                className={`${styles.friendAvatar} invert-media`}
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <div className={styles.clusterAvatarPlaceholder}>
                                                {friend.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className={styles.friendInfo}>
                                            <p className={styles.friendName}>{friend.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Basic Info Modal */}
            {showEditModal && (
                <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
                    <div className={styles.editModalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Edit Basic Info</h3>
                            <button 
                                className={styles.modalCloseButton}
                                onClick={() => setShowEditModal(false)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <div className={styles.editModalBody}>
                            {/* Gender */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Gender</label>
                                <select 
                                    className={styles.formSelect}
                                    value={editGender}
                                    onChange={(e) => setEditGender(e.target.value)}
                                >
                                    <option value="">Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Non-binary">Non-binary</option>
                                    <option value="Other">Other</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                            </div>

                            {/* Age */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Age</label>
                                <input 
                                    type="number"
                                    className={styles.formInput}
                                    value={editAge}
                                    onChange={(e) => setEditAge(e.target.value)}
                                    placeholder="Enter your age"
                                    min="13"
                                    max="120"
                                />
                            </div>

                            {/* Hometown */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Hometown</label>
                                <input 
                                    type="text"
                                    className={styles.formInput}
                                    value={editHometown}
                                    onChange={(e) => setEditHometown(e.target.value)}
                                    placeholder="City, State"
                                />
                            </div>

                            {/* Looking For */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Looking for (select up to 3)</label>
                                <div className={styles.lookingForGrid}>
                                    {LOOKING_FOR_OPTIONS.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            className={`${styles.lookingForOption} ${editLookingFor.includes(option) ? styles.lookingForOptionSelected : ''}`}
                                            onClick={() => toggleLookingFor(option)}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                                <p className={styles.formHint}>{editLookingFor.length}/3 selected</p>
                            </div>

                            {/* Save Button */}
                            <button 
                                className={styles.saveButton}
                                onClick={saveBasicInfo}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Contact Info Modal */}
            {showContactModal && (
                <div className={styles.modalOverlay} onClick={() => setShowContactModal(false)}>
                    <div className={styles.editModalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Edit Contact Info</h3>
                            <button 
                                className={styles.modalCloseButton}
                                onClick={() => setShowContactModal(false)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <div className={styles.editModalBody}>
                            {/* Email */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Email</label>
                                <input 
                                    type="email"
                                    className={styles.formInput}
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    placeholder="your@email.com"
                                />
                            </div>

                            {/* Phone */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Phone Number</label>
                                <input 
                                    type="tel"
                                    className={styles.formInput}
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>

                            {/* LinkedIn */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>LinkedIn</label>
                                <input 
                                    type="text"
                                    className={styles.formInput}
                                    value={editLinkedIn}
                                    onChange={(e) => setEditLinkedIn(e.target.value)}
                                    placeholder="linkedin.com/in/yourprofile"
                                />
                            </div>

                            {/* Instagram */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Instagram</label>
                                <input 
                                    type="text"
                                    className={styles.formInput}
                                    value={editInstagram}
                                    onChange={(e) => setEditInstagram(e.target.value)}
                                    placeholder="@yourusername"
                                />
                            </div>

                            {/* Network Handle */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>TheNetwork Handle</label>
                                <div className={styles.handleInputWrapper}>
                                    <span className={styles.handlePrefix}>@</span>
                                    <input 
                                        type="text"
                                        className={styles.handleInput}
                                        value={editNetworkHandle.replace('@', '').replace('.thenetwork', '')}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
                                            setEditNetworkHandle(value);
                                        }}
                                        placeholder="yourhandle"
                                    />
                                    <span className={styles.handleSuffix}>.thenetwork</span>
                                </div>
                            </div>

                            {/* Save Button */}
                            <button 
                                className={styles.saveButton}
                                onClick={saveContactInfo}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Networks Modal */}
            {showNetworksModal && (
                <div className={styles.modalOverlay} onClick={() => setShowNetworksModal(false)}>
                    <div className={styles.editModalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Edit Networks</h3>
                            <button 
                                className={styles.modalCloseButton}
                                onClick={() => setShowNetworksModal(false)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <div className={styles.editModalBody}>
                            <p className={styles.formHint} style={{ marginBottom: 16 }}>
                                Add up to 4 networks (schools, companies, communities, locations)
                            </p>
                            
                            {[0, 1, 2, 3].map((index) => (
                                <div key={index} className={styles.formGroup}>
                                    <label className={styles.formLabel}>Network {index + 1}</label>
                                    <input 
                                        type="text"
                                        className={styles.formInput}
                                        value={editNetworks[index]}
                                        onChange={(e) => updateNetwork(index, e.target.value)}
                                        placeholder={index === 0 ? "e.g. Harvard University" : index === 1 ? "e.g. Google" : index === 2 ? "e.g. Silicon Valley" : "e.g. New York, NY"}
                                    />
                                </div>
                            ))}

                            {/* Save Button */}
                            <button 
                                className={styles.saveButton}
                                onClick={saveNetworks}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Education Modal */}
            {showEducationModal && (
                <div className={styles.modalOverlay} onClick={() => setShowEducationModal(false)}>
                    <div className={styles.editModalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Edit Education</h3>
                            <button 
                                className={styles.modalCloseButton}
                                onClick={() => setShowEducationModal(false)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <div className={styles.editModalBody}>
                            {/* College */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>College</label>
                                <input 
                                    type="text"
                                    className={styles.formInput}
                                    value={editCollege}
                                    onChange={(e) => setEditCollege(e.target.value)}
                                    placeholder="e.g. Harvard University"
                                />
                            </div>

                            {/* High School */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>High School</label>
                                <input 
                                    type="text"
                                    className={styles.formInput}
                                    value={editHighSchool}
                                    onChange={(e) => setEditHighSchool(e.target.value)}
                                    placeholder="e.g. Phillips Exeter Academy '02"
                                />
                            </div>

                            {/* Save Button */}
                            <button 
                                className={styles.saveButton}
                                onClick={saveEducation}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Work Modal */}
            {showWorkModal && (
                <div className={styles.modalOverlay} onClick={() => setShowWorkModal(false)}>
                    <div className={styles.editModalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Edit Work</h3>
                            <button 
                                className={styles.modalCloseButton}
                                onClick={() => setShowWorkModal(false)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <div className={styles.editModalBody}>
                            {/* Company */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Company</label>
                                <input 
                                    type="text"
                                    className={styles.formInput}
                                    value={editCompany}
                                    onChange={(e) => setEditCompany(e.target.value)}
                                    placeholder="e.g. Facebook"
                                />
                            </div>

                            {/* Job Description */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>What are you doing?</label>
                                <input 
                                    type="text"
                                    className={styles.formInput}
                                    value={editJobDescription}
                                    onChange={(e) => setEditJobDescription(e.target.value)}
                                    placeholder="e.g. I like making things."
                                />
                            </div>

                            {/* Save Button */}
                            <button 
                                className={styles.saveButton}
                                onClick={saveWork}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Your Quote Modal */}
            {showWorkingOnModal && (
                <div className={styles.modalOverlay} onClick={() => setShowWorkingOnModal(false)}>
                    <div className={styles.editModalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Edit Your Quote</h3>
                            <button 
                                className={styles.modalCloseButton}
                                onClick={() => setShowWorkingOnModal(false)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <div className={styles.editModalBody}>
                            {/* Working On */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>What are you working on?</label>
                                <textarea 
                                    className={styles.formInput}
                                    value={editWorkingOn}
                                    onChange={(e) => setEditWorkingOn(e.target.value)}
                                    placeholder="e.g. Building something that increases interactions between humans."
                                    rows={4}
                                    style={{ resize: 'vertical', minHeight: '80px' }}
                                />
                                <p className={styles.formHint}>Share what you're currently working on or building</p>
                            </div>

                            {/* Save Button */}
                            <button 
                                className={styles.saveButton}
                                onClick={saveWorkingOn}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
