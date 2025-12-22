'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/Menu';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase';

export default function EditProfile() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [school, setSchool] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Connections State
  const [youtubeConnected, setYoutubeConnected] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    try {
      // 1. Fetch Profile Data
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, school, avatar_url')
        .eq('id', user.id)
        .single();

      // Fetch Agent Handle
      const { data: handleData } = await supabase
        .from('agent_handles')
        .select('handle')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || '');
        setSchool(profile.school || '');

        // Avatar Logic
        if (profile.avatar_url) {
          const path = profile.avatar_url;
          if (path.startsWith('http')) {
            setAvatarUrl(path);
          } else {
            const bucket = 'profile-images';
            const cleanPath = path.startsWith('/') ? path.slice(1) : path;
            const pathWithBucket = cleanPath.startsWith(bucket) ? cleanPath : `${bucket}/${cleanPath}`;
            setAvatarUrl(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${pathWithBucket}`);
          }
        }
      }

      if (handleData) {
        setBio(handleData.handle || '');
      }

      // 2. Check YouTube Connection (user_platform_vectors)
      const { data: vectors } = await supabase
        .from('user_platform_vectors')
        .select('platform')
        .eq('user_id', user.id)
        .eq('platform', 'youtube')
        .limit(1);

      if (vectors && vectors.length > 0) {
        setYoutubeConnected(true);
      }

    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

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
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      const fullUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${filePath}`;
      setAvatarUrl(fullUrl);
      alert('Profile picture updated!');

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert(`Error uploading image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    try {
      // Update Profile
      const profileUpdates = {
        full_name: fullName,
        school: school,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Upsert Agent Handle
      // We need to know if it exists or insert new. 
      // Upsert on valid unique constraint (user_id presumably unique? or handle unique?)
      // We assume user_id is unique in agent_handles or handled by RLS/Trigger.
      // But upsert requires the primary key or unique constraint to be specified if not inferred.
      // Assuming user_id is NOT the PK, but there is a unique constraint on handle or user_id.
      // Let's try regular upsert or select-update logic.
      // Actually, safest is to check existence if we don't know constraints.
      // Or just try upserting with user_id.

      const { error: handleError } = await supabase
        .from('agent_handles')
        .upsert({
          user_id: user.id,
          handle: bio
        }, { onConflict: 'user_id' }); // Assuming unique on user_id

      if (handleError) {
        // Fallback if user_id not unique constraint?
        // If 409 conflict on handle (if someone else has it):
        // User will see error.
        throw handleError;
      }

      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(`Error saving changes: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Confirm deletion
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data, connections, and messages.'
    );

    if (!confirmed) {
      return;
    }

    // Double confirmation
    const doubleConfirmed = window.confirm(
      'This is your last chance. Are you absolutely sure you want to delete your account?'
    );

    if (!doubleConfirmed) {
      return;
    }

    setDeleting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('You must be logged in to delete your account.');
      setDeleting(false);
      return;
    }

    try {
      // Get the session token for the edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call the delete-account edge function
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Success - sign out and redirect
      alert('Your account has been deleted successfully.');
      await supabase.auth.signOut();
      router.push('/landing');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert(`Error deleting account: ${error.message || 'An unexpected error occurred'}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  return (
    <>
      <Menu />
      <div className={styles.container}>
        <div className={styles.window}>
        <div className={styles.header}>
          <h1 className={styles.title}>Edit Profile</h1>
          <button 
            className={styles.closeButton} 
            onClick={() => router.push('/')}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.avatarBlock} onClick={handleAvatarClick} style={{ cursor: 'pointer' }}>
            <div className={`${styles.avatar} invert-media`} style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : {}}></div>
          <div className={styles.avatarHint}>
            {uploading ? 'Uploading...' : 'Tap to change photo'}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept="image/*"
          />
        </div>

        <form className={styles.form}>
          <div className={styles.fieldRow}>
            <div className={styles.label}>Name</div>
            <input
              className={styles.input}
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Check your name"
              aria-label="Name"
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.label}>School</div>
            <input
              className={styles.input}
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="What school do you attend?"
              aria-label="School"
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.label}>Bio</div>
            <div>
              {/* Removed the hint div here */}
              <textarea
                aria-label="Bio"
                placeholder="Bio"
                className={styles.textarea}
                value={bio}
                maxLength={50}
                onChange={(e) => setBio(e.target.value)}
                style={{ height: '60px' }}
              ></textarea>
            </div>
          </div>

          <div className={styles.fieldRow} style={{ marginTop: '20px' }}>
            <div className={styles.label}>Connections</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>

              {/* YouTube */}
              <div className={styles.connectionCard}>
                <div className={styles.connectionCardHeader}>
                  <div className={styles.ytIcon}>YT</div>
                  <span>YouTube</span>
                </div>
                {youtubeConnected ? (
                  <span className={styles.statusConnected}>Connected</span>
                ) : (
                  <span className={styles.statusNotConnected}>Not Connected</span>
                )}
              </div>

              {/* Incoming */}
              {['TikTok', 'LinkedIn', 'Spotify'].map(platform => (
                <div key={platform} className={styles.connectionCard} style={{ opacity: 0.7 }}>
                  <div className={styles.connectionCardHeader}>
                    <div className={styles.platformIcon}></div>
                    <span>{platform}</span>
                  </div>
                  <span className={styles.statusIncoming}>Incoming</span>
                </div>
              ))}
            </div>
          </div>

        </form>

      <div className={styles.footer}>
        <div className={styles.progress}>
          <strong className={styles.progressStrong}>Profile Status</strong>
          <span className={styles.progressSpan}>Up to date</span>
        </div>
        <button
          className={styles.saveBtn}
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
          </div>
          
          <div className={styles.deleteSection}>
            <button
              className={styles.deleteBtn}
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Account'}
        </button>
          </div>
        </div>
      </div>
    </>
  );
}

