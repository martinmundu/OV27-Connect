import React, { useState } from 'react';
import { AppUser } from '../types';
import { logOut, auth, syncUserProfile } from '../firebase';

interface PendingApprovalViewProps {
  user: AppUser;
  onRefreshProfile?: (profile: AppUser) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  user,
  onRefreshProfile,
  showToast,
}) => {
  const [isChecking, setIsChecking] = useState(false);

  const handleSignOut = async () => {
    try {
      await logOut();
      showToast('Signed out of pending account', 'logout');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckApprovalStatus = async () => {
    setIsChecking(true);
    try {
      if (auth.currentUser) {
        // Force refresh ID token to get updated custom claims
        await auth.currentUser.getIdToken(true);
        const profile = await syncUserProfile(auth.currentUser);
        if (profile.approvalStatus === 'approved') {
          showToast('Account approved! Granting access...', 'verified');
          if (onRefreshProfile) {
            onRefreshProfile(profile);
          }
        } else {
          showToast('Account is still under review by Super Admin.', 'hourglass_top');
        }
      }
    } catch (err) {
      console.error('Failed to check approval status:', err);
      showToast('Failed to check status. Please retry.', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#dce9ff] flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Security Badge */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#002046] ring-8 ring-[#eff4ff]/50">
            <span className="material-symbols-outlined text-[42px] text-[#904d00]">
              hourglass_top
            </span>
          </div>
          <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#fe932c] flex items-center justify-center text-white text-[12px] font-bold shadow-xs">
            !
          </span>
        </div>

        {/* Title & Status */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#904d00]">
            Section 20 Access Gate
          </span>
          <h2 className="text-[22px] font-bold text-[#002046]">
            Account Sent for Approval
          </h2>
          <p className="text-[13px] text-[#44474e] leading-snug mt-1">
            Welcome, <strong>{user.displayName || user.email}</strong>.
          </p>
        </div>

        {/* Prominent Approval Notice Banner */}
        <div className="w-full p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-left flex items-start gap-3">
          <span className="material-symbols-outlined text-[24px] text-amber-700 shrink-0 mt-0.5">
            mark_email_read
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-bold text-amber-950">
              Your account is sent for Super Admin approval
            </span>
            <p className="text-[12px] text-amber-900/90 leading-relaxed">
              Login accounts created by users require explicit authorization. The Super Administrator will review your account, designate your enterprise role, and configure the specific system privileges assigned to you.
            </p>
          </div>
        </div>

        {/* Gate Description Box */}
        <div className="w-full bg-[#eff4ff] p-4 rounded-2xl border border-[#dce9ff] text-left flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px] pb-2 border-b border-[#dce9ff]/60">
            <span className="text-[#44474e]">Status:</span>
            <span className="font-bold px-2 py-0.5 rounded-full bg-[#ffdcc3] text-[#6e3900] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#904d00] animate-pulse" />
              <span>Awaiting Super Admin Approval</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pb-2 border-b border-[#dce9ff]/60">
            <span className="text-[#44474e]">Account UID:</span>
            <span className="font-mono text-[10px] text-[#002046]">{user.uid}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#44474e]">Territorial Union:</span>
            <span className="font-bold text-[#002046]">{user.assignedUnion}</span>
          </div>
        </div>

        <p className="text-[12px] text-[#74777f] leading-relaxed">
          Once the Super Administrator assigns your ministerial privileges (such as Pastoral Care CRM, Discipleship Messaging, or Section Roster oversight), this screen will automatically refresh and grant access.
        </p>

        {/* Real Status Check Button */}
        <div className="w-full pt-2 border-t border-[#eff4ff] flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCheckApprovalStatus}
            disabled={isChecking}
            className="w-full py-2.5 px-4 bg-[#002046] hover:bg-[#1b365d] active:scale-[0.99] text-white rounded-xl text-[12px] font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] text-[#ffdcc3] ${isChecking ? 'animate-spin' : ''}`}>
              {isChecking ? 'sync' : 'refresh'}
            </span>
            <span>{isChecking ? 'Checking Claims...' : 'Check Approval Status'}</span>
          </button>
        </div>

        {/* Sign Out Action */}
        <button
          type="button"
          onClick={handleSignOut}
          className="text-[12px] font-semibold text-[#ba1a1a] hover:underline flex items-center gap-1 mt-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          <span>Sign Out / Switch Account</span>
        </button>
      </div>
    </div>
  );
};
