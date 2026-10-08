import React from 'react';
import { UserRole } from '../types';

interface UnauthorizedViewProps {
  attemptedRoute: string;
  userRole: UserRole;
  userUnion: string;
  reason?: string;
  onNavigateHome: () => void;
  onSignOut: () => void;
}

export const UnauthorizedView: React.FC<UnauthorizedViewProps> = ({
  attemptedRoute,
  userRole,
  userUnion,
  reason,
  onNavigateHome,
  onSignOut,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-8 max-w-xl mx-auto text-center">
      {/* Access Denied Shield Emblem */}
      <div className="w-20 h-20 rounded-3xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mb-5 shadow-lg border border-[#ffb4ab]">
        <span
          className="material-symbols-outlined text-[42px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          gpp_bad
        </span>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[12px] font-bold uppercase tracking-wider mb-2">
        <span>403 Forbidden</span>
        <span>•</span>
        <span>Route Protection Intercept</span>
      </div>

      <h2 className="text-[24px] font-bold text-[#ba1a1a] tracking-tight">
        Unauthorized Route Access
      </h2>

      <p className="text-[14px] text-[#44474e] mt-2 leading-relaxed">
        {reason ||
          `Your authenticated role (${userRole.replace('_', ' ').toUpperCase()}) does not hold custom claim permissions to view the "${attemptedRoute}" module.`}
      </p>

      {/* Claim Credentials Inspector */}
      <div className="w-full mt-6 p-4 rounded-2xl bg-white border border-[#c4c6d0]/40 shadow-xs text-left flex flex-col gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#44474e]">
          Evaluated Firebase Claims
        </span>
        <div className="grid grid-cols-2 gap-2 text-[12px] pt-1 border-t border-[#f0f0f5]">
          <div>
            <span className="text-[#74777f]">Active Role:</span>{' '}
            <span className="font-semibold text-[#002046] capitalize">
              {userRole.replace('_', ' ')}
            </span>
          </div>
          <div>
            <span className="text-[#74777f]">Union Territory:</span>{' '}
            <span className="font-semibold text-[#002046]">{userUnion}</span>
          </div>
          <div>
            <span className="text-[#74777f]">Attempted Target:</span>{' '}
            <span className="font-semibold text-[#ba1a1a] font-mono">
              /{attemptedRoute}
            </span>
          </div>
          <div>
            <span className="text-[#74777f]">Section 31 Status:</span>{' '}
            <span className="font-semibold text-[#ba1a1a]">BLOCKED</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full">
        <button
          type="button"
          onClick={onNavigateHome}
          className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#005fb0] hover:bg-[#004787] text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-xs transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">home</span>
          <span>Return to Authorized Dashboard</span>
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full sm:w-auto py-3 px-4 rounded-xl bg-[#f0f0f5] hover:bg-[#e2e2e9] text-[#44474e] font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
