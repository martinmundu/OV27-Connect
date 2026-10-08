import React from 'react';

interface ToastProps {
  message: string | null;
  icon?: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, icon = 'check_circle' }) => {
  if (!message) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#002046] text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 border border-[#87a0cd]/30 animate-in fade-in slide-in-from-top-3 duration-200">
      <span className="material-symbols-outlined text-[#fe932c] text-[20px] shrink-0">
        {icon}
      </span>
      <span className="text-[13px] font-medium leading-snug">{message}</span>
    </div>
  );
};
