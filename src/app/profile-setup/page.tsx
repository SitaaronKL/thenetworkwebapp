'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';

export default function ProfileSetupPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [location, setLocation] = useState('');
    const [oneLiner, setOneLiner] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/landing');
        }
    }, [user, loading, router]);

    // Pre-fill data from Google auth
    useEffect(() => {
        if (user) {
            const metadata = user.user_metadata;
            setName(metadata?.full_name || metadata?.name || user.email?.split('@')[0] || '');
            setPhotoUrl(metadata?.avatar_url || metadata?.picture || null);
        }
    }, [user]);

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPhotoUrl(objectUrl);
        }
    };

    const handleContinue = async () => {
        if (!user) return;

        // Validation
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!age || parseInt(age) < 13 || parseInt(age) > 120) {
            setError('Please enter a valid age (13-120)');
            return;
        }

        setIsSaving(true);
        setError('');

        const supabase = createClient();

        try {
            let avatarUrl = photoUrl;

            // Upload photo if a new file was selected
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${user.id}-${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('profile-images')
                    .upload(fileName, photoFile, { upsert: true });

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('profile-images')
                        .getPublicUrl(fileName);
                    avatarUrl = publicUrl;
                }
            }

            // Update profile in database
            const { error: updateError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: name.trim(),
                    age: parseInt(age),
                    location: location.trim() || null,
                    one_liner: oneLiner.trim() || null,
                    avatar_url: avatarUrl,
                    star_color: '#8E5BFF', // Default
                }, { onConflict: 'id' });

            if (updateError) {
                throw updateError;
            }

            // Navigate to signals page
            router.push('/profile-setup/signals');
        } catch (err: any) {
            console.error('Error saving profile:', err);
            setError(err.message || 'Failed to save profile');
        } finally {
            setIsSaving(false);
        }
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
            {/* Progress Bar */}
            <div className={styles.progressContainer}>
                <span className={styles.progressLabel}>Build your Digital DNA</span>
                <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: '33%' }}></div>
                </div>
                <span className={styles.progressPercent}>33%</span>
            </div>

            <main className={styles.main}>
                <h1 className={styles.title}>Tell us about you</h1>
                <p className={styles.subtitle}>This helps us personalize your experience</p>

                <div className={styles.form}>
                    {/* Photo Upload */}
                    <div className={styles.photoSection}>
                        <div
                            className={styles.photoCircle}
                            onClick={handlePhotoClick}
                        >
                            {photoUrl ? (
                                <Image
                                    src={photoUrl}
                                    alt="Profile"
                                    fill
                                    className={styles.photoImage}
                                />
                            ) : (
                                <div className={styles.photoPlaceholder}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M12 16a4 4 0 100-8 4 4 0 000 8z" />
                                        <path d="M3 16.8V7.2c0-1.12 0-1.68.218-2.108a2 2 0 01.874-.874C4.52 4 5.08 4 6.2 4h1.055c.123 0 .184 0 .244-.003a1.5 1.5 0 001.084-.639c.035-.05.068-.105.133-.214.13-.218.195-.327.27-.418a1.5 1.5 0 011.084-.639C10.13 3 10.21 3 10.367 3h3.266c.158 0 .237 0 .297.087a1.5 1.5 0 011.084.639c.075.091.14.2.27.418.065.11.098.164.133.214a1.5 1.5 0 001.084.639c.06.003.121.003.244.003H17.8c1.12 0 1.68 0 2.108.218a2 2 0 01.874.874C21 6.52 21 7.08 21 8.2v8.6c0 1.12 0 1.68-.218 2.108a2 2 0 01-.874.874C19.48 20 18.92 20 17.8 20H6.2c-1.12 0-1.68 0-2.108-.218a2 2 0 01-.874-.874C3 18.48 3 17.92 3 16.8z" />
                                    </svg>
                                    <span>Add photo</span>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className={styles.hiddenInput}
                        />
                        <span className={styles.photoHint}>Optional • Uses Google photo by default</span>
                    </div>

                    {/* Name Input */}
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>What should we call you?</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            className={styles.input}
                            maxLength={100}
                        />
                    </div>

                    {/* Age Input */}
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>How old are you?</label>
                        <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            placeholder="21"
                            className={styles.input}
                            min={13}
                            max={120}
                        />
                    </div>

                    {/* Location Input */}
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Where are you based?</label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="New York, NY"
                            className={styles.input}
                        />
                    </div>

                    {/* One-liner Input */}
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>One thing you want people to know <span className={styles.optional}>(optional)</span></label>
                        <textarea
                            value={oneLiner}
                            onChange={(e) => setOneLiner(e.target.value)}
                            placeholder="Building cool stuff..."
                            className={styles.textarea}
                            maxLength={280}
                            rows={2}
                        />
                        <span className={styles.charCount}>{oneLiner.length}/280</span>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    {/* Continue Button */}
                    <button
                        className={styles.continueButton}
                        onClick={handleContinue}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Continue →'}
                    </button>
                </div>
            </main>
        </div>
    );
}
