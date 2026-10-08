import React from 'react';
import { UserRole } from '../types';

export type NavTab = 'seekers' | 'churches' | 'chat' | 'crm' | 'analytics' | 'admin';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  urgentCount?: number;
  currentUserRole?: UserRole;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  urgentCount = 4,
  currentUserRole = 'super_admin',
}) => {
  const tabs = [
    {
      id: 'seekers' as NavTab,
      label: 'Seekers',
      icon: 'volunteer_activism',
      allowedRoles: ['super_admin', 'union_admin', 'worker'],
    },
    {
      id: 'churches' as NavTab,
      label: 'Churches',
      icon: 'church',
      allowedRoles: ['super_admin', 'union_admin', 'worker', 'chat_user'],
    },
    {
      id: 'chat' as NavTab,
      label: 'Chat',
      icon: 'chat',
      badge: 'Live',
      allowedRoles: ['super_admin', 'union_admin', 'worker', 'chat_user'],
    },
    {
      id: 'crm' as NavTab,
      label: 'CRM Work',
      icon: 'assignment_turned_in',
      badge: urgentCount > 0 ? urgentCount : undefined,
      allowedRoles: ['super_admin', 'union_admin', 'worker'],
    },
    {
      id: 'analytics' as NavTab,
      label: 'Analytics',
      icon: 'monitoring',
      allowedRoles: ['super_admin', 'union_admin'],
    },
    {
      id: 'admin' as NavTab,
      label: 'Admin',
      icon: 'admin_panel_settings',
      allowedRoles: ['super_admin'],
    },
  ];

  // Filter tabs based on role permissions
  const visibleTabs = tabs.filter(
    (tab) => !tab.allowedRoles || tab.allowedRoles.includes(currentUserRole)
  );

  return (
    <nav className="fixed bottom-0 w-full z-40 pb-safe bg-white/95 backdrop-blur-xl shadow-[0_-2px_12px_rgba(27,54,93,0.08)] border-t border-[#e5eeff]">
      <div className="max-w-4xl mx-auto flex justify-around items-center h-16 px-1">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-w-[50px] sm:min-w-[62px] h-12 rounded-xl transition-all relative ${
                isActive
                  ? 'text-[#002046] font-semibold'
                  : 'text-[#44474e] hover:text-[#0b1c30]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[21px] transition-transform"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {tab.icon}
                </span>
                {tab.badge !== undefined && (
                  <span
                    className={`absolute -top-1 -right-2 min-w-[15px] h-3.5 px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs ${
                      tab.badge === 'Live'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#904d00] text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-none tracking-tight">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0.5 w-5 h-0.5 bg-[#002046] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

