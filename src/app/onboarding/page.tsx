'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import { YouTubeService } from '@/services/youtube';
import styles from './page.module.css';

type Step = 'age' | 'email' | 'email-verify' | 'phone' | 'phone-verify' | 'networks' | 'processing';

interface Network {
    id: string;
    type: 'work' | 'highschool' | 'city' | 'university';
    name: string;
}

// Helper to extract university name from .edu email
const extractUniversityName = (email: string): string | null => {
    if (!email || !email.includes('@')) return null;
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain?.endsWith('.edu')) return null;
    
    // Common university domain mappings
    const universityMap: Record<string, string> = {
        'rutgers.edu': 'Rutgers University',
        'my.rutgers.edu': 'Rutgers University',
        'scarletmail.rutgers.edu': 'Rutgers University',
        'columbia.edu': 'Columbia University',
        'stanford.edu': 'Stanford University',
        'mit.edu': 'MIT',
        'harvard.edu': 'Harvard University',
        'yale.edu': 'Yale University',
        'princeton.edu': 'Princeton University',
        'berkeley.edu': 'UC Berkeley',
        'ucla.edu': 'UCLA',
        'nyu.edu': 'NYU',
        'upenn.edu': 'UPenn',
        'cornell.edu': 'Cornell University',
        'brown.edu': 'Brown University',
        'dartmouth.edu': 'Dartmouth College',
        'duke.edu': 'Duke University',
        'uchicago.edu': 'University of Chicago',
        'northwestern.edu': 'Northwestern University',
        'cmu.edu': 'Carnegie Mellon University',
        'gatech.edu': 'Georgia Tech',
        'umich.edu': 'University of Michigan',
        'utexas.edu': 'UT Austin',
        'usc.edu': 'USC',
    };
    
    if (universityMap[domain]) {
        return universityMap[domain];
    }
    
    // Fallback: capitalize the domain name without .edu
    const baseDomain = domain.replace('.edu', '').split('.').pop() || '';
    return baseDomain.charAt(0).toUpperCase() + baseDomain.slice(1) + ' University';
};

export default function OnboardingPage() {
    const { user, session, loading } = useAuth();
    const router = useRouter();
    const hasStartedProcessing = useRef(false);
    
    const [step, setStep] = useState<Step>('age');
    const [error, setError] = useState('');
    
    // Form data
    const [age, setAge] = useState(20);
    const [eduEmail, setEduEmail] = useState('');
    const [eduEmailCode, setEduEmailCode] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneCode, setPhoneCode] = useState('');
    const [networks, setNetworks] = useState<Network[]>([]);
    const [newNetworkType, setNewNetworkType] = useState<'work' | 'highschool' | 'city'>('work');
    const [newNetworkName, setNewNetworkName] = useState('');
    
    // Processing state
    const [processingProgress, setProcessingProgress] = useState(0);
    const [processingStatus, setProcessingStatus] = useState('Analyzing your interests...');

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Start backend processing immediately when page loads
    useEffect(() => {
        if (!user || !session || hasStartedProcessing.current) return;
        hasStartedProcessing.current = true;
        
        const startBackendProcessing = async () => {
            const supabase = createClient();
            
            try {
                // Check if user already has interests (skip if so)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('interests')
                    .eq('id', user.id)
                    .single();

                const existingInterests = (profile?.interests as string[]) || [];
                if (existingInterests.length > 0) return;

                // Check if YouTube data exists, if not sync it
                const { data: ytSubs } = await supabase
                    .from('youtube_subscriptions')
                    .select('user_id')
                    .eq('user_id', user.id)
                    .limit(1);

                const { data: ytLikes } = await supabase
                    .from('youtube_liked_videos')
                    .select('user_id')
                    .eq('user_id', user.id)
                    .limit(1);

                const hasYouTubeData = (ytSubs?.length ?? 0) > 0 || (ytLikes?.length ?? 0) > 0;

                if (!hasYouTubeData) {
                    // Try to sync YouTube data
                    try {
                        const accessToken = await YouTubeService.getAccessToken();
                        if (accessToken) {
                            await YouTubeService.syncYouTubeData(user.id);
                        }
                    } catch (e) {
                        // Continue anyway
                    }
                }

                // Trigger interest derivation in background
                try {
                    YouTubeService.deriveInterests(user.id);
                } catch (e) {
                    // Continue anyway
                }

                // Trigger DNA v2 computation in background
                try {
                    fetch('/api/compute-dna-v2', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: user.id,
                            trigger_source: 'NEW_USER_SIGNUP'
                        })
                    });
                } catch (e) {
                    // Continue anyway
                }
            } catch (e) {
                // Silently fail - wrapped page will handle retries
            }
        };

        startBackendProcessing();
    }, [user, session]);

    // Auto-add university from edu email when entering networks step
    useEffect(() => {
        if (step === 'networks' && eduEmail) {
            const universityName = extractUniversityName(eduEmail);
            if (universityName) {
                // Check if university not already added
                const alreadyExists = networks.some(
                    n => n.type === 'university' && n.name.toLowerCase() === universityName.toLowerCase()
                );
                if (!alreadyExists) {
                    setNetworks(prev => [
                        {
                            id: 'university-' + Date.now(),
                            type: 'university',
                            name: universityName
                        },
                        ...prev
                    ]);
                }
            }
        }
    }, [step, eduEmail]);

    // Simulate processing when on processing step
    useEffect(() => {
        if (step === 'processing') {
            const statuses = [
                'Analyzing your YouTube data...',
                'Extracting your interests...',
                'Building your Digital DNA...',
                'Finding your communities...',
                'Almost there...'
            ];
            
            let progress = 0;
            const interval = setInterval(() => {
                progress += 2;
                setProcessingProgress(Math.min(progress, 100));
                setProcessingStatus(statuses[Math.floor(progress / 25)] || statuses[statuses.length - 1]);
                
                if (progress >= 100) {
                    clearInterval(interval);
                    // Navigate to wrapped/interests page
                    setTimeout(() => {
                        router.push('/profile-setup/wrapped');
                    }, 500);
                }
            }, 100);
            
            return () => clearInterval(interval);
        }
    }, [step, router]);

    const getProgress = () => {
        switch (step) {
            case 'age': return 20;
            case 'email': return 35;
            case 'email-verify': return 45;
            case 'phone': return 55;
            case 'phone-verify': return 65;
            case 'networks': return 80;
            case 'processing': return processingProgress;
            default: return 0;
        }
    };

    const handleAgeSubmit = async () => {
        if (age < 13 || age > 120) {
            setError('Please enter a valid age (13-120)');
            return;
        }
        
        // Save age to database
        if (user) {
            const supabase = createClient();
            await supabase
                .from('user_profile_extras')
                .upsert({
                    user_id: user.id,
                    age: age,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
        }
        
        setError('');
        setStep('email');
    };

    const handleEmailSubmit = () => {
        // For now, just move to verification (would send email in production)
        if (eduEmail && !eduEmail.endsWith('.edu')) {
            setError('Please enter a valid .edu email address');
            return;
        }
        setError('');
        if (eduEmail) {
            setStep('email-verify');
        } else {
            // Skip email verification if no email provided
            setStep('phone');
        }
    };

    const handleEmailVerify = () => {
        // Placeholder verification - accepts "1234"
        if (eduEmailCode !== '1234') {
            setError('Invalid code. (Hint: use 1234)');
            return;
        }
        setError('');
        setStep('phone');
    };

    const handlePhoneSubmit = () => {
        if (phoneNumber) {
            setStep('phone-verify');
        } else {
            // Skip phone verification if no phone provided
            setStep('networks');
        }
    };

    const handlePhoneVerify = () => {
        // Placeholder verification - accepts "1234"
        if (phoneCode !== '1234') {
            setError('Invalid code. (Hint: use 1234)');
            return;
        }
        setError('');
        setStep('networks');
    };

    const handleAddNetwork = () => {
        if (!newNetworkName.trim()) return;
        
        const newNetwork: Network = {
            id: Date.now().toString(),
            type: newNetworkType,
            name: newNetworkName.trim()
        };
        
        setNetworks([...networks, newNetwork]);
        setNewNetworkName('');
    };

    const handleRemoveNetwork = (id: string) => {
        setNetworks(networks.filter(n => n.id !== id));
    };

    const handleNetworksSubmit = async () => {
        // Save networks to database
        if (user && networks.length > 0) {
            const supabase = createClient();
            
            // Save each network
            for (const network of networks) {
                await supabase
                    .from('user_networks')
                    .upsert({
                        user_id: user.id,
                        network_type: network.type,
                        network_name: network.name,
                        created_at: new Date().toISOString(),
                    });
            }
        }
        
        setStep('processing');
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loader}></div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Progress bar */}
            <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                    <div 
                        className={styles.progressFill} 
                        style={{ width: `${getProgress()}%` }}
                    ></div>
                </div>
                <span className={styles.progressText}>{getProgress()}%</span>
            </div>

            <div className={styles.content}>
                {/* Age Step */}
                {step === 'age' && (
                    <div className={styles.stepContent}>
                        <h1 className={styles.title}>How old are you?</h1>
                        <p className={styles.subtitle}>This helps us connect you with the right people</p>
                        
                        <div className={styles.sliderContainer}>
                            <span className={styles.ageDisplay}>{age}</span>
                            <input
                                type="range"
                                min="13"
                                max="100"
                                value={age}
                                onChange={(e) => setAge(parseInt(e.target.value))}
                                className={styles.slider}
                            />
                            <div className={styles.sliderLabels}>
                                <span>13</span>
                                <span>100</span>
                            </div>
                        </div>
                        
                        {error && <p className={styles.error}>{error}</p>}
                        
                        <button onClick={handleAgeSubmit} className={styles.primaryButton}>
                            Continue
                        </button>
                    </div>
                )}

                {/* Email Step */}
                {step === 'email' && (
                    <div className={styles.stepContent}>
                        <h1 className={styles.title}>University Email</h1>
                        <p className={styles.subtitle}>Add your .edu to access your university network</p>
                        
                        <input
                            type="email"
                            value={eduEmail}
                            onChange={(e) => setEduEmail(e.target.value)}
                            placeholder="you@university.edu"
                            className={styles.input}
                        />
                        
                        {error && <p className={styles.error}>{error}</p>}
                        
                        <button onClick={handleEmailSubmit} className={styles.primaryButton}>
                            {eduEmail ? 'Verify Email' : 'Continue'}
                        </button>
                        
                        <span onClick={() => setStep('phone')} className={styles.skipLink}>
                            I don't have a university email
                        </span>
                    </div>
                )}

                {/* Email Verification Step */}
                {step === 'email-verify' && (
                    <div className={styles.stepContent}>
                        <button 
                            onClick={() => { setStep('email'); setEduEmailCode(''); setError(''); }}
                            className={styles.backButton}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7"/>
                            </svg>
                            Back
                        </button>
                        
                        <h1 className={styles.title}>Verify Your Email</h1>
                        <p className={styles.subtitle}>Enter the code sent to {eduEmail}</p>
                        
                        <input
                            type="text"
                            value={eduEmailCode}
                            onChange={(e) => setEduEmailCode(e.target.value)}
                            placeholder="Enter 4-digit code"
                            maxLength={4}
                            className={styles.codeInput}
                        />
                        
                        {error && <p className={styles.error}>{error}</p>}
                        
                        <button onClick={handleEmailVerify} className={styles.primaryButton}>
                            Verify
                        </button>
                        
                        <span className={styles.resendLink}>
                            Didn't receive a code? <span className={styles.resendAction}>Resend</span>
                        </span>
                    </div>
                )}

                {/* Phone Step */}
                {step === 'phone' && (
                    <div className={styles.stepContent}>
                        <h1 className={styles.title}>Phone Number</h1>
                        <p className={styles.subtitle}>Add your phone to make connecting easier</p>
                        
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+1 (555) 123-4567"
                            className={styles.input}
                        />
                        
                        {error && <p className={styles.error}>{error}</p>}
                        
                        <button 
                            onClick={handlePhoneSubmit} 
                            className={`${styles.primaryButton} ${!phoneNumber ? styles.disabled : ''}`}
                            disabled={!phoneNumber}
                        >
                            Continue
                        </button>
                    </div>
                )}

                {/* Phone Verification Step */}
                {step === 'phone-verify' && (
                    <div className={styles.stepContent}>
                        <button 
                            onClick={() => { setStep('phone'); setPhoneCode(''); setError(''); }}
                            className={styles.backButton}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7"/>
                            </svg>
                            Back
                        </button>
                        
                        <h1 className={styles.title}>Verify Your Phone</h1>
                        <p className={styles.subtitle}>Enter the code sent to {phoneNumber}</p>
                        
                        <input
                            type="text"
                            value={phoneCode}
                            onChange={(e) => setPhoneCode(e.target.value)}
                            placeholder="Enter 4-digit code"
                            maxLength={4}
                            className={styles.codeInput}
                        />
                        
                        {error && <p className={styles.error}>{error}</p>}
                        
                        <button onClick={handlePhoneVerify} className={styles.primaryButton}>
                            Verify
                        </button>
                        
                        <span className={styles.resendLink}>
                            Didn't receive a code? <span className={styles.resendAction}>Resend</span>
                        </span>
                    </div>
                )}

                {/* Networks Step */}
                {step === 'networks' && (
                    <div className={styles.stepContent}>
                        <h1 className={styles.title}>Your Networks</h1>
                        <p className={styles.subtitle}>Add at least {networks.length >= 3 ? '3' : `${3 - networks.length} more`} communities you're part of</p>
                        
                        {/* Show university as a locked row if exists */}
                        {networks.filter(n => n.type === 'university').map(network => (
                            <div key={network.id} className={styles.networkRow}>
                                <div className={styles.networkRowLabel}>🏫 University</div>
                                <div className={styles.networkRowValue}>{network.name}</div>
                                <div className={styles.networkRowLocked}>✓</div>
                            </div>
                        ))}
                        
                        {/* Show other added networks as rows */}
                        {networks.filter(n => n.type !== 'university').map(network => (
                            <div key={network.id} className={styles.networkRow}>
                                <div className={styles.networkRowLabel}>
                                    {network.type === 'work' ? '💼 Workplace' : network.type === 'highschool' ? '🎓 High School' : '📍 City'}
                                </div>
                                <div className={styles.networkRowValue}>{network.name}</div>
                                <button 
                                    onClick={() => handleRemoveNetwork(network.id)}
                                    className={styles.networkRowRemove}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        
                        {/* Show empty input rows for remaining slots */}
                        {Array.from({ length: Math.max(0, 3 - networks.length) }).map((_, index) => (
                            <div key={`empty-${index}`} className={styles.networkInput}>
                                <select
                                    value={index === 0 ? newNetworkType : 'work'}
                                    onChange={(e) => index === 0 && setNewNetworkType(e.target.value as any)}
                                    className={styles.networkSelect}
                                    disabled={index !== 0}
                                >
                                    <option value="work">Workplace</option>
                                    <option value="highschool">High School</option>
                                    <option value="city">City / Region</option>
                                </select>
                                <input
                                    type="text"
                                    value={index === 0 ? newNetworkName : ''}
                                    onChange={(e) => index === 0 && setNewNetworkName(e.target.value)}
                                    placeholder="e.g. Google, Lincoln High, NYC"
                                    className={styles.networkNameInput}
                                    disabled={index !== 0}
                                />
                                <button 
                                    onClick={handleAddNetwork} 
                                    className={styles.addButton}
                                    disabled={index !== 0}
                                >
                                    Add
                                </button>
                            </div>
                        ))}
                        
                        <button 
                            onClick={handleNetworksSubmit} 
                            className={`${styles.primaryButton} ${networks.length < 3 ? styles.disabled : ''}`}
                            disabled={networks.length < 3}
                        >
                            Continue
                        </button>
                    </div>
                )}

                {/* Processing Step */}
                {step === 'processing' && (
                    <div className={styles.stepContent}>
                        <h1 className={styles.title}>Building Your Profile</h1>
                        <p className={styles.subtitle}>{processingStatus}</p>
                        
                        <div className={styles.processingLoader}>
                            <div className={styles.spinner}></div>
                        </div>
                        
                        <div className={styles.processingProgress}>
                            <div 
                                className={styles.processingFill}
                                style={{ width: `${processingProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
