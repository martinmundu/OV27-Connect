import React, { useState, useEffect } from 'react';
import { Seeker, SeekerTask, UserRole } from '../types';
import {
  canAccessSeekerByUnion,
  canViewSeekerPII,
  canExportData,
} from '../security';
import { logUserAction, logAccessedSeeker } from '../firebase';

interface WorkerCrmViewProps {
  seekers: Seeker[];
  workerTasks?: SeekerTask[];
  onSelectSeeker: (seeker: Seeker) => void;
  onOpenLogModal: (seeker?: Seeker) => void;
  onOpenWhatsAppModal: (seeker: Seeker) => void;
  onOpenChat?: (seeker?: Seeker | { id: string; name: string }) => void;
  onToggleTask?: (taskId: string) => void;
  currentUserRole?: UserRole;
  currentUserUnion?: string;
  showToast: (msg: string, icon?: string) => void;
}

export const WorkerCrmView: React.FC<WorkerCrmViewProps> = ({
  seekers,
  workerTasks = [],
  onSelectSeeker,
  onOpenLogModal,
  onOpenWhatsAppModal,
  onOpenChat,
  onToggleTask,
  currentUserRole = 'super_admin',
  currentUserUnion = 'Delhi Metro Region',
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [localTasks, setLocalTasks] = useState<SeekerTask[]>(workerTasks);

  useEffect(() => {
    setLocalTasks(workerTasks);
  }, [workerTasks]);

  const isWorker = currentUserRole === 'worker';
  const isPIIAllowed = canViewSeekerPII(currentUserRole);

  // --------------------------------------------------------------------------
  // WORKER VIEW: Strictly seekers_tasks and assigned chats (NO /seekers ACCESS)
  // --------------------------------------------------------------------------
  if (isWorker) {
    const filteredTasks = localTasks.filter((t) => {
      if (taskFilter === 'pending') return !t.completed;
      if (taskFilter === 'completed') return t.completed;
      return true;
    }).filter((t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.seekerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.caseNumber && t.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleTaskToggle = (taskId: string) => {
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
      );
      if (onToggleTask) {
        onToggleTask(taskId);
      }
      showToast('Task updated in seekers_tasks collection', 'check_circle');
    };

    return (
      <div className="flex flex-col w-full max-w-4xl mx-auto pb-28 relative select-none">
        {/* Worker Top Caretaker Banner */}
        <div className="px-4 py-3 bg-[#eff4ff] flex items-center justify-between border-b border-[#dce9ff]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#904d00]/10 text-[#904d00] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">engineering</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-[#44474e] truncate">
                Assigned Ministry Worker
              </span>
              <span className="text-[15px] font-bold text-[#002046] truncate leading-tight">
                Field Tasks &amp; Internal Outreach Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[#e5eeff] px-2.5 py-1 rounded-full shrink-0 border border-[#d3e4fe]">
            <span className="w-2 h-2 rounded-full bg-[#fe932c] animate-pulse" />
            <span className="text-[11px] font-bold text-[#663500]">
              {currentUserUnion}
            </span>
          </div>
        </div>

        {/* Security Isolation Notice Ribbon */}
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-[12px] flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-amber-700 shrink-0 mt-0.5">
              security
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[#663500]">
                Strict Data Dignity (Section 20 &amp; 31):
              </span>
              <span className="text-amber-900 leading-relaxed">
                Direct access to the <code>/seekers</code> collection and private PII (phone, email, residential address) is barred by Firestore security rules. Outreach is conducted exclusively through <strong>assigned tasks</strong> and <strong>secure in-app chat</strong>.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
            Zero PII Guard
          </span>
        </div>

        {/* Task Metric Summary */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[16px] font-bold text-[#002046]">
              Your Assigned Outreach Tasks
            </h3>
            <span className="text-[11px] font-semibold text-[#74777f]">
              Collection: /seekers_tasks
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white p-3 rounded-2xl shadow-2xs border border-[#e5eeff]">
              <span className="text-[11px] text-[#44474e] block">Total Tasks</span>
              <span className="text-[22px] font-bold text-[#002046]">{localTasks.length}</span>
            </div>
            <div className="bg-[#ffdcc3]/50 p-3 rounded-2xl shadow-2xs border border-[#fe932c]/30">
              <span className="text-[11px] text-[#904d00] font-semibold block">Pending</span>
              <span className="text-[22px] font-bold text-[#904d00]">
                {localTasks.filter((t) => !t.completed).length}
              </span>
            </div>
            <div className="bg-emerald-50/60 p-3 rounded-2xl shadow-2xs border border-emerald-200">
              <span className="text-[11px] text-emerald-800 font-semibold block">Completed</span>
              <span className="text-[22px] font-bold text-emerald-800">
                {localTasks.filter((t) => t.completed).length}
              </span>
            </div>
          </div>
        </div>

        {/* Task Controls & Filters */}
        <div className="px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center bg-[#eff4ff] rounded-xl p-1 border border-[#dce9ff]">
            {(['all', 'pending', 'completed'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTaskFilter(filter)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors ${
                  taskFilter === filter
                    ? 'bg-[#002046] text-white shadow-xs'
                    : 'text-[#44474e] hover:text-[#002046]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assigned tasks or case ID..."
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-white border border-[#dce9ff] text-[12px] text-[#002046] placeholder:text-[#74777f] focus:outline-none focus:ring-1 focus:ring-[#002046]"
            />
            <span className="material-symbols-outlined text-[16px] text-[#74777f] absolute left-2.5 top-2.5">
              search
            </span>
          </div>
        </div>

        {/* Tasks List */}
        <div className="px-4 py-2 flex flex-col gap-2.5">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#e5eeff] text-[#74777f]">
              <span className="material-symbols-outlined text-[36px] text-[#aec7f7]">task_alt</span>
              <p className="text-[13px] font-bold text-[#002046] mt-1">No tasks matching criteria</p>
              <p className="text-[11px]">All assigned follow-ups are up to date.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-2xl bg-white border transition-all shadow-xs flex flex-col gap-2.5 ${
                  task.completed ? 'border-emerald-200 bg-emerald-50/20 opacity-85' : 'border-[#e5eeff] hover:border-[#aec7f7]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleTaskToggle(task.id)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all mt-0.5 shrink-0 ${
                        task.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-[#74777f] hover:border-[#002046] bg-white'
                      }`}
                      title={task.completed ? 'Mark pending' : 'Mark completed'}
                    >
                      {task.completed && (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                    </button>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#002046] border border-[#dce9ff]">
                          {task.caseNumber || task.seekerId}
                        </span>
                        {task.stage && (
                          <span className="text-[10px] font-bold text-[#904d00] bg-[#ffdcc3]/50 px-2 py-0.2 rounded-full">
                            {task.stage}
                          </span>
                        )}
                        {task.assignedChurch && (
                          <span className="text-[10px] text-[#74777f]">
                            {task.assignedChurch}
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-[14px] font-semibold text-[#002046] mt-1 leading-snug ${
                          task.completed ? 'line-through text-[#74777f]' : ''
                        }`}
                      >
                        {task.title}
                      </h4>

                      <span className="text-[11px] text-[#74777f] mt-0.5">
                        {task.dueDateOrStatus}
                      </span>
                    </div>
                  </div>

                  {/* Direct In-App Chat Action (Zero PII outreach) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenChat) {
                        onOpenChat({ id: task.seekerId, name: task.caseNumber || task.seekerId });
                      } else {
                        showToast(`Opening internal chat for ${task.caseNumber || task.seekerId}...`, 'forum');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#002046] hover:bg-[#1b365d] active:scale-95 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-all shrink-0 cursor-pointer"
                    title="Open assigned in-app chat"
                  >
                    <span className="material-symbols-outlined text-[16px]">forum</span>
                    <span>In-App Chat</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Assigned Conversations Quick Tray */}
        <div className="mx-4 mt-3 p-4 rounded-2xl bg-white border border-[#e5eeff] shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#002046] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#fe932c]">chat</span>
              <span>Your Assigned Outreach Chats</span>
            </span>
            <span className="text-[11px] text-[#74777f]">
              Ownership Enforced by participants Array
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: 'CR-2024-8841', name: 'Case #8841', church: 'Central SDA Church' },
              { id: 'CR-2024-8842', name: 'Case #8842', church: 'Central SDA Church' },
              { id: 'CR-2024-8844', name: 'Case #8844', church: 'Rohini Fellowship' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  if (onOpenChat) onOpenChat(c);
                  else showToast(`Opening chat with ${c.name}`, 'forum');
                }}
                className="p-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] border border-[#dce9ff] flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-bold text-[#002046] truncate">{c.name}</span>
                  <span className="text-[10px] text-[#74777f] truncate">{c.church}</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[#002046]">
                  chevron_right
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ADMINISTRATIVE VIEW: Super Admin and Union Admin
  // --------------------------------------------------------------------------
  const unionScopedSeekers = seekers.filter((s) =>
    canAccessSeekerByUnion(currentUserRole, currentUserUnion, s.assignedUnion)
  );

  const filterStages = [
    { label: 'All', count: unionScopedSeekers.length },
    { label: 'New Interest', count: unionScopedSeekers.filter((s) => s.stage === 'New Interest').length },
    { label: 'Contacted', count: unionScopedSeekers.filter((s) => s.stage === 'Contacted').length },
    { label: 'Bible Study', count: unionScopedSeekers.filter((s) => s.stage === 'Bible Study').length },
    { label: 'Visited Sabbath', count: unionScopedSeekers.filter((s) => s.stage === 'Visited Sabbath').length },
    { label: 'Baptismal Prep', count: unionScopedSeekers.filter((s) => s.stage === 'Baptismal Prep').length },
  ];

  const filteredSeekers = unionScopedSeekers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.pinCode.includes(searchQuery) ||
      s.assignedChurch.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedStage === 'All') return true;
    return s.stage === selectedStage;
  });

  const handleExportAttempt = () => {
    if (!canExportData(currentUserRole)) {
      showToast(
        'Access Denied: Section 20 prohibits downloading or exporting seeker lists for your role.',
        'block'
      );
      return;
    }
    logUserAction({
      action: 'exported data',
      userId: 'current-user-session',
      role: currentUserRole,
      accessedCollection: 'seekers',
      accessedData: `Exported seeker roster for ${currentUserUnion} (${unionScopedSeekers.length} contacts)`,
      location: currentUserUnion,
    });
    showToast('Exporting union seeker audit report (PDF/XLSX)...', 'download');
  };

  const handleSelectSeekerWithAudit = (seeker: Seeker) => {
    logAccessedSeeker('current-user-session', currentUserRole, seeker.id, {
      seekerName: seeker.name,
      location: currentUserUnion,
      isPII: canViewSeekerPII(currentUserRole),
    });
    onSelectSeeker(seeker);
  };

  return (
    <div
      className="flex flex-col w-full max-w-4xl mx-auto pb-28 relative select-none"
      onCopy={(e) => {
        if (!canExportData(currentUserRole)) {
          e.preventDefault();
          showToast(
            'Section 31 Data Dignity: Copying seeker details is disabled to prevent data leakage.',
            'security_update_warning'
          );
        }
      }}
    >
      {/* Top Regional Caretaker Banner */}
      <div className="px-4 py-3 bg-[#eff4ff] flex items-center justify-between border-b border-[#dce9ff]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#002046]/10 text-[#002046] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-[#44474e] truncate">
              {currentUserRole === 'super_admin'
                ? 'Super Administrator'
                : `Union Admin (${currentUserUnion})`}
            </span>
            <span className="text-[15px] font-bold text-[#002046] truncate leading-tight">
              {currentUserRole === 'super_admin'
                ? 'Synod Master Console'
                : `${currentUserUnion} Directorate`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#e5eeff] px-2.5 py-1 rounded-full shrink-0 border border-[#d3e4fe]">
          <span className="w-2 h-2 rounded-full bg-[#fe932c] animate-pulse" />
          <span className="text-[11px] font-bold text-[#663500]">
            {currentUserRole === 'super_admin' ? 'All Northern Sections' : currentUserUnion}
          </span>
        </div>
      </div>

      {currentUserRole === 'union_admin' && (
        <div className="mx-4 mt-3 p-2.5 rounded-xl bg-[#eff4ff] border border-[#dce9ff] text-[#002046] text-[12px] flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-[16px]">domain</span>
            Territory Bounded: Viewing seekers in <strong>{currentUserUnion}</strong> only. Export is restricted.
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#dce9ff] px-2 py-0.5 rounded">
            Sec 20 Guard
          </span>
        </div>
      )}

      {/* Summary Metric Ribbon */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[16px] font-bold text-[#002046]">
            Pastoral Ministry Overview
          </span>
          <span className="text-[12px] text-[#44474e] font-medium">
            October 2024 Cycle
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-[#e5eeff] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#44474e]">Visible Seekers</span>
              <span className="material-symbols-outlined text-[#002046] text-[20px]">
                groups
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[24px] font-bold text-[#002046] leading-none">
                {unionScopedSeekers.length}
              </span>
              <span className="text-[12px] text-[#44474e]">contacts</span>
            </div>
          </div>

          <div className="bg-[#ffdcc3]/60 p-3.5 rounded-2xl shadow-xs border border-[#fe932c]/30 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#6e3900] font-semibold">SLA Urgent</span>
              <span className="material-symbols-outlined text-[#904d00] text-[20px]">
                notification_important
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[24px] font-bold text-[#904d00] leading-none">
                {unionScopedSeekers.filter((s) => s.slaUrgent).length}
              </span>
              <span className="text-[12px] text-[#6e3900]">&lt; 4h limit</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-[#e5eeff] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#44474e]">Bible Study</span>
              <span className="material-symbols-outlined text-[#140077] text-[20px]">
                menu_book
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[24px] font-bold text-[#002046] leading-none">
                {unionScopedSeekers.filter((s) => s.stage === 'Bible Study').length}
              </span>
              <span className="text-[12px] text-[#44474e]">in lessons</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-[#e5eeff] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#44474e]">Sabbath Guests</span>
              <span className="material-symbols-outlined text-emerald-700 text-[20px]">
                church
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[24px] font-bold text-[#002046] leading-none">
                {unionScopedSeekers.filter((s) => s.stage === 'Visited Sabbath').length}
              </span>
              <span className="text-[12px] text-[#44474e]">attended</span>
            </div>
          </div>
        </div>
      </div>

      {/* Discipleship Pipeline Progress Bar */}
      <div className="px-4 py-2">
        <div className="bg-white p-4 rounded-2xl border border-[#e5eeff] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-[#002046]">Discipleship Pathway Stage</span>
            <span className="text-[11px] text-[#74777f]">Section 20 Overview</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold">
            {[
              { label: 'New', count: unionScopedSeekers.filter((s) => s.stage === 'New Interest').length, color: 'bg-blue-100 text-blue-900' },
              { label: 'Contacted', count: unionScopedSeekers.filter((s) => s.stage === 'Contacted').length, color: 'bg-purple-100 text-purple-900' },
              { label: 'Bible Study', count: unionScopedSeekers.filter((s) => s.stage === 'Bible Study').length, color: 'bg-amber-100 text-amber-900' },
              { label: 'Sabbath', count: unionScopedSeekers.filter((s) => s.stage === 'Visited Sabbath').length, color: 'bg-emerald-100 text-emerald-900' },
              { label: 'Baptism', count: unionScopedSeekers.filter((s) => s.stage === 'Baptismal Prep').length, color: 'bg-teal-100 text-teal-900' },
            ].map((st, i) => (
              <div key={i} className={`p-2 rounded-xl ${st.color} flex flex-col`}>
                <span className="text-[14px]">{st.count}</span>
                <span className="truncate">{st.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Export Action Bar */}
      <div className="px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by seeker name, district, or church..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-white border border-[#dce9ff] text-[13px] text-[#002046] placeholder:text-[#74777f] focus:outline-none focus:ring-1 focus:ring-[#002046]"
          />
          <span className="material-symbols-outlined text-[18px] text-[#74777f] absolute left-3 top-2.5">
            search
          </span>
        </div>

        <button
          type="button"
          onClick={handleExportAttempt}
          className={`h-10 px-3.5 rounded-xl font-bold text-[12px] flex items-center gap-1.5 transition-all shadow-xs border ${
            canExportData(currentUserRole)
              ? 'bg-[#002046] text-white hover:bg-[#1b365d]'
              : 'bg-[#eff4ff] text-[#74777f] border-[#dce9ff] cursor-not-allowed opacity-75'
          }`}
          title={
            canExportData(currentUserRole)
              ? 'Export Seeker Compliance Roster'
              : 'Export restricted to Super Admin only'
          }
        >
          <span className="material-symbols-outlined text-[18px]">
            {canExportData(currentUserRole) ? 'download' : 'lock'}
          </span>
          <span>Export List</span>
        </button>
      </div>

      {/* Stage Filter Chips */}
      <div className="px-4 py-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {filterStages.map((st) => (
          <button
            key={st.label}
            type="button"
            onClick={() => setSelectedStage(st.label)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
              selectedStage === st.label
                ? 'bg-[#002046] text-white shadow-xs'
                : 'bg-white text-[#44474e] border border-[#dce9ff] hover:bg-[#eff4ff]'
            }`}
          >
            <span>{st.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedStage === st.label ? 'bg-white/20 text-white' : 'bg-[#e5eeff] text-[#002046]'
              }`}
            >
              {st.count}
            </span>
          </button>
        ))}
      </div>

      {/* Seekers List */}
      <div className="px-4 py-3 flex flex-col gap-3">
        {filteredSeekers.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#e5eeff] text-[#74777f]">
            <span className="material-symbols-outlined text-[36px] text-[#aec7f7]">person_search</span>
            <p className="text-[13px] font-bold text-[#002046] mt-1">No seekers found</p>
            <p className="text-[11px]">No matching records found in {currentUserUnion}.</p>
          </div>
        ) : (
          filteredSeekers.map((s) => (
            <div
              key={s.id}
              onClick={() => handleSelectSeekerWithAudit(s)}
              className="p-4 rounded-2xl bg-white border border-[#e5eeff] hover:border-[#aec7f7] transition-all shadow-xs flex flex-col gap-3 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={s.avatarUrl}
                    alt={s.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#dce9ff] shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-[15px] font-bold text-[#002046] leading-tight">
                        {s.name}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-[#e5eeff] text-[#002046]">
                        {s.assignedUnion}
                      </span>
                    </div>

                    <span className="text-[12px] text-[#44474e] mt-0.5 truncate">
                      {s.location} • {s.assignedChurch}
                    </span>

                    <span className="text-[11px] text-[#74777f] mt-0.5">
                      {s.age} yrs • {s.gender} • {s.occupation || 'Employed'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#eff4ff] text-[#002046] border border-[#dce9ff]">
                    {s.stage}
                  </span>
                  {s.slaUrgent && (
                    <span className="text-[10px] font-bold text-[#904d00] bg-[#ffdcc3]/60 px-2 py-0.2 rounded-full">
                      SLA Urgent
                    </span>
                  )}
                </div>
              </div>

              {/* Inquiry quote snippet */}
              {s.inquiryQuote && (
                <p className="text-[11px] text-[#44474e] bg-[#f8f9ff] p-2.5 rounded-xl border border-[#e5eeff] italic line-clamp-2">
                  {s.inquiryQuote}
                </p>
              )}

              {/* Action row */}
              <div className="flex items-center justify-between pt-2 border-t border-[#f0f4fc]">
                <span className="text-[11px] text-[#74777f]">
                  Registered: {s.registrationDate}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenChat) onOpenChat(s);
                      else showToast(`Opening chat with ${s.name}`, 'forum');
                    }}
                    className="px-3 py-1 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002046] text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">chat</span>
                    <span>Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSeekerWithAudit(s);
                    }}
                    className="px-3 py-1 rounded-lg bg-[#002046] hover:bg-[#1b365d] text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <span>View Dossier</span>
                    <span className="material-symbols-outlined text-[15px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
