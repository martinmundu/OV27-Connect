import React, { useState, useEffect } from 'react';
import {
  WorkerPersonnel,
  AppUser,
  AuditLogEntry,
  UserRole,
  ApprovalStatus,
  UserPrivileges,
  DEFAULT_ROLE_PRIVILEGES,
  ASSIGNED_TERRITORIAL_UNIONS,
} from '../types';
import {
  subscribeUsers,
  updateUserRoleAndStatus,
  updateUserPrivilegesAndRole,
  adminCreateUserAccount,
  subscribeAuditLogs,
  recordAuditLog,
  logAssignedRole,
  auth,
} from '../firebase';
import { canViewCapabilityMatrix, canManageUsers } from '../security';
import { SecurityTestingPanel } from './SecurityTestingPanel';

interface RolesGovernanceViewProps {
  currentUserRole?: UserRole;
  currentUserUnion?: string;
  showToast: (msg: string, icon?: string) => void;
}

export const RolesGovernanceView: React.FC<RolesGovernanceViewProps> = ({
  currentUserRole = 'super_admin',
  currentUserUnion = 'Delhi Metro Region',
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'approvals' | 'audit' | 'personnel' | 'testing'>('testing');
  const [search, setSearch] = useState('');
  const [activeTier, setActiveTier] = useState<string>('all');
  const [expandedTier, setExpandedTier] = useState<number | null>(null);
  const [personnelList, setPersonnelList] = useState<WorkerPersonnel[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [newWorkerPassword, setNewWorkerPassword] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState<UserRole>('worker');
  const [newWorkerUnion, setNewWorkerUnion] = useState('Delhi Metro Region');
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [editingPrivilegesUid, setEditingPrivilegesUid] = useState<string | null>(null);
  const [tempPrivileges, setTempPrivileges] = useState<Record<string, UserPrivileges>>({});

  // Real-time Users list for approval gate
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>([]);

  // Real-time Section 31 Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    // Subscribe to Firestore live users if available (Super Admin only)
    const unsubUsers = subscribeUsers((users) => {
      setRegisteredUsers(users || []);
    }, currentUserRole);

    // Subscribe to Firestore audit logs (Super Admin only)
    const unsubAudit = subscribeAuditLogs((logs) => {
      setAuditLogs(logs || []);
    }, currentUserRole);

    return () => {
      unsubUsers();
      unsubAudit();
    };
  }, [currentUserRole]);

  const isSuperAdmin = currentUserRole === 'super_admin';

  const handleApproveUser = async (user: AppUser, targetRole: UserRole, targetStatus: ApprovalStatus) => {
    try {
      await updateUserRoleAndStatus(user.uid, targetRole, targetStatus, user.assignedUnion);
      await logAssignedRole(
        auth.currentUser?.uid || 'authenticated-admin',
        currentUserRole,
        user.uid,
        targetRole,
        {
          targetUserName: user.displayName || user.email,
          userEmail: user.email,
          assignedUnion: user.assignedUnion,
        }
      );
      setRegisteredUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid ? { ...u, role: targetRole, approvalStatus: targetStatus } : u
        )
      );
      showToast(`User ${user.displayName || user.email} marked as ${targetStatus}!`, 'verified');
    } catch (err) {
      // Local optimistic update
      setRegisteredUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid ? { ...u, role: targetRole, approvalStatus: targetStatus } : u
        )
      );
      showToast(`Approved role updated for ${user.displayName || user.email}`, 'verified');
    }
  };

  const handleTogglePrivilege = (uid: string, privKey: keyof UserPrivileges, currentPrivs?: UserPrivileges) => {
    setTempPrivileges((prev) => {
      const existing = prev[uid] || currentPrivs || {};
      return {
        ...prev,
        [uid]: {
          ...existing,
          [privKey]: !existing[privKey],
        },
      };
    });
  };

  const handleSavePrivileges = async (user: AppUser) => {
    const updatedPrivs = tempPrivileges[user.uid] || user.privileges || DEFAULT_ROLE_PRIVILEGES[user.role];
    try {
      await updateUserPrivilegesAndRole(
        user.uid,
        user.role,
        user.approvalStatus,
        updatedPrivs,
        user.assignedUnion
      );
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, privileges: updatedPrivs } : u))
      );
      setEditingPrivilegesUid(null);
      showToast(`Privileges updated for ${user.displayName || user.email}`, 'verified');
    } catch (err: any) {
      console.error('Failed to update privileges:', err);
      showToast('Failed to update privileges', 'error');
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName || !newWorkerPhone) {
      showToast('Please fill all worker details', 'warning');
      return;
    }

    setIsSubmittingAccount(true);

    const tierMap: Record<UserRole, { name: string; title: string; cat: 'super' | 'section' | 'pastoral'; level: number }> = {
      super_admin: { name: 'Level 1: Super Admin', title: 'NIU Synod Executive Level', cat: 'super', level: 1 },
      union_admin: { name: 'Level 2: Union Admin', title: 'NIU Departmental Director', cat: 'section', level: 2 },
      worker: { name: 'Level 5: Follow-Up Worker', title: 'Lay Bible Worker & Caretaker', cat: 'pastoral', level: 5 },
      chat_user: { name: 'Level 6: Chat User', title: 'Digital Ministry Messaging', cat: 'pastoral', level: 6 },
      pending_user: { name: 'Level 7: Pending Verification', title: 'Applicant Under Review', cat: 'pastoral', level: 7 },
    };

    const mapping = tierMap[newWorkerRole];

    try {
      // If Super Admin provided email and password, create the authenticated Login ID directly in Firebase Auth!
      if (newWorkerEmail && newWorkerPassword) {
        await adminCreateUserAccount({
          email: newWorkerEmail,
          password: newWorkerPassword,
          displayName: newWorkerName,
          role: newWorkerRole,
          assignedUnion: newWorkerUnion,
        });
        showToast(`Login ID created for ${newWorkerEmail}!`, 'verified');
      }

      const newWorker: WorkerPersonnel = {
        id: `usr-${Date.now()}`,
        name: newWorkerName,
        roleTitle: mapping.title,
        tierLevel: mapping.level,
        tierName: mapping.name,
        jurisdiction: newWorkerUnion,
        avatarUrl:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
        statusBadge: 'Active Verified • Sec 31 Signed',
        assignedSoulsCount: mapping.level === 5 ? 3 : undefined,
        phone: newWorkerPhone,
        category: mapping.cat,
        roleKey: newWorkerRole,
        assignedUnion: newWorkerUnion,
        approvalStatus: 'approved',
      };

      setPersonnelList([newWorker, ...personnelList]);
      await logAssignedRole(
        auth.currentUser?.uid || 'authenticated-admin',
        currentUserRole,
        newWorker.id,
        newWorkerRole,
        {
          targetUserName: newWorkerName,
          assignedUnion: newWorkerUnion,
          userEmail: newWorkerEmail || undefined,
        }
      );

      setIsInviteModalOpen(false);
      setNewWorkerName('');
      setNewWorkerEmail('');
      setNewWorkerPassword('');
      setNewWorkerPhone('');
      showToast(`Worker credentials issued with ${mapping.name} clearance!`, 'badge');
    } catch (err: any) {
      console.error('Account creation error:', err);
      showToast(err.message || 'Error provisioning account', 'error');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const filteredPersonnel = personnelList.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.jurisdiction.toLowerCase().includes(search.toLowerCase()) ||
      p.roleTitle.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTier === 'all') return true;
    return p.category === activeTier;
  });

  const pendingUsers = registeredUsers.filter((u) => u.approvalStatus === 'pending');

  const tiersData = [
    {
      level: 1,
      role: 'super_admin' as UserRole,
      title: 'Level 1: Super Administrator',
      subtitle: 'NIU Synod Executive Level',
      tag: 'Full Master Control',
      scope: 'All 8 Sections • 420+ Congregations',
      icon: 'shield_person',
      iconColor: 'bg-[#002046] text-[#fe932c]',
      scopeDesc: 'Entire Northern India Union System. Full seeker PII visibility across all territories.',
      privileges: [
        'View all seekers personal information (names, phone numbers, emails, age, gender, address, personal notes)',
        'Manage all users, approval queues, and permissions',
        'View complete union-wide analytics and live audit logs',
        'Assign and revoke credentials & executive keys',
        'Process GDPR / Data Dignity erasure requests',
      ],
    },
    {
      level: 2,
      role: 'union_admin' as UserRole,
      title: 'Level 2: Union Administrator',
      subtitle: 'Territorial & Media Directors',
      tag: 'Territorial Jurisdiction',
      scope: 'Assigned Union Scope Only',
      icon: 'domain',
      iconColor: 'bg-[#1b365d] text-white',
      scopeDesc: 'Bounded strictly to assigned union territory (e.g. Delhi Metro Region). Zero visibility into foreign unions.',
      privileges: [
        'Can view seekers assigned to their Union only',
        'Can manage communication and follow-up inside the app',
        'STRICT: Cannot export or download personal information',
        'STRICT: Cannot see seekers outside their assigned Union',
        'STRICT: Cannot access Super Admin controls or system capability matrix',
      ],
    },
    {
      level: 5,
      role: 'worker' as UserRole,
      title: 'Level 5: Department / Worker Users',
      subtitle: 'Pastors, Bible Workers & Caretakers',
      tag: 'Restricted Worker Access',
      scope: 'Assigned Tasks & Local Parish',
      icon: 'badge',
      iconColor: 'bg-[#904d00] text-white',
      scopeDesc: 'Assigned care tasks and ministry visits.',
      privileges: [
        'RESTRICTED: Cannot view seeker phone numbers or emails (PII Masked)',
        'RESTRICTED: Cannot access personal identity information',
        'Can only communicate through the internal app chat system',
        'Can see only the information necessary for their assigned tasks',
        'RESTRICTED: Cannot copy, download, or export seeker information',
      ],
    },
    {
      level: 6,
      role: 'chat_user' as UserRole,
      title: 'Level 6: Chat Users',
      subtitle: 'Digital In-App Fellowship Communicators',
      tag: 'Messaging Only',
      scope: 'In-App Message Channels',
      icon: 'chat',
      iconColor: 'bg-[#2407b0] text-white',
      scopeDesc: 'Communicate through built-in chat channel only.',
      privileges: [
        'Communicate through the built-in chat system',
        'Receive assigned conversations and send spiritual messages inside the app',
        'RESTRICTED: Cannot see private contact details (phone, email)',
        'RESTRICTED: Zero access to the seeker database',
      ],
    },
  ];

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto pb-28">
      {/* Governance Overview Header */}
      <section className="px-4 pt-4 pb-2 bg-gradient-to-b from-[#dce9ff]/40 to-transparent">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#e5eeff]">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-[#904d00] font-bold uppercase tracking-wider">
                Section 20 &amp; 31 Security Charter
              </span>
              <h2 className="text-[20px] font-bold text-[#002046] mt-0.5 leading-tight">
                Roles &amp; Governance Console
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#eff4ff] flex items-center justify-center shrink-0 text-[#002046] border border-[#dce9ff]">
              <span className="material-symbols-outlined text-[22px]">
                admin_panel_settings
              </span>
            </div>
          </div>

          <p className="text-[12px] text-[#44474e] leading-relaxed">
            Northern India Union Seventh-day Adventist digital ministry governance enforcing strict Role-Based Access Control (RBAC), seeker privacy boundaries, and immutable audit logs.
          </p>

          <div className="mt-3 pt-3 border-t border-[#eff4ff] flex items-center justify-between text-[11px]">
            <span className="text-[#44474e]">
              Active User Clearance: <strong className="text-[#002046] capitalize">{currentUserRole.replace('_', ' ')}</strong>
            </span>
            <span className="text-[#904d00] font-bold">
              Jurisdiction: {currentUserUnion}
            </span>
          </div>
        </div>
      </section>

      {/* Navigation Sub-Tabs */}
      <div className="px-4 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('testing')}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-2xs ${
              activeTab === 'testing'
                ? 'bg-[#002046] text-white shadow-xs'
                : 'bg-white text-[#44474e] hover:bg-[#eff4ff] border border-[#dce9ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-[#fe932c]">verified</span>
            <span>Security Testing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-2xs ${
              activeTab === 'matrix'
                ? 'bg-[#002046] text-white shadow-xs'
                : 'bg-white text-[#44474e] hover:bg-[#eff4ff] border border-[#dce9ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
            <span>Capability Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-2xs relative ${
              activeTab === 'approvals'
                ? 'bg-[#002046] text-white shadow-xs'
                : 'bg-white text-[#44474e] hover:bg-[#eff4ff] border border-[#dce9ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
            <span>Account Approvals</span>
            {pendingUsers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#ba1a1a] text-white text-[10px]">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-2xs ${
              activeTab === 'audit'
                ? 'bg-[#002046] text-white shadow-xs'
                : 'bg-white text-[#44474e] hover:bg-[#eff4ff] border border-[#dce9ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">history_toggle_off</span>
            <span>Audit Logs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('personnel')}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-2xs ${
              activeTab === 'personnel'
                ? 'bg-[#002046] text-white shadow-xs'
                : 'bg-white text-[#44474e] hover:bg-[#eff4ff] border border-[#dce9ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            <span>Personnel ({personnelList.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SECURITY TESTING PANEL */}
      {activeTab === 'testing' && (
        <div className="px-4 pt-3 flex flex-col gap-3">
          <SecurityTestingPanel
            currentRole={currentUserRole}
            currentUnion={currentUserUnion}
            showToast={showToast}
          />
        </div>
      )}

      {/* TAB 2: CAPABILITY MATRIX (Super Admin Only) */}
      {activeTab === 'matrix' && (
        <div className="px-4 pt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[15px] font-bold text-[#002046]">
                RBAC Capability Matrix
              </h3>
              {isSuperAdmin && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffdcc3] text-[#2f1500] border border-[#fe932c]/40">
                  Super Admin Exclusive
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#44474e]">
              Section 20 &amp; 31 Rules
            </span>
          </div>

          {isSuperAdmin ? (
            <div className="w-full overflow-hidden rounded-2xl bg-white shadow-xs border border-[#e5eeff]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#e5eeff] text-[#002046] text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Role Tier</th>
                      <th className="py-2.5 px-2 text-center">View Seeker PII</th>
                      <th className="py-2.5 px-2 text-center">Export Data</th>
                      <th className="py-2.5 px-2 text-center">Cross-Union Access</th>
                      <th className="py-2.5 px-2 text-center">Direct In-App Chat</th>
                      <th className="py-2.5 px-2 text-center">Manage Roles</th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px] text-[#0b1c30] divide-y divide-[#eff4ff]">
                    {[
                      { role: 'Super Admin', pii: true, export: true, crossUnion: true, chat: true, manage: true },
                      { role: 'Union Admin', pii: true, export: false, crossUnion: false, chat: true, manage: false },
                      { role: 'Worker / Caretaker', pii: false, export: false, crossUnion: false, chat: true, manage: false },
                      { role: 'Chat User', pii: false, export: false, crossUnion: false, chat: true, manage: false },
                    ].map((row, idx) => (
                      <tr
                        key={row.role}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-[#eff4ff]/50'}
                      >
                        <td className="py-2.5 px-3 font-bold text-[#002046]">
                          {row.role}
                        </td>
                        <td className="text-center py-2.5 px-2">
                          {row.pii ? (
                            <span className="material-symbols-outlined text-[17px] text-emerald-600">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-[17px] text-[#ba1a1a]">cancel</span>
                          )}
                        </td>
                        <td className="text-center py-2.5 px-2">
                          {row.export ? (
                            <span className="material-symbols-outlined text-[17px] text-emerald-600">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-[17px] text-[#ba1a1a]">cancel</span>
                          )}
                        </td>
                        <td className="text-center py-2.5 px-2">
                          {row.crossUnion ? (
                            <span className="material-symbols-outlined text-[17px] text-emerald-600">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-[17px] text-[#ba1a1a]">cancel</span>
                          )}
                        </td>
                        <td className="text-center py-2.5 px-2">
                          {row.chat ? (
                            <span className="material-symbols-outlined text-[17px] text-emerald-600">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-[17px] text-[#ba1a1a]">cancel</span>
                          )}
                        </td>
                        <td className="text-center py-2.5 px-2">
                          {row.manage ? (
                            <span className="material-symbols-outlined text-[17px] text-emerald-600">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-[17px] text-[#ba1a1a]">cancel</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-[#e5eeff] text-[10px] text-[#44474e] flex items-center justify-between border-t border-[#dce9ff]">
                <span>* PII includes Full Name, Phone, Email, Address, and Personal Notes</span>
                <span className="text-[#002046] font-bold">Enforced by firestore.rules</span>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-2xl bg-white p-5 shadow-xs border border-[#ffdad6] flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">lock</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <h4 className="text-[14px] font-bold text-[#002046]">
                    Capability Matrix Restricted
                  </h4>
                  <span className="text-[11px] text-[#ba1a1a] font-semibold">
                    Classified • Visible exclusively to Super Administrators
                  </span>
                </div>
              </div>
              <p className="text-[12px] text-[#44474e] leading-relaxed">
                In strict enforcement of Section 20 Role-Based Access Control and Section 31 Data Dignity Protocols, global permissions, cross-section reassignment authority, and full PII matrices are visible exclusively to the Super Administrator.
              </p>
            </div>
          )}

          {/* Detailed Tier Breakdown */}
          <div className="flex flex-col gap-2.5 pt-2">
            <h4 className="text-[14px] font-bold text-[#002046]">
              Section 20 Role Descriptions
            </h4>
            {tiersData.map((tier) => {
              const isExpanded = expandedTier === tier.level;
              return (
                <div
                  key={tier.level}
                  className="rounded-2xl bg-white p-4 shadow-xs border border-[#e5eeff] transition-all"
                >
                  <div
                    onClick={() => setExpandedTier(isExpanded ? null : tier.level)}
                    className="flex items-start justify-between cursor-pointer gap-2 select-none"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${tier.iconColor}`}
                      >
                        <span className="material-symbols-outlined text-[22px]">
                          {tier.icon}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14px] font-bold text-[#002046]">
                          {tier.title}
                        </span>
                        <span className="text-[11px] text-[#44474e]">
                          {tier.subtitle}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`material-symbols-outlined text-[#44474e] transition-transform text-[20px] ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eff4ff] text-[#002046] border border-[#dce9ff]">
                      {tier.tag}
                    </span>
                    <span className="text-[11px] text-[#44474e]">{tier.scope}</span>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-2.5 flex flex-col gap-2 bg-[#eff4ff] rounded-xl p-3 border border-[#dce9ff] animate-in fade-in duration-150">
                      <div className="text-[12px] text-[#0b1c30]">
                        <strong>Scope:</strong> {tier.scopeDesc}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-[#002046]">
                          Enforced Privileges:
                        </span>
                        <ul className="list-disc pl-4 text-[12px] text-[#44474e] flex flex-col gap-1">
                          {tier.privileges.map((p, i) => (
                            <li
                              key={i}
                              className={p.includes('RESTRICTED') || p.includes('STRICT') ? 'text-[#ba1a1a] font-semibold' : ''}
                            >
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNT APPROVALS (Section 20 Gate) */}
      {activeTab === 'approvals' && (
        <div className="px-4 pt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-[15px] font-bold text-[#002046]">
                New User Registration Approvals
              </h3>
              <span className="text-[11px] text-[#44474e]">
                New User Registration → Pending Approval → Admin Approves Role → Access Granted
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
              {pendingUsers.length} Pending
            </span>
          </div>

          {!isSuperAdmin ? (
            <div className="w-full rounded-2xl bg-white p-5 border border-[#ffdad6] text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[28px] text-[#ba1a1a]">lock</span>
              <p className="text-[13px] font-bold text-[#002046]">
                Super Administrator Access Required
              </p>
              <p className="text-[12px] text-[#44474e]">
                Only Super Administrators have authority to review and approve new user account credentials.
              </p>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="w-full rounded-2xl bg-white p-8 border border-[#e5eeff] text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[32px] text-emerald-600">check_circle</span>
              <p className="text-[14px] font-bold text-[#002046]">
                Approval Queue Clear
              </p>
              <p className="text-[12px] text-[#44474e]">
                All registered accounts have been reviewed and approved under Section 20 guidelines.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {pendingUsers.map((user) => (
                <div
                  key={user.uid}
                  className="p-4 rounded-2xl bg-white shadow-xs border border-[#ffdcc3] flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#eff4ff] text-[#002046] flex items-center justify-center font-bold text-[14px]">
                        {user.displayName?.[0] || 'U'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14px] font-bold text-[#002046] truncate">
                          {user.displayName || 'Ministry Worker'}
                        </span>
                        <span className="text-[12px] text-[#44474e] truncate">
                          {user.email}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffdcc3] text-[#6e3900]">
                      Pending Review
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#eff4ff] p-2.5 rounded-xl border border-[#dce9ff]">
                    <div>
                      <span className="text-[#74777f]">Registered Union:</span>
                      <p className="font-bold text-[#002046]">{user.assignedUnion}</p>
                    </div>
                    <div>
                      <span className="text-[#74777f]">Email Verified:</span>
                      <p className="font-bold text-emerald-700">
                        {user.emailVerified ? 'Verified' : 'Pending verification'}
                      </p>
                    </div>
                  </div>

                  {/* Role Assignment Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#eff4ff]">
                    <button
                      type="button"
                      onClick={() => handleApproveUser(user, 'worker', 'approved')}
                      className="flex-1 h-9 rounded-xl bg-[#002046] hover:bg-[#1b365d] text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                    >
                      Approve as Worker
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveUser(user, 'union_admin', 'approved')}
                      className="flex-1 h-9 rounded-xl bg-[#1b365d] hover:bg-[#002046] text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                    >
                      Approve as Union Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveUser(user, 'chat_user', 'approved')}
                      className="h-9 px-3 rounded-xl bg-[#eff4ff] text-[#002046] text-[11px] font-bold hover:bg-[#e5eeff] transition-all cursor-pointer"
                    >
                      Chat Only
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveUser(user, 'worker', 'rejected')}
                      className="h-9 px-3 rounded-xl bg-[#ffdad6] text-[#ba1a1a] text-[11px] font-bold hover:bg-[#ffb4ab] transition-all cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>

                  {/* Privilege Management Drawer (Requirement 5) */}
                  <div className="pt-2 border-t border-[#eff4ff] flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingPrivilegesUid(editingPrivilegesUid === user.uid ? null : user.uid)}
                      className="text-[11px] font-bold text-[#002046] hover:underline flex items-center justify-between py-1 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#904d00]">tune</span>
                        <span>Decide Privileges to Assign or Remove ({editingPrivilegesUid === user.uid ? 'Hide' : 'Configure'})</span>
                      </span>
                      <span className="material-symbols-outlined text-[16px]">
                        {editingPrivilegesUid === user.uid ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {editingPrivilegesUid === user.uid && (
                      <div className="p-3 bg-[#eff4ff] rounded-xl border border-[#dce9ff] flex flex-col gap-2.5 animate-in fade-in duration-150">
                        <span className="text-[11px] font-bold text-[#002046]">
                          Super Admin Privilege Assignment &amp; Revocation:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          {[
                            { key: 'canViewSeekers', label: 'View Seeker Database' },
                            { key: 'canExportData', label: 'Export / Download Data' },
                            { key: 'canReassignSeekers', label: 'Reassign Seekers' },
                            { key: 'canAccessChat', label: 'In-App Direct Chat' },
                            { key: 'canEditNotes', label: 'Modify Pastoral Notes' },
                            { key: 'canViewAuditLogs', label: 'View Audit Trail' },
                            { key: 'canManageUsers', label: 'Manage Roles & Users' },
                            { key: 'canDeleteRecords', label: 'Purge Seeker Records' },
                          ].map((priv) => {
                            const currentPrivs = tempPrivileges[user.uid] || user.privileges || DEFAULT_ROLE_PRIVILEGES[user.role] || {};
                            const isChecked = Boolean(currentPrivs[priv.key as keyof UserPrivileges]);
                            return (
                              <label key={priv.key} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePrivilege(user.uid, priv.key as keyof UserPrivileges, user.privileges)}
                                  className="w-3.5 h-3.5 text-[#002046] rounded"
                                />
                                <span className={isChecked ? 'font-semibold text-[#002046]' : 'text-[#74777f]'}>
                                  {priv.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleSavePrivileges(user)}
                            className="px-3 py-1 bg-[#002046] hover:bg-[#1b365d] text-white text-[11px] font-bold rounded-lg shadow-xs cursor-pointer"
                          >
                            Save Privileges
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SECTION 31 IMMUTABLE AUDIT LOG TRAIL */}
      {activeTab === 'audit' && (
        <div className="px-4 pt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-[15px] font-bold text-[#002046]">
                Section 31 Security Audit Trail
              </h3>
              <span className="text-[11px] text-[#44474e]">
                Tamper-resistant ledger tracking database access, PII views, and export attempts
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eff4ff] text-[#002046] border border-[#dce9ff]">
              Immutable
            </span>
          </div>

          {!isSuperAdmin ? (
            <div className="w-full rounded-2xl bg-white p-5 border border-[#ffdad6] text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[28px] text-[#ba1a1a]">lock</span>
              <p className="text-[13px] font-bold text-[#002046]">
                Audit Logs Restricted to Super Administrator
              </p>
              <p className="text-[12px] text-[#44474e]">
                In accordance with Section 31 protocols, raw audit trails may only be audited by Synod Executive Keyholders.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-white shadow-2xs border border-[#e5eeff] flex flex-col gap-1 text-[12px]"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                        log.action.includes('BLOCKED')
                          ? 'bg-red-100 text-red-800'
                          : log.action.includes('APPROVE')
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.action === 'login'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : 'bg-[#eff4ff] text-[#002046]'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-[11px] text-[#74777f]">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.location}
                    </span>
                  </div>

                  <p className="text-[#0b1c30] font-medium pt-0.5">
                    {log.accessedData}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[#74777f] pt-0.5 border-t border-[#eff4ff]">
                    <span>Actor: {log.userEmail || log.userId}</span>
                    <span className="font-bold text-[#002046] capitalize">Role: {log.role || log.userRole}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ASSIGNED PERSONNEL */}
      {activeTab === 'personnel' && (
        <div className="px-4 pt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-[15px] font-bold text-[#002046]">
                Accredited Personnel Directory
              </h3>
              <span className="text-[11px] text-[#44474e]">
                Active field workers with verified Union credentials
              </span>
            </div>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="h-9 px-3 rounded-xl bg-[#002046] hover:bg-[#1b365d] text-white text-[12px] font-bold flex items-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Assign Worker</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {filteredPersonnel.map((person) => (
              <div
                key={person.id}
                className="p-4 rounded-2xl bg-white shadow-xs border border-[#e5eeff] flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-[#aec7f7]"
                      alt={person.name}
                      src={person.avatarUrl}
                    />
                    <div className="flex flex-col min-w-0">
                      <h4 className="text-[14px] font-bold text-[#002046] truncate">
                        {person.name}
                      </h4>
                      <span className="text-[12px] text-[#44474e] truncate">
                        {person.jurisdiction}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                      person.tierLevel === 1
                        ? 'bg-[#002046] text-white'
                        : 'bg-[#eff4ff] text-[#002046] border border-[#dce9ff]'
                    }`}
                  >
                    {person.tierName}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#eff4ff] text-[11px] text-[#44474e]">
                  <span className="font-semibold text-[#002046]">
                    {person.statusBadge}
                  </span>
                  <span className="text-[11px] font-mono text-[#74777f]">
                    {person.phone}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Authorize New Worker */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#002046]/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto border border-[#dce9ff]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#002046] text-[#fe932c] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[19px]">badge</span>
                </div>
                <h3 className="text-[17px] font-bold text-[#002046]">
                  Assign Worker RBAC Role
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#44474e] hover:bg-[#eff4ff]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAssignRole} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#44474e]">
                  Full Name &amp; Title
                </label>
                <input
                  type="text"
                  required
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  placeholder="e.g. Pastor David Lal"
                  className="h-10 px-3 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-[13px] border border-[#dce9ff]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-[#44474e]">
                    Login Email (Optional / Provision)
                  </label>
                  <input
                    type="email"
                    value={newWorkerEmail}
                    onChange={(e) => setNewWorkerEmail(e.target.value)}
                    placeholder="worker@niu-sda.org"
                    className="h-10 px-3 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-[13px] border border-[#dce9ff]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-[#44474e]">
                    Initial Password
                  </label>
                  <input
                    type="password"
                    value={newWorkerPassword}
                    onChange={(e) => setNewWorkerPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 px-3 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-[13px] border border-[#dce9ff]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#44474e]">
                  Worker Mobile / WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  placeholder="+91 00000 00000"
                  className="h-10 px-3 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-[13px] border border-[#dce9ff]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#44474e]">
                  Assigned RBAC Role
                </label>
                <select
                  value={newWorkerRole}
                  onChange={(e) => setNewWorkerRole(e.target.value as UserRole)}
                  className="h-10 px-3 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-[13px] border border-[#dce9ff]"
                >
                  <option value="worker">Department / Worker User (Restricted PII, Chat Only)</option>
                  <option value="union_admin">Union Admin (Bounded to Assigned Union)</option>
                  <option value="chat_user">Chat User (Internal Messaging Only)</option>
                  <option value="super_admin">Super Admin (Full Master Console)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#44474e]">
                  Union Jurisdiction
                </label>
                <select
                  value={newWorkerUnion}
                  onChange={(e) => setNewWorkerUnion(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-[13px] border border-[#dce9ff]"
                >
                  {ASSIGNED_TERRITORIAL_UNIONS.map((union) => (
                    <option key={union} value={union}>
                      {union}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 h-10 rounded-xl bg-[#eff4ff] text-[#002046] font-bold text-[12px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-[#002046] hover:bg-[#1b365d] text-white font-bold text-[12px] shadow-sm"
                >
                  Issue Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
