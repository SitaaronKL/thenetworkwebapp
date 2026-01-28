'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import { YouTubeService } from '@/services/youtube';
import { VerificationService } from '@/services/verification';
import styles from './page.module.css';

type Step = 'age' | 'email' | 'email-verify' | 'phone' | 'phone-verify' | 'networks' | 'processing'; // phone-verify commented out but kept in type for now

interface Network {
    id: string;
    type: 'work' | 'highschool' | 'city' | 'university';
    name: string;
}

// University name is now dynamically parsed using LLM via parse-university-name Edge Function

export default function OnboardingPage() {
    const { user, session, loading } = useAuth();
    const router = useRouter();
    const hasStartedProcessing = useRef(false);
    const hasCalledDeriveInterests = useRef(false);
    const hasAttemptedUniversityParse = useRef(false);
    
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
    
    // Loading states
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
    const [isParsingUniversity, setIsParsingUniversity] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Check YouTube data and start derive_interests when on age page
    useEffect(() => {
        if (step === 'age' && user && !hasCalledDeriveInterests.current) {
            hasCalledDeriveInterests.current = true;
            
            const checkAndStartProcessing = async () => {
                const supabase = createClient();
                
                try {
                    // Check if YouTube data exists
                    const [subsResult, likesResult] = await Promise.all([
                        supabase
                            .from('youtube_subscriptions')
                            .select('user_id')
                            .eq('user_id', user.id)
                            .limit(1),
                        supabase
                            .from('youtube_liked_videos')
                            .select('user_id')
                            .eq('user_id', user.id)
                            .limit(1)
                    ]);

                    const hasYouTubeData = (subsResult.data?.length ?? 0) > 0 || (likesResult.data?.length ?? 0) > 0;

                    if (!hasYouTubeData) {
                        // Try to sync YouTube data first
                        try {
                            const accessToken = await YouTubeService.getAccessToken();
                            if (accessToken) {
                                await YouTubeService.syncYouTubeData(user.id);
                                // Re-check after sync
                                const [subsCheck, likesCheck] = await Promise.all([
                                    supabase
                                        .from('youtube_subscriptions')
                                        .select('user_id')
                                        .eq('user_id', user.id)
                                        .limit(1),
                                    supabase
                                        .from('youtube_liked_videos')
                                        .select('user_id')
                                        .eq('user_id', user.id)
                                        .limit(1)
                                ]);
                                const stillNoData = (subsCheck.data?.length ?? 0) === 0 && (likesCheck.data?.length ?? 0) === 0;
                                
                                if (stillNoData) {
                                    // No YouTube data - redirect to beginning with message
                                    alert('We couldn\'t find YouTube data for your account. Please sign in with YouTube to continue onboarding.');
                                    router.push('/');
                                    return;
                                }
                            } else {
                                // No access token - redirect to beginning
                                alert('We couldn\'t find YouTube data for your account. Please sign in with YouTube to continue onboarding.');
                                router.push('/');
                                return;
                            }
                        } catch (e) {
                            // Sync failed - redirect to beginning
                            alert('We couldn\'t find YouTube data for your account. Please sign in with YouTube to continue onboarding.');
                            router.push('/');
                            return;
                        }
                    }

                    // YouTube data exists - start derive_interests in background
                    try {
                        YouTubeService.deriveInterests(user.id).catch(() => {
                            // Silently fail - will be retried later if needed
                        });
                    } catch (error) {
                        // Silently fail
                    }
                } catch (error) {
                    // Silently fail
                }
            };
            
            checkAndStartProcessing();
        }
    }, [step, user, router]);

    // Start DNA v2 computation in background when page loads (derive_interests is handled on age page)
    useEffect(() => {
        if (!user || !session || hasStartedProcessing.current) return;
        hasStartedProcessing.current = true;
        
        const startBackendProcessing = async () => {
            try {
                // Trigger DNA v2 computation in background
                fetch('/api/compute-dna-v2', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: user.id,
                        trigger_source: 'NEW_USER_SIGNUP'
                    })
                }).catch(() => {
                    // Silently fail
                });
            } catch (e) {
                // Silently fail
            }
        };

        startBackendProcessing();
    }, [user, session]);

    // Auto-add university from edu email when entering networks step (using LLM)
    useEffect(() => {
        if (step === 'networks' && user && !isParsingUniversity && !hasAttemptedUniversityParse.current) {
            hasAttemptedUniversityParse.current = true;
            
            const fetchAndParseUniversity = async () => {
                try {
                    const supabase = createClient();
                    
                    // First, get the school email from database if not in state
                    let schoolEmail = eduEmail;
                    if (!schoolEmail) {
                        const { data: profileExtras } = await supabase
                            .from('user_profile_extras')
                            .select('school_email')
                            .eq('user_id', user.id)
                            .single();
                        
                        if (profileExtras?.school_email) {
                            schoolEmail = profileExtras.school_email;
                            setEduEmail(schoolEmail); // Update state for consistency
                        }
                    }
                    
                    if (!schoolEmail) {
                        hasAttemptedUniversityParse.current = false; // Reset so we can try again
                        return;
                    }
                    
                    const domain = schoolEmail.split('@')[1]?.toLowerCase();
                    if (!domain || !domain.endsWith('.edu')) {
                        hasAttemptedUniversityParse.current = false;
                        return;
                    }

                    setIsParsingUniversity(true);

                    const { data, error } = await supabase.functions.invoke('parse-university-name', {
                        body: {
                            email_domain: domain,
                        },
                    });

                    if (error) {
                        setIsParsingUniversity(false);
                        hasAttemptedUniversityParse.current = false; // Reset on error
                        return;
                    }

                    if (data?.university_name) {
                        const universityName = data.university_name;
                        
                        // Save university name to college field in user_profile_extras
                        await supabase
                            .from('user_profile_extras')
                            .upsert({
                                user_id: user.id,
                                college: universityName,
                                updated_at: new Date().toISOString(),
                            }, { onConflict: 'user_id' });
                        
                        // Check if university not already added (race condition protection)
                        setNetworks(prev => {
                            const alreadyExists = prev.some(
                                n => n.type === 'university' && n.name.toLowerCase() === universityName.toLowerCase()
                            );
                            if (alreadyExists) {
                                return prev;
                            }
                            return [
                                {
                                    id: 'university-' + Date.now(),
                                    type: 'university',
                                    name: universityName
                                },
                                ...prev
                            ];
                        });
                    }
                } catch (err) {
                    hasAttemptedUniversityParse.current = false; // Reset on error
                } finally {
                    setIsParsingUniversity(false);
                }
            };

            fetchAndParseUniversity();
        }
        
        // Reset the ref when leaving networks step
        if (step !== 'networks') {
            hasAttemptedUniversityParse.current = false;
        }
    }, [step, user, eduEmail, isParsingUniversity]);

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
            case 'phone': return 60; // Adjusted since we skip phone-verify
            // case 'phone-verify': return 65; // COMMENTED OUT
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

    const handleEmailSubmit = async () => {
        if (eduEmail && !eduEmail.endsWith('.edu')) {
            setError('Please enter a valid .edu email address');
            return;
        }
        
        if (!eduEmail) {
            // Skip email verification if no email provided
            setStep('phone');
            return;
        }

        if (!user) {
            setError('User not authenticated');
            return;
        }

        setError('');
        setIsVerifyingEmail(true);
        
        try {
            // Send verification code
            const result = await VerificationService.sendSchoolEmailVerification(eduEmail, user.id);
            
            if (result.success) {
                setError('');
                setStep('email-verify');
            } else {
                setError(result.error || 'Failed to send verification code');
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to send verification code.');
        } finally {
            setIsVerifyingEmail(false);
        }
    };

    const handleEmailVerify = async () => {
        if (!eduEmailCode || eduEmailCode.length !== 6) {
            setError('Please enter the 6-digit verification code');
            return;
        }

        if (!user || !eduEmail) {
            setError('Missing required information');
            return;
        }

        setError('');
        
        // Validate verification code
        const result = await VerificationService.validateSchoolEmailCode(
            eduEmail,
            eduEmailCode,
            user.id
        );
        
        if (result.valid) {
            setError('');
            setStep('phone');
        } else {
            setError(result.error || 'Invalid verification code');
        }
    };

    const handlePhoneSubmit = async () => {
        // PHONE VERIFICATION COMMENTED OUT FOR NOW
        // Just save phone number and move to networks
        
        if (!user) {
            setError('User not authenticated');
            return;
        }

        // Format phone number to E.164 format if provided
        if (phoneNumber) {
            let formattedPhone = phoneNumber.trim();
            if (!formattedPhone.startsWith('+')) {
                // If no country code, assume US (+1)
                formattedPhone = formattedPhone.replace(/\D/g, ''); // Remove non-digits
                if (formattedPhone.length === 10) {
                    formattedPhone = '+1' + formattedPhone;
                } else {
                    setError('Please enter a valid phone number with country code');
                    return;
                }
            }

            // Save phone number to user_profile_extras (not profiles table)
            try {
                const supabase = createClient();
                await supabase
                    .from('user_profile_extras')
                    .upsert({ 
                        user_id: user.id,
                        contact_phone: formattedPhone,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' });
            } catch (e) {
                // Continue anyway
            }
        }

        setError('');
        setStep('networks');

        // PHONE VERIFICATION CODE (COMMENTED OUT)
        // if (!phoneNumber) {
        //     // Skip phone verification if no phone provided
        //     setStep('networks');
        //     return;
        // }
        // // Format phone number to E.164 format if needed
        // let formattedPhone = phoneNumber.trim();
        // if (!formattedPhone.startsWith('+')) {
        //     // If no country code, assume US (+1)
        //     formattedPhone = formattedPhone.replace(/\D/g, ''); // Remove non-digits
        //     if (formattedPhone.length === 10) {
        //         formattedPhone = '+1' + formattedPhone;
        //     } else {
        //         setError('Please enter a valid phone number with country code');
        //         return;
        //     }
        // }
        // setError('');
        // // Send verification code
        // const result = await VerificationService.sendPhoneVerification(formattedPhone, user.id);
        // if (result.success) {
        //     setPhoneNumber(formattedPhone); // Update with formatted number
        //     setStep('phone-verify');
        //     // In development, log the code for testing
        //     if (result.code) {
        //         console.log('Verification code (dev only):', result.code);
        //     }
        // } else {
        //     setError(result.error || 'Failed to send verification code');
        // }
    };

    // PHONE VERIFICATION COMMENTED OUT
    // const handlePhoneVerify = async () => {
    //     if (!phoneCode || phoneCode.length !== 6) {
    //         setError('Please enter the 6-digit verification code');
    //         return;
    //     }
    //     if (!user || !phoneNumber) {
    //         setError('Missing required information');
    //         return;
    //     }
    //     setError('');
    //     // Validate verification code
    //     const result = await VerificationService.validatePhoneCode(
    //         phoneNumber,
    //         phoneCode,
    //         user.id
    //     );
    //     if (result.valid) {
    //         setError('');
    //         setStep('networks');
    //     } else {
    //         setError(result.error || 'Invalid verification code');
    //     }
    // };

    const handleAddNetwork = () => {
        if (!newNetworkName.trim()) return;
        
        // Maximum 8 networks total
        if (networks.length >= 8) return;
        
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
        if (!user) {
            setError('User not authenticated');
            return;
        }

        const supabase = createClient();
        
        // Extract network names as array of strings for user_profile_extras.networks
        const networkNames = networks.map(n => n.name.trim()).filter(name => name.length > 0);
        
        // Extract college/university from networks (type === 'university' or 'work' if it's a school)
        const universityNetwork = networks.find(n => 
            n.type === 'university' || 
            (n.type === 'work' && (n.name.toLowerCase().includes('university') || n.name.toLowerCase().includes('college')))
        );
        const collegeName = universityNetwork ? universityNetwork.name.trim() : null;
        
        // Extract high school from networks (type === 'highschool')
        const highSchoolNetwork = networks.find(n => n.type === 'highschool');
        const highSchoolName = highSchoolNetwork ? highSchoolNetwork.name.trim() : null;
        
        // Extract company from networks (type === 'work' and not a school)
        const companyNetwork = networks.find(n => 
            n.type === 'work' && 
            !n.name.toLowerCase().includes('university') && 
            !n.name.toLowerCase().includes('college')
        );
        const companyName = companyNetwork ? companyNetwork.name.trim() : null;
        
        // Save to user_profile_extras
        const extrasUpdate: any = {
            user_id: user.id,
            updated_at: new Date().toISOString(),
        };
        
        // Only update fields that have values
        if (networkNames.length > 0) {
            extrasUpdate.networks = networkNames;
        }
        if (collegeName) {
            extrasUpdate.college = collegeName;
        }
        if (highSchoolName) {
            extrasUpdate.high_school = highSchoolName;
        }
        if (companyName) {
            extrasUpdate.company = companyName;
        }
        
        await supabase
            .from('user_profile_extras')
            .upsert(extrasUpdate, { onConflict: 'user_id' });
        
        // Also save to user_networks table for backwards compatibility (if that table exists)
        if (networks.length > 0) {
            try {
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
            } catch (e) {
                // Silently fail if user_networks table doesn't exist
                console.warn('Could not save to user_networks table:', e);
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
                        
                        <button 
                            onClick={handleEmailSubmit} 
                            className={`${styles.primaryButton} ${!eduEmail.trim() ? styles.disabled : ''}`}
                            disabled={isVerifyingEmail || !eduEmail.trim()}
                        >
                            {isVerifyingEmail ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    Verifying...
                                </>
                            ) : (
                                'Continue'
                            )}
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
                            onChange={(e) => setEduEmailCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter"
                            maxLength={6}
                            className={styles.codeInput}
                        />
                        
                        {error && <p className={styles.error}>{error}</p>}
                        
                        <button 
                            onClick={handleEmailVerify} 
                            className={`${styles.primaryButton} ${eduEmailCode.length !== 6 ? styles.disabled : ''}`}
                            disabled={eduEmailCode.length !== 6}
                        >
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

                {/* Phone Verification Step - COMMENTED OUT */}
                {false && step === 'phone-verify' && (
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
                            onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            className={styles.codeInput}
                        />
                        
                        {error && <p className={styles.error}>{error}</p>}
                        
                        <button onClick={() => {}} className={styles.primaryButton} disabled>
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
                        <p className={styles.subtitle}>
                            {networks.length < 3 
                                ? `Add at least ${3 - networks.length} more ${3 - networks.length === 1 ? 'community' : 'communities'} you're part of`
                                : networks.length < 8
                                ? `You can add up to ${8 - networks.length} more ${8 - networks.length === 1 ? 'network' : 'networks'} (${networks.length}/8)`
                                : 'You have reached the maximum of 8 networks'}
                        </p>
                        
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
                        
                        {/* Show empty input rows for remaining slots (up to 8 total) */}
                        {networks.length < 8 && (
                            <div className={styles.networkInput}>
                                <select
                                    value={newNetworkType}
                                    onChange={(e) => setNewNetworkType(e.target.value as any)}
                                    className={styles.networkSelect}
                                >
                                    <option value="work">Workplace</option>
                                    <option value="highschool">High School</option>
                                    <option value="city">City / Region</option>
                                </select>
                                <input
                                    type="text"
                                    value={newNetworkName}
                                    onChange={(e) => setNewNetworkName(e.target.value)}
                                    placeholder="e.g. Google, Lincoln High, NYC"
                                    className={styles.networkNameInput}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && newNetworkName.trim()) {
                                            handleAddNetwork();
                                        }
                                    }}
                                />
                                <button 
                                    onClick={handleAddNetwork} 
                                    className={styles.addButton}
                                    disabled={!newNetworkName.trim() || networks.length >= 8}
                                >
                                    Add
                                </button>
                            </div>
                        )}
                        
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
