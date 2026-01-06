'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import HelpIcon from '@/components/HelpIcon';
import HelpModal from '@/components/HelpModal';

export default function ProfileSetupPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isHelpOpen, setIsHelpOpen] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [school, setSchool] = useState('');
    const [oneLiner, setOneLiner] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
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
                    school: school.trim() || null,
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
            setError(err.message || 'Failed to save profile');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
            <HelpIcon onClick={() => setIsHelpOpen(true)} />
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
            <div className="min-h-screen bg-white flex flex-col items-center py-12 px-4 relative overflow-x-hidden">
                {/* Progress Bar Container */}
                <div className="w-full max-w-[600px] flex flex-col gap-2 mb-24">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[15px] font-normal text-black font-display">Build your Digital DNA</span>
                        <span className="text-[15px] font-normal text-black font-display">25%</span>
                    </div>
                    <div className="w-full h-[10px] bg-white border border-black relative">
                        <div className="absolute top-0 left-0 h-full w-1/4 bg-gradient-to-b from-[#252525] to-[#454545]"></div>
                    </div>
                </div>

                {/* Form Fields - Centered Column */}
                <div className="flex flex-col items-center gap-6 w-full">

                    {/* Name */}
                    <div className="w-[300px] flex flex-col gap-2">
                        <label className="text-[15px] text-black font-display">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-[40px] bg-white border border-black px-3 text-black font-display focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                        />
                    </div>

                    {/* Age */}
                    <div className="w-[300px] flex flex-col gap-2">
                        <label className="text-[15px] text-black font-display">Age</label>
                        <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="w-full h-[40px] bg-white border border-black px-3 text-black font-display focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                        />
                    </div>

                    {/* School */}
                    <div className="w-[300px] flex flex-col gap-2">
                        <label className="text-[15px] text-black font-display">School</label>
                        <input
                            type="text"
                            value={school}
                            onChange={(e) => setSchool(e.target.value)}
                            className="w-full h-[40px] bg-white border border-black px-3 text-black font-display focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                        />
                    </div>

                    {/* Photo */}
                    <div className="w-[300px] flex flex-col gap-2">
                        <label className="text-[15px] text-black font-display">Profile Photo (optional)</label>
                        <div
                            onClick={handlePhotoClick}
                            className="w-full h-[40px] bg-white border border-black flex items-center justify-between px-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                            <span className="text-gray-500 text-sm truncate">{photoFile ? photoFile.name : (photoUrl ? 'Current photo used' : '')}</span>
                            {photoUrl && (
                                <div className="relative w-6 h-6 rounded-full overflow-hidden border border-gray-200">
                                    <Image src={photoUrl} alt="" fill className="object-cover" />
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                        />
                    </div>

                    {/* One-liner */}
                    <div className="w-[500px] max-w-full flex flex-col gap-2">
                        <label className="text-[15px] text-black font-display">One-liner (optional): What do you want people to know you for?</label>
                        <textarea
                            value={oneLiner}
                            onChange={(e) => setOneLiner(e.target.value)}
                            rows={3}
                            className="w-full h-[80px] bg-white border border-black p-3 text-black font-display focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none"
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm font-display">{error}</p>}

                    {/* Continue Button */}
                    <button
                        onClick={handleContinue}
                        disabled={isSaving}
                        className="mt-12 text-[30px] font-bold text-black font-display hover:opacity-70 transition-opacity disabled:opacity-50 cursor-pointer"
                    >
                        {isSaving ? 'Saving...' : 'Continue →'}
                    </button>
                </div>
            </div>
        </>
    );
}
