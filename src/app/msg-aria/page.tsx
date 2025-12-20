'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/Menu';
import { useAuth } from '@/contexts/AuthContext';
import { AriaService } from '@/services/aria';
import { AriaMessage, RecommendationCandidate } from '@/types/aria';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase';
import CandidateDetailModal from './CandidateDetailModal';

export default function MsgAriaPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [messages, setMessages] = useState<AriaMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
    const isSending = useRef(false);

    // Accumulated candidates from all messages
    const [allCandidates, setAllCandidates] = useState<RecommendationCandidate[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<RecommendationCandidate | null>(null);

    // Limit to top 3 candidates
    const displayCandidates = allCandidates.slice(0, 3);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Update candidates list whenever messages change
    useEffect(() => {
        const candidatesMap = new Map<string, RecommendationCandidate>();
        messages.forEach(msg => {
            if (msg.candidates) {
                msg.candidates.forEach(c => {
                    if (!candidatesMap.has(c.id)) {
                        candidatesMap.set(c.id, c);
                    }
                });
            }
        });
        setAllCandidates(Array.from(candidatesMap.values()));
    }, [messages]);

    // Auth redirect
    useEffect(() => {
        if (!loading && !user) {
            router.push('/landing');
        }
    }, [user, loading, router]);

    // Load Pending Requests
    useEffect(() => {
        if (!user) return;
        const fetchPendingRequests = async () => {
            const supabase = createClient();
            try {
                const { data: reqs } = await supabase
                    .from('friend_requests')
                    .select('receiver_id')
                    .eq('sender_id', user.id)
                    .eq('status', 'pending');

                if (reqs) {
                    setPendingRequests(new Set(reqs.map(r => r.receiver_id)));
                }
            } catch (e) {
                console.error("Error fetching pending requests:", e);
            }
        };
        fetchPendingRequests();
    }, [user]);

    // Load History
    useEffect(() => {
        if (!user) return;
        const loadHistory = async () => {
            const history = await AriaService.getHistory(user.id);
            const uniqueHistory = history.reduce((acc: any[], current: any) => {
                const isDuplicate = acc.find(item =>
                    (item.id && item.id === current.id) ||
                    (item.message === current.message &&
                        item.is_from_user === current.is_from_user &&
                        Math.abs(new Date(item.created_at).getTime() - new Date(current.created_at).getTime()) < 2000)
                );
                if (!isDuplicate) {
                    acc.push(current);
                }
                return acc;
            }, []);

            setMessages(uniqueHistory.map((msg: any) => ({
                id: msg.id,
                content: msg.message,
                isFromUser: msg.is_from_user,
                createdAt: msg.created_at,
                candidates: msg.candidates
            })));
        };
        loadHistory();
    }, [user]);

    const handleInvite = async (candidateId: string) => {
        if (!user) return;
        try {
            if (pendingRequests.has(candidateId)) return;
            const supabase = createClient();
            const { error } = await supabase
                .from('friend_requests')
                .insert({
                    sender_id: user.id,
                    receiver_id: candidateId,
                    status: 'pending'
                });

            if (!error) {
                setPendingRequests(prev => new Set(prev).add(candidateId));
            } else {
                console.error("Error sending invite:", error);
            }
        } catch (e) {
            console.error("Error sending invite:", e);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || !user || isTyping || isSending.current) return;

        const userMsgContent = input.trim();
        // Simple dedupe
        if (messages.length > 0 && messages[messages.length - 1].content === userMsgContent && messages[messages.length - 1].isFromUser) {
            return;
        }

        setInput('');
        setIsTyping(true);
        isSending.current = true;

        const newUserMsg: AriaMessage = {
            content: userMsgContent,
            isFromUser: true,
            createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, newUserMsg]);

        try {
            const apiHistory = messages.slice(-10).map(m => ({
                role: m.isFromUser ? 'user' : 'assistant',
                content: m.content
            }));

            // Inject system instruction for concise reasons matching the design
            const systemInstruction = `\n\n[System: For any candidate recommendations, please keep the reasoning extremely brief (max 6 words). Start with "Also..." or "Similar..." e.g., "Also interested in UI Design". Please try to recommend 3 candidates if possible.]`;

            const result = await AriaService.sendMessage(userMsgContent + systemInstruction, apiHistory);

            if (result && (result.response || (result.candidates && result.candidates.length > 0))) {
                const ariaMsg: AriaMessage = {
                    content: result.response || '',
                    isFromUser: false,
                    createdAt: new Date().toISOString(),
                    candidates: result.candidates
                };
                setMessages(prev => [...prev, ariaMsg]);
            } else {
                const errorMsg: AriaMessage = {
                    content: "Sorry, I'm having trouble connecting to the network.",
                    isFromUser: false,
                    createdAt: new Date().toISOString()
                };
                setMessages(prev => [...prev, errorMsg]);
            }
        } catch (err) {
            console.error("Error in chat flow:", err);
        } finally {
            setIsTyping(false);
            isSending.current = false;
        }
    };

    if (loading) return null;

    return (
        <div className={styles.container}>
            <Menu />

            <div className={styles.layoutGrid}>
                <div className={styles.leftColumn}>
                    {/* Top: People you should meet */}
                    <div className={`${styles.glassPanel} ${styles.peoplePanel}`}>
                        <h2 className={styles.columnTitle}>People you should meet</h2>
                        <div className={`${styles.panelContent} ${styles.peopleList}`}>
                            {displayCandidates.map((candidate, idx) => {
                                const isPending = pendingRequests.has(candidate.id) || candidate.isPending;
                                const isConnected = candidate.isConnected;

                                return (
                                    <div
                                        key={candidate.id || idx}
                                        className={styles.personCard}
                                        onClick={() => setSelectedCandidate(candidate)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <img
                                            className={styles.personAvatar}
                                            src={candidate.avatarUrl || '/assets/onboarding/tn_logo_black.png'}
                                            alt={candidate.name}
                                            onError={(e) => {
                                                const target = e.currentTarget;
                                                const fallback = '/assets/onboarding/tn_logo_black.png';
                                                if (target.src.includes(fallback)) return;
                                                target.src = fallback;
                                            }}
                                        />
                                        <div className={styles.personInfo}>
                                            <div className={styles.personName}>
                                                {candidate.name || 'Unknown User'}
                                            </div>
                                            <div className={styles.personReason}>{candidate.matchReason || candidate.headline || 'Recommended'}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {displayCandidates.length === 0 && (
                                <div style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>
                                    No candidates found yet. Ask Aria to introduce you to someone!
                                </div>
                            )}
                        </div>
                    </div>


                </div>


            </div>

            {selectedCandidate && (
                <CandidateDetailModal
                    candidate={selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                    onInvite={handleInvite}
                    isPending={pendingRequests.has(selectedCandidate.id) || !!selectedCandidate.isPending}
                    isConnected={!!selectedCandidate.isConnected}
                />
            )}
        </div>
    );
}
