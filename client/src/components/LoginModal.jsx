import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../lib/api';
import {
  MessageSquare,
  Sparkles,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  LogIn,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Luna',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Maya',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Leo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Zoe'
];

export default function LoginModal() {
  const { register, login, checkUsername, loading } = useAuth();
  const [tab, setTab] = useState('login'); // 'register' | 'login'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('Available for 1-on-1 direct chat');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null); // null | true | false

  const fileInputRef = useRef(null);
  const checkDebounceRef = useRef(null);

  // Debounced live username availability check (only on register tab)
  useEffect(() => {
    if (tab !== 'register') {
      setIsUsernameAvailable(null);
      return;
    }

    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!clean || clean.length < 2) {
      setIsUsernameAvailable(null);
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);

    checkDebounceRef.current = setTimeout(async () => {
      const available = await checkUsername(clean);
      setIsUsernameAvailable(available);
      setIsCheckingUsername(false);
    }, 300);

    return () => {
      if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);
    };
  }, [username, tab]);

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, JPEG, WEBP)');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(apiUrl('/api/upload'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.fileUrl) {
        setSelectedAvatar(data.fileUrl);
      } else {
        setError('Failed to upload picture from gallery');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError('Error uploading avatar picture');
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername) {
      setError('Please enter a valid username');
      return;
    }

    if (tab === 'register') {
      if (cleanUsername.length < 2) {
        setError('Username must be at least 2 characters long');
        return;
      }
      if (!password || password.length < 4) {
        setError('Password must be at least 4 characters long');
        return;
      }
      if (!/[A-Za-z]/.test(password)) {
        setError('Password must contain at least one alphabet letter');
        return;
      }
      if (isUsernameAvailable === false) {
        setError('This username is already taken. Please choose another username.');
        return;
      }

      const res = await register({
        username: cleanUsername,
        displayName: displayName.trim() || cleanUsername,
        password: password,
        avatar: selectedAvatar,
        bio: bio.trim()
      });

      if (!res.success) {
        setError(res.error || 'Failed to create account');
      }
    } else {
      if (!password) {
        setError('Please enter your password');
        return;
      }
      // Sign In with username & password
      const res = await login(cleanUsername, password);
      if (!res.success) {
        setError(res.error || 'Invalid username or password');
      }
    }
  };

  const generateRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(2, 9);
    setSelectedAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  return (
    <div className="auth-shell fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div className="auth-frame w-full max-w-md overflow-hidden animate-fadeIn">
        {/* Top Brand Header */}
        <div className="auth-brand">
          <div className="auth-brand-mark">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h1>ChatDirect</h1>
          <p>Private 1-on-1 messaging</p>

          {/* Segmented Control Tabs */}
          {tab === 'register' && <div className="flex bg-[#111b21] p-1 rounded-xl border border-[#222d34] mt-5">
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                tab === 'register'
                  ? 'bg-[#00a884] text-[#111b21] shadow-md'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                tab === 'login'
                  ? 'bg-[#00a884] text-[#111b21] shadow-md'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          </div>}
        </div>

        {/* Form Body */}
        <div className="auth-card">
          {tab === 'login' && (
            <div className="auth-heading">
              <h2>Secure, accessible sign in</h2>
              <p>Enter your credentials to continue.</p>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* REGISTER TAB FIELDS */}
            {tab === 'register' ? (
              <>
                {/* Avatar Picker with Gallery Upload */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#8696a0] mb-2 uppercase tracking-wider">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="relative">
                      <img
                        src={selectedAvatar}
                        alt="Avatar"
                        className="w-14 h-14 rounded-full bg-[#202c33] border-2 border-[#00a884] p-0.5 object-cover shadow"
                      />
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-[#00a884] animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleAvatarFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="flex items-center gap-1.5 text-xs bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] px-3 py-2 rounded-xl transition border border-[#222d34]"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#00a884]" />
                        <span>Upload from Gallery</span>
                      </button>

                      <button
                        type="button"
                        onClick={generateRandomAvatar}
                        className="p-2 text-xs bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] rounded-xl transition border border-[#222d34]"
                        title="Random bot avatar"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1.5 justify-between">
                    {AVATAR_PRESETS.map((avatar, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`w-9 h-9 rounded-full border-2 transition overflow-hidden bg-[#202c33] ${
                          selectedAvatar === avatar
                            ? 'border-[#00a884] scale-105'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={avatar} alt={`Avatar ${idx}`} className="w-full h-full p-0.5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Username with Live Availability Check */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider">
                      Username (Unique ID)
                    </label>
                    {isCheckingUsername && (
                      <span className="text-[10px] text-[#8696a0] flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin text-[#00a884]" /> Checking...
                      </span>
                    )}
                    {!isCheckingUsername && isUsernameAvailable === true && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Available
                      </span>
                    )}
                    {!isCheckingUsername && isUsernameAvailable === false && (
                      <span className="text-[10px] text-rose-400 flex items-center gap-1 font-medium">
                        <XCircle className="w-3 h-3" /> Already taken
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0] text-sm">@</span>
                    <input
                      type="text"
                      placeholder="john_doe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className={`w-full bg-[#202c33] text-[#e9edef] pl-8 pr-4 py-2.5 rounded-xl border text-sm transition placeholder-[#8696a0]/50 focus:outline-none ${
                        isUsernameAvailable === false
                          ? 'border-rose-500/70 focus:border-rose-500'
                          : isUsernameAvailable === true
                          ? 'border-emerald-500/70 focus:border-emerald-500'
                          : 'border-transparent focus:border-[#00a884]'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-[#8696a0] mt-1">
                    This username will be your unique 1-on-1 contact handle.
                  </p>
                </div>

                {/* Password for Registration */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider">
                      Password
                    </label>
                    <span className="text-[10px] text-[#8696a0]">Min 4 characters</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password with at least one letter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-[#202c33] text-[#e9edef] pl-10 pr-10 py-2.5 rounded-xl border border-transparent focus:border-[#00a884] focus:outline-none text-sm transition placeholder-[#8696a0]/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#e9edef] transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#8696a0] mb-1.5 uppercase tracking-wider">
                    Display Name (Optional)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]" />
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-[#202c33] text-[#e9edef] pl-10 pr-4 py-2.5 rounded-xl border border-transparent focus:border-[#00a884] focus:outline-none text-sm transition placeholder-[#8696a0]/50"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#8696a0] mb-1.5 uppercase tracking-wider">
                    Status / Bio
                  </label>
                  <input
                    type="text"
                    placeholder="Available for 1-on-1 direct chat"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-[#202c33] text-[#e9edef] px-4 py-2 rounded-xl border border-transparent focus:border-[#00a884] focus:outline-none text-xs transition placeholder-[#8696a0]/50"
                  />
                </div>
              </>
            ) : (
              /* SIGN IN TAB FIELDS (USERNAME & PASSWORD) */
              <div className="space-y-4 py-2">
                <div>
                  <label className="auth-label">
                    Email or username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0] text-sm">@</span>
                    <input
                      type="text"
                      placeholder="your_username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                      className="w-full bg-[#202c33] text-[#e9edef] pl-8 pr-4 py-2.5 rounded-xl border border-transparent focus:border-[#00a884] focus:outline-none text-sm transition placeholder-[#8696a0]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="auth-label">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-[#202c33] text-[#e9edef] pl-10 pr-10 py-2.5 rounded-xl border border-transparent focus:border-[#00a884] focus:outline-none text-sm transition placeholder-[#8696a0]/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#e9edef] transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (tab === 'register' && isUsernameAvailable === false)}
              className="auth-submit w-full flex items-center justify-center gap-2 disabled:opacity-50 mt-5"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{tab === 'register' ? 'Create Account & Enter Chat' : 'Continue'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Security / Privacy Badge */}
          {tab === 'login' ? (
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
              }}
              className="auth-switch"
            >
              New to ChatDirect? <span>Create an account</span>
            </button>
          ) : (
            <div className="mt-5 text-center flex items-center justify-center gap-1.5 text-xs text-[#8696a0]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00a884]" />
              <span>Direct 1-on-1 private messaging session</span>
            </div>
          )}
          {tab === 'login' && (
            <div className="auth-private-note">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Your messages stay private.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
