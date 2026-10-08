import React, { useState, useEffect } from 'react';
import { ASSIGNED_TERRITORIAL_UNIONS } from '../types';
import {
  signInWithGoogle,
  signInWithEmail,
  registerWithEmail,
  sendPasswordReset,
  logOut,
} from '../firebase';

interface LoginViewProps {
  onOpenPublicSeeker: () => void;
  showToast: (msg: string, icon?: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onOpenPublicSeeker,
  showToast,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'superadmin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [assignedUnion, setAssignedUnion] = useState('Delhi Metro Region');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Initial Super Admin Bootstrap state
  const [isBootstrapped, setIsBootstrapped] = useState<boolean>(true);
  const [isCheckingBootstrap, setIsCheckingBootstrap] = useState(true);
  const [showBootstrapModal, setShowBootstrapModal] = useState(false);
  const [bootstrapEmail, setBootstrapEmail] = useState('');
  const [bootstrapPassword, setBootstrapPassword] = useState('');
  const [bootstrapName, setBootstrapName] = useState('Super Administrator');
  const [isSubmittingBootstrap, setIsSubmittingBootstrap] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkBootstrap() {
      try {
        const res = await fetch('/api/admin/bootstrap-status');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setIsBootstrapped(Boolean(data.isBootstrapped));
          }
        }
      } catch (err) {
        // ignore
      } finally {
        if (isMounted) setIsCheckingBootstrap(false);
      }
    }
    checkBootstrap();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleExecuteBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bootstrapEmail.trim() || !bootstrapPassword) {
      setBootstrapError('Please enter both admin email and password.');
      return;
    }
    if (bootstrapPassword.length < 6) {
      setBootstrapError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmittingBootstrap(true);
    setBootstrapError(null);

    try {
      const response = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: bootstrapEmail.trim(),
          password: bootstrapPassword,
          displayName: bootstrapName.trim() || 'Super Administrator',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Super Admin bootstrap failed.');
      }

      setIsBootstrapped(true);
      setShowBootstrapModal(false);
      setEmail(bootstrapEmail.trim());
      setPassword(bootstrapPassword);
      setAuthMode('superadmin');
      showToast('Super Admin provisioned with verified Custom Claims! Please sign in.', 'verified');
    } catch (err: any) {
      console.error('[Bootstrap Error]:', err);
      setBootstrapError(err.message || 'Failed to provision initial Super Admin.');
    } finally {
      setIsSubmittingBootstrap(false);
    }
  };

  const formatFirebaseError = (err: any): string => {
    const code = err?.code || '';
    const msg = err?.message || '';

    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. Please verify your credentials.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup was closed before completing.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network connection issue. Please check your internet connection.';
    }
    return msg || 'Authentication error. Please retry.';
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setAuthError('Please enter your email address above to receive a password reset link.');
      return;
    }
    setIsSendingReset(true);
    setAuthError(null);
    try {
      await sendPasswordReset(email.trim());
      showToast(`Password reset link sent to ${email.trim()}`, 'mark_email_read');
    } catch (err: any) {
      console.error('Password reset failure:', err);
      const friendlyMsg = formatFirebaseError(err);
      setAuthError(friendlyMsg);
      showToast(friendlyMsg, 'error');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email.trim() || !password) {
      setAuthError('Please enter both your email address and password.');
      return;
    }

    if (authMode === 'register' && !displayName.trim()) {
      setAuthError('Please enter your full name for ministry records.');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setIsLoadingEmail(true);

    try {
      if (authMode === 'superadmin') {
        const user = await signInWithEmail(email, password);
        if (user) {
          // Force fresh ID token and verify Custom Claims
          const idTokenResult = await user.getIdTokenResult(true);
          const role = idTokenResult.claims.role;
          const approved = idTokenResult.claims.approved === true;

          if (role !== 'super_admin' || !approved) {
            await logOut();
            setAuthError(
              'Your account is authenticated, but it has not been approved for Super Admin access. Please contact the system administrator.'
            );
            return;
          }

          showToast(`Welcome Super Admin, ${user.displayName || user.email}`, 'verified_user');
        }
      } else if (authMode === 'signin') {
        const user = await signInWithEmail(email, password);
        if (user) {
          showToast(`Welcome back, ${user.displayName || user.email}`, 'verified_user');
        }
      } else {
        const user = await registerWithEmail(email, password, displayName, assignedUnion);
        if (user) {
          showToast('Account created and sent for Super Admin approval!', 'mark_email_read');
        }
      }
    } catch (err: any) {
      console.error('Email authentication failure:', err);
      const friendlyMsg = formatFirebaseError(err);
      setAuthError(friendlyMsg);
      showToast(friendlyMsg, 'error');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    setAuthError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        if (authMode === 'superadmin') {
          // Force fresh ID token and verify Custom Claims
          const idTokenResult = await user.getIdTokenResult(true);
          const role = idTokenResult.claims.role;
          const approved = idTokenResult.claims.approved === true;

          if (role !== 'super_admin' || !approved) {
            await logOut();
            setAuthError(
              'Your account is authenticated, but it has not been approved for Super Admin access. Please contact the system administrator.'
            );
            return;
          }
          showToast(`Welcome Super Admin, ${user.displayName || user.email}`, 'verified_user');
        } else {
          showToast(`Authenticated as ${user.displayName || user.email}`, 'verified_user');
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      const friendlyMsg = formatFirebaseError(err);
      setAuthError(friendlyMsg);
      showToast('Firebase Authentication error. Please retry.', 'error');
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071326] text-white flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background Sacred Geometric Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[#1b365d]/50 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-[#904d00]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-[#005fb0]/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-5">
        {/* NIU Emblem Header */}
        <div className="flex flex-col items-center text-center gap-2.5">
          <div className="w-15 h-15 rounded-2xl bg-gradient-to-br from-[#904d00] to-[#ffdcc3] p-0.5 shadow-xl flex items-center justify-center">
            <div className="w-full h-full bg-[#071326] rounded-[14px] flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[30px] text-[#ffdcc3]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                church
              </span>
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#1b365d] border border-[#d3e4fe]/15 text-[#d3e4fe] text-[11px] font-semibold tracking-wider uppercase mb-1">
              <span>Northern India Union</span>
              <span>•</span>
              <span className="text-[#ffdcc3]">One Voice 27</span>
            </div>
            <h1 className="text-[24px] font-bold tracking-tight text-white">
              OneVoice27 Connect
            </h1>
            <p className="text-[12px] text-[#8e9099] mt-0.5">
              Seventh-day Adventist Digital Ministry Platform &amp; Pastoral Roster
            </p>
          </div>
        </div>

        {/* Initial Super Admin Setup Required Banner */}
        {!isBootstrapped && !isCheckingBootstrap && (
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-400/50 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3 min-w-0">
              <span className="material-symbols-outlined text-[28px] text-amber-300 shrink-0">
                admin_panel_settings
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold text-amber-200">
                  Initial Setup Required: No Super Admin Provisioned
                </span>
                <span className="text-[11px] text-[#c4c6d0] truncate">
                  Configure trusted first-time Super Admin using Firebase Admin SDK bootstrap.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowBootstrapModal(true);
                setBootstrapError(null);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#071326] font-bold text-[12px] shrink-0 transition-colors shadow-sm cursor-pointer"
            >
              Initialize Admin
            </button>
          </div>
        )}

        {/* Main Authentication Card */}
        <div className="bg-[#0b1c30]/95 border border-[#44474e]/30 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
          {/* Auth Mode Toggle Tabs (Sign In vs Super Admin vs Register) */}
          <div className="grid grid-cols-3 p-1 bg-[#071326] rounded-xl border border-white/10 text-center">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setAuthError(null);
              }}
              className={`py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                authMode === 'signin'
                  ? 'bg-[#1b365d] text-white shadow-xs'
                  : 'text-[#8e9099] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">login</span>
              <span>Staff Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('superadmin');
                setAuthError(null);
              }}
              className={`py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                authMode === 'superadmin'
                  ? 'bg-[#904d00] text-white shadow-xs'
                  : 'text-[#8e9099] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">shield_person</span>
              <span>Super Admin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError(null);
              }}
              className={`py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                authMode === 'register'
                  ? 'bg-[#1b365d] text-white shadow-xs'
                  : 'text-[#8e9099] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">person_add</span>
              <span>Register</span>
            </button>
          </div>

          {/* Section 20 Compliance Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#071326]/80 border border-amber-400/20 text-[11px] text-[#c4c6d0]">
            <span className="material-symbols-outlined text-[18px] text-[#ffdcc3] shrink-0 mt-0.5">
              {authMode === 'superadmin' ? 'security' : authMode === 'signin' ? 'verified_user' : 'how_to_reg'}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[#ffdcc3]">
                {authMode === 'superadmin'
                  ? 'Super Admin Synod Console'
                  : authMode === 'signin'
                  ? 'Secured Ministry Access'
                  : 'Super Admin Approval Mandatory'}
              </span>
              <span>
                {authMode === 'superadmin'
                  ? 'Authorization strictly derived from verified Firebase Custom Claims (role: "super_admin", approved: true).'
                  : authMode === 'signin'
                  ? 'Roles, territory scopes, and privileges are validated via Synod claims.'
                  : 'If you create an account, it is sent for approval to the Super Admin who determines and assigns your ministerial privileges.'}
              </span>
            </div>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-[#93000a]/30 border border-[#ffb4ab]/40 text-[#ffb4ab] text-[12px] flex items-start gap-2 animate-in fade-in duration-150">
              <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
              <span>{authError}</span>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
            {authMode === 'register' && (
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-[#d3e4fe]">
                  Full Name / Title
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#071326] border border-[#44474e]/50 text-white placeholder:text-[#8e9099] text-[13px] focus:outline-none focus:border-[#ffdcc3]"
                  />
                  <span className="material-symbols-outlined text-[18px] text-[#8e9099] absolute left-2.5 top-2.5">
                    badge
                  </span>
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold text-[#d3e4fe]">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="worker@niu-sda.org"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#071326] border border-[#44474e]/50 text-white placeholder:text-[#8e9099] text-[13px] focus:outline-none focus:border-[#ffdcc3]"
                />
                <span className="material-symbols-outlined text-[18px] text-[#8e9099] absolute left-2.5 top-2.5">
                  mail
                </span>
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold text-[#d3e4fe]">
                  Password
                </label>
                {authMode === 'register' && (
                  <span className="text-[10px] text-[#8e9099]">Min. 6 characters</span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-9 pr-10 rounded-xl bg-[#071326] border border-[#44474e]/50 text-white placeholder:text-[#8e9099] text-[13px] focus:outline-none focus:border-[#ffdcc3]"
                />
                <span className="material-symbols-outlined text-[18px] text-[#8e9099] absolute left-2.5 top-2.5">
                  lock
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-[#8e9099] hover:text-white"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {authMode === 'signin' && (
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isSendingReset}
                    className="text-[11px] text-[#ffdcc3] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {isSendingReset ? 'Sending reset link...' : 'Forgot password?'}
                  </button>
                </div>
              )}
            </div>

            {/* Union Selection for Registration */}
            {authMode === 'register' && (
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-[#d3e4fe]">
                  Assigned Territorial Union
                </label>
                <div className="relative">
                  <select
                    value={assignedUnion}
                    onChange={(e) => setAssignedUnion(e.target.value)}
                    className="w-full h-10 pl-9 pr-8 rounded-xl bg-[#071326] border border-[#44474e]/50 text-white text-[13px] focus:outline-none focus:border-[#ffdcc3] appearance-none"
                  >
                    {ASSIGNED_TERRITORIAL_UNIONS.map((union) => (
                      <option key={union} value={union}>
                        {union}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-[18px] text-[#8e9099] absolute left-2.5 top-2.5 pointer-events-none">
                    location_on
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-[#8e9099] absolute right-2.5 top-2.5 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
            )}

            {/* Submit Email Button */}
            <button
              type="submit"
              disabled={isLoadingEmail || isLoadingGoogle}
              className={`w-full mt-2 py-2.5 px-4 rounded-xl active:scale-[0.99] font-bold text-[13px] text-white flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-60 cursor-pointer ${
                authMode === 'superadmin' ? 'bg-[#904d00] hover:bg-[#b05f00]' : 'bg-[#005fb0] hover:bg-[#004787]'
              }`}
            >
              {isLoadingEmail ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>
                    {authMode === 'superadmin'
                      ? 'Verifying Super Admin Claims...'
                      : authMode === 'signin'
                      ? 'Authenticating...'
                      : 'Registering Account...'}
                  </span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">
                    {authMode === 'superadmin' ? 'shield_person' : authMode === 'signin' ? 'login' : 'how_to_reg'}
                  </span>
                  <span>
                    {authMode === 'superadmin'
                      ? 'Sign In as Super Admin'
                      : authMode === 'signin'
                      ? 'Sign In with Email'
                      : 'Create Ministry Account'}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-0.5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] font-bold tracking-wider text-[#8e9099] uppercase">
              Or Continue With
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoadingGoogle || isLoadingEmail}
            className="w-full py-2.5 px-4 rounded-xl bg-white text-[#0b1c30] hover:bg-[#e2e2e9] active:scale-[0.99] font-semibold text-[13px] flex items-center justify-center gap-2.5 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {isLoadingGoogle ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0b1c30] border-t-transparent rounded-full animate-spin" />
                <span>Verifying Google Auth...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>
                  {authMode === 'superadmin' ? 'Continue with Google as Super Admin' : 'Continue with Google'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Public Seeker Option */}
        <div className="flex flex-col items-center text-center gap-1.5 pt-1">
          <p className="text-[12px] text-[#8e9099]">
            Spiritual seeker looking for Sabbath fellowship, Bible guides, or prayer?
          </p>
          <button
            type="button"
            onClick={onOpenPublicSeeker}
            className="text-[13px] font-semibold text-[#ffdcc3] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open Public Seeker Connect</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        {/* Footer Section */}
        <div className="text-center text-[11px] text-[#8e9099]/80 flex flex-col gap-0.5">
          <span>Northern India Union Section 20 &amp; 31 Data Protection Act Compliant</span>
          <span>Encrypted Ministry Database • Tamper-Evident Audit Logging</span>
        </div>
      </div>

      {/* Initial Super Admin Bootstrap Modal Dialog */}
      {showBootstrapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0b1c30] border border-amber-400/40 rounded-3xl p-6 shadow-2xl text-white flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-white">Initial Super Admin Bootstrap</h3>
                  <p className="text-[11px] text-[#8e9099]">One-time server provisioning via Firebase Admin SDK</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBootstrapModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#8e9099] hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-[12px] text-[#c4c6d0] leading-relaxed">
              This will authorize and configure the first <strong>Super Administrator</strong> with verified Firebase Custom Claims (<code className="text-amber-300">role: "super_admin"</code>, <code className="text-amber-300">approved: true</code>) and write an immutable Section 31 audit log.
            </p>

            {bootstrapError && (
              <div className="p-3 rounded-xl bg-[#93000a]/40 border border-[#ffb4ab]/40 text-[#ffb4ab] text-[12px] flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
                <span>{bootstrapError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteBootstrap} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-[#d3e4fe]">Administrator Name</label>
                <input
                  type="text"
                  required
                  value={bootstrapName}
                  onChange={(e) => setBootstrapName(e.target.value)}
                  placeholder="Super Administrator"
                  className="w-full h-10 px-3 rounded-xl bg-[#071326] border border-[#44474e]/50 text-white text-[13px] focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-[#d3e4fe]">Admin Email</label>
                <input
                  type="email"
                  required
                  value={bootstrapEmail}
                  onChange={(e) => setBootstrapEmail(e.target.value)}
                  placeholder="admin@niu-sda.org"
                  className="w-full h-10 px-3 rounded-xl bg-[#071326] border border-[#44474e]/50 text-white text-[13px] focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-[#d3e4fe]">Password (min. 6 characters)</label>
                <input
                  type="password"
                  required
                  value={bootstrapPassword}
                  onChange={(e) => setBootstrapPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-xl bg-[#071326] border border-[#44474e]/50 text-white text-[13px] focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBootstrapModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-[13px] font-semibold text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBootstrap}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#071326] text-[13px] font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-60 cursor-pointer"
                >
                  {isSubmittingBootstrap ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#071326] border-t-transparent rounded-full animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Provision Super Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
