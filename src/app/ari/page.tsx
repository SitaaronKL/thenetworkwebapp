'use client';

import React, { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import styles from './page.module.css';
import { createClient } from '@/utils/supabase/client';

const CORRECT_PASSWORD = 'ayen1234@';
const AUTH_STORAGE_KEY = 'ari_chat_auth';

interface Candidate {
  user_id: string;
  name: string;
  score: number;
  reason: string;
  avatar_url?: string;
  evidence?: {
    match_type: string;
    disclaimer?: string;
    location?: string;
  };
}

interface Message {
  id: string;
  content: string;
  isFromUser: boolean;
  timestamp: Date;
  people?: Candidate[];
}

interface Thread {
  id: string;
  title: string;
  last_message?: string;
  last_message_at: string;
}

export default function AriChatPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Chat/Thread state
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingThreads, setIsFetchingThreads] = useState(false);
  const [error, setError] = useState('');
  const [chatMode, setChatMode] = useState<'network' | 'suggestions'>('suggestions');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  // Check for existing auth on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);

    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUserId();
  }, []);

  // Fetch threads when authenticated
  const fetchThreads = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsFetchingThreads(true);
    try {
      const { data, error } = await supabase
        .from('ari_threads')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setThreads(data || []);
    } catch (err: any) {
      console.error('Error fetching threads:', err);
    } finally {
      setIsFetchingThreads(false);
    }
  }, [isAuthenticated, supabase]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Fetch messages for active thread
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeThreadId) {
        setMessages([]);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('ari_conversations')
          .select('id, message, is_from_user, created_at, metadata')
          .eq('thread_id', activeThreadId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setMessages(data.map(m => ({
          id: m.id,
          content: m.message,
          isFromUser: m.is_from_user,
          timestamp: new Date(m.created_at),
          people: m.metadata?.people
        })));
      } catch (err: any) {
        setError('failed to load history');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessages();
  }, [activeThreadId, supabase]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input after loading completes
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      inputRef.current?.focus();
    }
  }, [isLoading, isAuthenticated]);

  // Handle password submission
  const handlePasswordSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      setAuthError('');
      // Welcome message only if no active thread
      if (!activeThreadId) {
        setMessages([{
          id: 'welcome',
          content: "look who finally decided to show up! what's on your mind today?",
          isFromUser: false,
          timestamp: new Date()
        }]);
      }
    } else {
      setAuthError('wrong password... try again');
    }
  }, [password, activeThreadId]);

  // Handle logout
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setMessages([]);
    setThreads([]);
    setActiveThreadId(null);
    setPassword('');
  }, []);

  // Send message to Ari
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;


    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: content.trim(),
      isFromUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError('');

    try {
      // Build conversation history for context (limit to last 10 for tokens)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.isFromUser ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch('/api/ari-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: content.trim(),
          conversation_history: conversationHistory,
          thread_id: activeThreadId,
          mode: chatMode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'something went wrong');
      }

      // If new thread was created, update ID and refresh thread list
      if (!activeThreadId && data.thread_id) {
        setActiveThreadId(data.thread_id);
        fetchThreads();
      }

      const ariMessage: Message = {
        id: `ari-${Date.now()}`,
        content: data.response,
        isFromUser: false,
        timestamp: new Date(),
        people: data.people
      };

      setMessages(prev => [...prev, ariMessage]);
      fetchThreads(); // Update thread previews
    } catch (err: any) {
      setError(err.message || 'oops something broke... try again?');
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, activeThreadId, fetchThreads]);

  // Start a new chat
  const startNewChat = useCallback(() => {
    setActiveThreadId(null);
    setMessages([{
      id: 'welcome',
      content: "starting fresh. what's the newest dream?",
      isFromUser: false,
      timestamp: new Date()
    }]);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  }, [inputValue, sendMessage]);

  // Handle Enter key (shift+enter for new line)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  }, [inputValue, sendMessage]);

  // Loading state
  if (isCheckingAuth) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingScreen}>
          <div className={styles.loadingDots}>
            <span>.</span><span>.</span><span>.</span>
          </div>
        </div>
      </div>
    );
  }

  // Password gate
  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.authScreen}>
          <div className={styles.authCard}>
            <h1 className={styles.authTitle}>ari</h1>
            <p className={styles.authSubtitle}>password required</p>
            <form onSubmit={handlePasswordSubmit} className={styles.authForm}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="enter password..."
                className={styles.authInput}
                autoFocus
              />
              <button type="submit" className={styles.authButton}>
                enter
              </button>
            </form>
            {authError && <p className={styles.authError}>{authError}</p>}
          </div>
        </div>
      </div>
    );
  }

  const handleClearMemories = async () => {
    if (!confirm('This will wipe Ari\'s long-term memory of you (including the NYC cafe stuff). Sure?')) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      await supabase.functions.invoke('clear-memories', {
        body: { userId: user.id }
      });

      alert('Memories cleared! Starting fresh.');
      window.location.reload();
    } catch (e) {
      alert('Failed to clear memories');
      console.error(e);
      setIsLoading(false);
    }
  };

  // Chat interface
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.ariAvatar}>A</div>
          <div className={styles.headerInfo}>
            <h1 className={styles.ariName}>ari</h1>
            <span className={styles.ariStatus}>online</span>
          </div>
        </div>

        <div className={styles.tabsContainer}>
          <button
            className={`${styles.tabButton} ${chatMode === 'suggestions' ? styles.activeTab : ''}`}
            onClick={() => setChatMode('suggestions')}
          >
            suggestions
          </button>
          <button
            className={`${styles.tabButton} ${chatMode === 'network' ? styles.activeTab : ''}`}
            onClick={() => setChatMode('network')}
          >
            my network
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={handleClearMemories} className={styles.logoutButton} style={{ opacity: 0.6, fontSize: '0.8rem', padding: '6px 12px' }}>
            reset memories
          </button>
          <button onClick={handleLogout} className={styles.logoutButton}>
            logout
          </button>
        </div>
      </header>

      <div className={styles.mainLayout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <button className={styles.newChatButton} onClick={startNewChat}>
            <PlusIcon /> new chat
          </button>
          <div className={styles.threadList}>
            {isFetchingThreads && <div className={styles.modelInfo}>loading chats...</div>}
            {threads.map(thread => (
              <button
                key={thread.id}
                className={`${styles.threadItem} ${activeThreadId === thread.id ? styles.activeThread : ''}`}
                onClick={() => setActiveThreadId(thread.id)}
              >
                {thread.title || 'Untitled Chat'}
              </button>
            ))}
          </div>
        </aside>

        {/* Chat Main Area */}
        <main className={styles.chatMain}>
          <div className={styles.messagesContainer}>
            <div className={styles.messagesList}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${msg.isFromUser ? styles.userMessage : styles.ariMessage}`}
                >
                  {!msg.isFromUser && (
                    <span className={styles.messageSender}>ari</span>
                  )}
                  <div className={styles.messageBubble}>
                    {msg.content}
                  </div>

                  {msg.people && msg.people.length > 0 && (
                    <div className={styles.candidatesList}>
                      {msg.people.map((person) => (
                        <div key={person.user_id} className={styles.candidateCard}>
                          <div className={styles.candidateHeader}>
                            <div
                              className={styles.candidateAvatar}
                              style={{
                                backgroundImage: person.avatar_url ? `url(${person.avatar_url})` : 'none',
                                backgroundColor: person.avatar_url ? 'transparent' : '#333'
                              }}
                            >
                              {!person.avatar_url && person.name.charAt(0)}
                            </div>
                            <div className={styles.candidateInfo}>
                              <h4 className={styles.candidateName}>{person.name}</h4>
                              {person.evidence?.location && (
                                <span className={styles.candidateLocation}>{person.evidence.location}</span>
                              )}
                            </div>
                          </div>
                          <p className={styles.candidateReason}>{person.reason}</p>
                          {person.evidence?.disclaimer && (
                            <span className={styles.candidateDisclaimer}>{person.evidence.disclaimer}</span>
                          )}
                          <button className={styles.connectButton}>connect</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <span className={styles.messageTime}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className={`${styles.message} ${styles.ariMessage}`}>
                  <span className={styles.messageSender}>ari</span>
                  <div className={styles.messageBubble}>
                    <span className={styles.typingIndicator}>
                      <span></span><span></span><span></span>
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className={styles.errorBanner}>
              {error}
              <button onClick={() => setError('')} className={styles.errorDismiss}>×</button>
            </div>
          )}

          {/* Input area */}
          <footer className={styles.inputArea}>
            <form onSubmit={handleSubmit} className={styles.inputForm}>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="type something..."
                className={styles.input}
                rows={1}
                disabled={isLoading}
              />
              <button
                type="submit"
                className={styles.sendButton}
                disabled={!inputValue.trim() || isLoading}
              >
                <SendIcon />
              </button>
            </form>
            <p className={styles.modelInfo}>powered by gpt-5</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
