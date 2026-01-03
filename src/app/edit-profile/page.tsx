'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/Menu';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase';
import { YouTubeService } from '@/services/youtube';

export default function EditProfile() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [school, setSchool] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Connections State - Check if YouTube is actually connected
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

      // Check YouTube connection status
      await checkYouTubeConnection(user.id);

    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkYouTubeConnection = async (userId: string) => {
    const supabase = createClient();
    
    try {
      // Check if user has YouTube data or access token
      const [subsResult, likesResult, accessToken] = await Promise.all([
        supabase
          .from('youtube_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .limit(1),
        supabase
          .from('youtube_liked_videos')
          .select('id')
          .eq('user_id', userId)
          .limit(1),
        YouTubeService.getAccessToken(),
      ]);

      const hasData = (subsResult.data && subsResult.data.length > 0) || 
                      (likesResult.data && likesResult.data.length > 0);
      const hasToken = !!accessToken;

      // YouTube is connected if there's data or a valid token
      setYoutubeConnected(hasData || hasToken);
    } catch (error) {
      console.error('Error checking YouTube connection:', error);
      // Default to false if check fails
      setYoutubeConnected(false);
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

  const handleDisconnectYouTube = () => {
    // Show warning modal
    setShowDisconnectModal(true);
  };

  const confirmDisconnectYouTube = async () => {
    setShowDisconnectModal(false);
    setDisconnecting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('You must be logged in to disconnect YouTube.');
      setDisconnecting(false);
      return;
    }

    try {
      await YouTubeService.disconnectYouTube();
      
      // Update connection status
      setYoutubeConnected(false);
      
      alert('YouTube has been disconnected successfully. All YouTube data has been deleted.');
    } catch (error: any) {
      console.error('Error disconnecting YouTube:', error);
      alert(`Error disconnecting YouTube: ${error.message || 'An unexpected error occurred'}`);
    } finally {
      setDisconnecting(false);
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
      router.push('/');
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

                {/* YouTube - Always connected via Google OAuth */}
                <div className={styles.connectionCard}>
                  <div className={styles.connectionCardHeader}>
                    {/* YouTube Logo */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/>
                    </svg>
                    <span>YouTube</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {youtubeConnected ? (
                      <>
                        <span className={styles.statusConnected}>Connected</span>
                        <button 
                          className={styles.disconnectBtn}
                          onClick={handleDisconnectYouTube}
                          disabled={disconnecting || showDisconnectModal}
                        >
                          {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      </>
                    ) : (
                      <span className={styles.statusNotConnected}>Not Connected</span>
                    )}
                  </div>
                </div>

                {/* TikTok - Coming Soon */}
                <div className={styles.connectionCard} style={{ opacity: 0.6 }}>
                  <div className={styles.connectionCardHeader}>
                    {/* TikTok Logo */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" fill="currentColor"/>
                    </svg>
                    <span>TikTok</span>
                  </div>
                  <span className={styles.statusIncoming}>Coming Soon</span>
                </div>

                {/* Spotify - Coming Soon */}
                <div className={styles.connectionCard} style={{ opacity: 0.6 }}>
                    <div className={styles.connectionCardHeader}>
                    {/* Spotify Logo */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" fill="#1DB954"/>
                    </svg>
                    <span>Spotify</span>
                  </div>
                  <span className={styles.statusIncoming}>Coming Soon</span>
                    </div>

                {/* Pinterest - Coming Soon */}
                <div className={styles.connectionCard} style={{ opacity: 0.6 }}>
                  <div className={styles.connectionCardHeader}>
                    {/* Pinterest Logo */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" fill="#E60023"/>
                    </svg>
                    <span>Pinterest</span>
                  </div>
                  <span className={styles.statusIncoming}>Coming Soon</span>
                </div>
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

          <div className={styles.legalLinksSection}>
            <p className={styles.legalLinksTitle}>Legal</p>
            <div className={styles.legalLinks}>
              <a href="/privacy-policy" className={styles.legalLink}>Privacy Policy</a>
              <span className={styles.legalSeparator}>•</span>
              <a href="/terms-of-service" className={styles.legalLink}>Terms of Service</a>
              <span className={styles.legalSeparator}>•</span>
              <a href="/terms-of-use" className={styles.legalLink}>Terms of Use</a>
              <span className={styles.legalSeparator}>•</span>
              <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className={styles.legalLink}>YouTube Terms</a>
            </div>
          </div>
        </div>
      </div>

      {/* Disconnect YouTube Warning Modal */}
      {showDisconnectModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDisconnectModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>⚠️ Warning: Disconnecting YouTube</h2>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalWarning}>
                <strong>Disconnecting YouTube is similar to deleting your account.</strong>
              </p>
              <p className={styles.modalText}>
                This action will permanently delete:
              </p>
              <ul className={styles.modalList}>
                <li>All your YouTube subscriptions data</li>
                <li>All your YouTube liked videos data</li>
                <li>Your Digital DNA profile derived from YouTube</li>
                <li>Your interest matches and recommendations</li>
              </ul>
              <p className={styles.modalText}>
                <strong>This action cannot be undone.</strong> You will lose all the personalized connections and matches that were based on your YouTube data.
              </p>
              <p className={styles.modalText}>
                If you want to keep using TheNetwork effectively, you should keep YouTube connected. Disconnecting YouTube will significantly impact your experience on the platform.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setShowDisconnectModal(false)}
                disabled={disconnecting}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={confirmDisconnectYouTube}
                disabled={disconnecting}
              >
                {disconnecting ? 'Disconnecting...' : 'Yes, Disconnect YouTube'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

