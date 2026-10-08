import React, { useState, useEffect } from 'react';
import { Seeker, SeekerPrivateData, DiscipleshipStage, PastoralTask, UserRole } from '../types';
import {
  canViewSeekerPII,
  canExportData,
} from '../security';
import {
  logAccessedSeeker,
  logViewedSeeker,
  logAssignedTask,
  logUserAction,
  recordAuditLog,
  fetchSeekerPrivateData,
} from '../firebase';
import { DashboardWidget } from './DashboardWidget';

interface SeekerProfileViewProps {
  seeker: Seeker;
  onBack: () => void;
  onOpenLogModal: (seeker: Seeker) => void;
  onOpenWhatsAppModal: (seeker: Seeker) => void;
  onOpenChat?: () => void;
  onRequestDataDeletion?: (seeker: Seeker) => void;
  onUpdateSeeker: (updated: Seeker) => void;
  currentUserRole?: UserRole;
  currentUserUnion?: string;
  showToast: (msg: string, icon?: string) => void;
}

export const SeekerProfileView: React.FC<SeekerProfileViewProps> = ({
  seeker,
  onBack,
  onOpenLogModal,
  onOpenWhatsAppModal,
  onOpenChat,
  onRequestDataDeletion,
  onUpdateSeeker,
  currentUserRole = 'super_admin',
  currentUserUnion = 'Delhi Metro Region',
  showToast,
}) => {
  const [tasks, setTasks] = useState<PastoralTask[]>(seeker.tasks);
  const [stage, setStage] = useState<DiscipleshipStage>(seeker.stage);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Record audit log when accessing seeker record & PII
  useEffect(() => {
    logAccessedSeeker(
      'current-user-session',
      currentUserRole,
      seeker.id,
      {
        seekerName: seeker.name,
        location: currentUserUnion,
        isPII: canViewSeekerPII(currentUserRole),
      }
    );
  }, [seeker.id, currentUserRole, currentUserUnion]);

  const toggleTask = (taskId: string) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    onUpdateSeeker({ ...seeker, tasks: updated });
    showToast('Task updated', 'check_circle');
  };

  const handleAddTask = () => {
    const title = prompt('Enter new pastoral task for ' + seeker.name + ':');
    if (title && title.trim()) {
      const newTask: PastoralTask = {
        id: `task-${Date.now()}`,
        title: title.trim(),
        dueDateOrStatus: 'Added just now',
        completed: false,
      };
      const updated = [...tasks, newTask];
      setTasks(updated);
      onUpdateSeeker({ ...seeker, tasks: updated });
      logAssignedTask(
        'current-user-session',
        currentUserRole,
        seeker.id,
        title.trim(),
        {
          seekerName: seeker.name,
          location: currentUserUnion,
        }
      );
      showToast('New care task added', 'add_task');
    }
  };

  const handleShare = () => {
    if (!canExportData(currentUserRole)) {
      showToast(
        'Section 31 Alert: Exporting or sharing seeker PII outside the secure app is prohibited.',
        'security_update_warning'
      );
      return;
    }

    logUserAction({
      action: 'exported data',
      userId: 'current-user-session',
      role: currentUserRole,
      targetId: seeker.id,
      accessedCollection: 'seekers',
      accessedData: `Exported seeker lead: ${seeker.name}`,
      location: currentUserUnion,
    });

    if (navigator.share) {
      navigator
        .share({
          title: `One Voice 27 - Seeker Lead: ${seeker.name}`,
          text: `Seeker: ${seeker.name}, ${seeker.location}. Assigned to ${seeker.assignedChurch}.`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      showToast('Lead summary copied to clipboard for union worker', 'content_copy');
    }
  };

  const handleStageSelect = (newStage: DiscipleshipStage) => {
    setStage(newStage);
    setShowStatusMenu(false);
    onUpdateSeeker({ ...seeker, stage: newStage });
    logUserAction({
      action: 'updated seeker',
      userId: 'current-user-session',
      role: currentUserRole,
      targetId: seeker.id,
      accessedCollection: 'seekers',
      accessedData: `Updated stage to ${newStage} for seeker ${seeker.name}`,
      location: currentUserUnion,
      metadata: { newStage, previousStage: seeker.stage },
    });
    showToast(`Seeker milestone updated to ${newStage}`, 'trending_up');
  };

  const isWorker = currentUserRole === 'worker';
  const isPIIAllowed = canViewSeekerPII(currentUserRole) && !isWorker;

  const [privateData, setPrivateData] = useState<SeekerPrivateData | null>(null);

  useEffect(() => {
    if (isPIIAllowed) {
      fetchSeekerPrivateData(seeker.id, currentUserRole).then((data) => {
        if (data) setPrivateData(data);
      });
    }
  }, [seeker.id, currentUserRole, isPIIAllowed]);

  if (isWorker) {
    return (
      <div className="flex flex-col w-full max-w-4xl mx-auto p-6 select-none">
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8 flex flex-col items-center text-center gap-3">
          <span className="material-symbols-outlined text-[48px] text-amber-700">lock</span>
          <h3 className="text-[18px] font-bold text-[#002046]">
            Access Barred by Section 20 Directive
          </h3>
          <p className="text-[13px] text-amber-950 max-w-md leading-relaxed">
            Under Firestore security rules, workers have <strong>zero read or list access</strong> to the <code>/seekers</code> pastoral collection. Field workers interact exclusively through assigned tasks in <code>/seekers_tasks</code> and encrypted in-app messaging.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-2 px-5 py-2 rounded-xl bg-[#002046] text-white font-bold text-[12px] shadow-xs hover:bg-[#1b365d]"
          >
            Return to My Tasks
          </button>
        </div>
      </div>
    );
  }

  const phoneDisplay = isPIIAllowed ? privateData?.phone || 'Loading from /seekers_private...' : '••••••••••';
  const emailDisplay = isPIIAllowed ? privateData?.email || 'Loading...' : '••••@••••.org';
  const addressDisplay = isPIIAllowed ? privateData?.address || seeker.location : seeker.location;

  return (
    <div
      className="flex flex-col w-full max-w-4xl mx-auto pb-28 select-none"
      onCopy={(e) => {
        if (!canExportData(currentUserRole)) {
          e.preventDefault();
          showToast(
            'Section 31 Security Alert: Copying personal identity details is disabled to protect seeker privacy.',
            'security_update_warning'
          );
        }
      }}
    >
      {/* Sub-header / Back & Pastoral Meta Navigation */}
      <section className="w-full px-4 py-2.5 bg-[#eff4ff] flex items-center justify-between gap-2 shadow-xs border-b border-[#dce9ff]">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            aria-label="Back to CRM Leads"
            type="button"
            onClick={onBack}
            className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-[#002046] hover:bg-[#e5eeff] active:scale-95 transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#44474e] font-semibold uppercase tracking-wider">
                {seeker.id}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full bg-[#ffdcc3] text-[#2f1500] text-[10px] font-bold">
                Active Care
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-[#002046] border border-[#dce9ff]">
                {seeker.assignedUnion}
              </span>
            </div>
            <h2 className="text-[14px] font-bold text-[#002046] truncate leading-tight">
              Seeker Profile Detail
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 relative">
          {/* Share button is strictly visible to Super Admins only */}
          {currentUserRole === 'super_admin' && (
            <button
              aria-label="Share Lead"
              type="button"
              onClick={handleShare}
              title="Share Lead"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#44474e] hover:text-[#002046] hover:bg-[#e5eeff] transition-all"
            >
              <span className="material-symbols-outlined text-[19px]">share</span>
            </button>
          )}

          <button
            aria-label="Edit Profile"
            type="button"
            onClick={() => onOpenLogModal(seeker)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#44474e] hover:text-[#002046] hover:bg-[#e5eeff] transition-all"
          >
            <span className="material-symbols-outlined text-[19px]">edit_note</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#d3e4fe] text-[#002046] text-[11px] font-bold hover:bg-[#dce9ff] transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-[#fe932c] animate-pulse" />
              <span>{stage}</span>
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </button>

            {showStatusMenu && (
              <div className="absolute right-0 top-8 z-50 bg-white rounded-xl shadow-xl border border-[#dce9ff] py-1 w-44 animate-in fade-in duration-100">
                {[
                  'New Interest',
                  'Contacted',
                  'Bible Study',
                  'Visited Sabbath',
                  'Baptismal Prep',
                  'Baptized Member',
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStageSelect(s as DiscipleshipStage)}
                    className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#eff4ff] flex items-center justify-between ${
                      stage === s ? 'font-bold text-[#002046]' : 'text-[#44474e]'
                    }`}
                  >
                    <span>{s}</span>
                    {stage === s && (
                      <span className="material-symbols-outlined text-[16px] text-[#904d00]">
                        check
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Security Banner if worker is viewing */}
      {isWorker && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff] flex items-center justify-between text-[12px] text-[#002046]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#005fb0] text-[18px]">
              verified_user
            </span>
            <span>
              <strong>Worker Access Clearance:</strong> Sensitive personal data (phone, email, address) is hidden. Use the <em>Contact via App Chat</em> feature below for outreach.
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#dce9ff] shrink-0">
            Protected
          </span>
        </div>
      )}

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Seeker Identity Pastoral Card */}
        <article className="w-full bg-white rounded-2xl shadow-sm border border-[#e5eeff] overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-[#1b365d] via-[#fe932c] to-[#aec7f7]" />

          <div className="p-4 sm:p-5 flex flex-col gap-3.5">
            {/* Main Bio Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-[#aec7f7]"
                    alt={seeker.name}
                    src={seeker.avatarUrl}
                  />
                  <div
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#002046] text-white flex items-center justify-center shadow-xs"
                    title="Identity Verified"
                  >
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-[20px] font-bold text-[#002046] leading-snug">
                      {seeker.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#e5eeff] text-[#44474e] text-[11px] font-bold tracking-wide">
                      हिन्दी
                    </span>
                  </div>

                  {isWorker ? (
                    <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-[#44474e]">
                      <span className="material-symbols-outlined text-[15px] text-[#904d00]">
                        location_on
                      </span>
                      <span className="text-[#74777f]">
                        {seeker.assignedUnion} • Regional Field Jurisdiction
                      </span>
                    </div>
                  ) : (
                    <p className="text-[12px] text-[#44474e] flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[15px] text-[#904d00]">
                        location_on
                      </span>
                      <span>{addressDisplay}</span>
                    </p>
                  )}

                  <p className="text-[12px] text-[#44474e] mt-0.5">
                    {seeker.age} yrs • {seeker.gender} • {seeker.occupation || 'Employed'}
                  </p>

                  {/* Private PII fields: hidden for worker, replaced with 'Contact via App Chat' */}
                  {isWorker ? (
                    <div className="mt-2.5 p-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[20px] text-[#002046] shrink-0">
                          lock
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#74777f]">
                            Confidential Contact
                          </span>
                          <span className="text-[13px] font-bold text-[#002046] truncate">
                            Contact via App Chat
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenChat) onOpenChat();
                          else showToast(`Opening chat with ${seeker.name}...`, 'chat');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#002046] hover:bg-[#1b365d] active:scale-95 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-all shrink-0"
                      >
                        <span className="material-symbols-outlined text-[15px] text-[#ffdcc3]">
                          chat
                        </span>
                        <span>Open Chat</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 flex flex-col gap-0.5 text-[11px] font-mono">
                      <span className="text-[#002046] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-[#44474e]">call</span>
                        {phoneDisplay}
                      </span>
                      <span className="text-[#44474e] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">mail</span>
                        {emailDisplay || 'No email registered'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inbound Source & Quote Callout */}
            <div className="p-3 rounded-xl bg-[#eff4ff] flex flex-col gap-1.5 border border-[#dce9ff]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] text-[#002046] font-bold">
                  <span
                    className="material-symbols-outlined text-[14px] text-[#fe932c]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    campaign
                  </span>
                  {seeker.inboundSource}
                </span>
                <span className="text-[11px] text-[#44474e]">
                  {seeker.registrationDate}
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-[#0b1c30]">
                <span className="material-symbols-outlined text-[18px] text-[#904d00] shrink-0 select-none">
                  format_quote
                </span>
                <p className="text-[12px] italic text-[#44474e] leading-relaxed">
                  {seeker.inquiryQuote}
                </p>
              </div>
            </div>

            {/* Pastoral Assignment Info */}
            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              <div className="flex flex-col p-2.5 rounded-xl bg-[#e5eeff] border border-[#dce9ff]">
                <div className="flex items-center gap-1 text-[#44474e] mb-0.5">
                  <span className="material-symbols-outlined text-[14px] text-[#002046]">
                    church
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Assigned Church
                  </span>
                </div>
                <span className="text-[13px] text-[#002046] font-bold truncate leading-tight">
                  {seeker.assignedChurch}
                </span>
                <span className="text-[11px] text-[#44474e] truncate">
                  {seeker.assignedChurchAddress}
                </span>
              </div>

              <div className="flex flex-col p-2.5 rounded-xl bg-[#e5eeff] border border-[#dce9ff]">
                <div className="flex items-center gap-1 text-[#44474e] mb-0.5">
                  <span className="material-symbols-outlined text-[14px] text-[#002046]">
                    person_apron
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Shepherd / Pastor
                  </span>
                </div>
                <span className="text-[13px] text-[#002046] font-bold truncate leading-tight">
                  {seeker.assignedPastor}
                </span>
                <span className="text-[11px] text-[#44474e] truncate">
                  {seeker.assignedPastorTitle}
                </span>
              </div>
            </div>

            {/* Quick Action Bar (Strictly Role-Controlled) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {isWorker ? (
                /* Worker: Direct Call and WhatsApp are hidden. Displays 'Contact via App Chat' */
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenChat) onOpenChat();
                    else showToast(`Connecting to pastoral chat with ${seeker.name}...`, 'chat');
                  }}
                  className="col-span-2 flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#002046] text-white hover:bg-[#1b365d] active:scale-95 transition-all text-center shadow-xs"
                >
                  <span className="material-symbols-outlined text-[20px] mb-0.5 text-[#ffdcc3]">
                    chat
                  </span>
                  <span className="text-[12px] font-bold">Contact via App Chat</span>
                </button>
              ) : (
                <>
                  <a
                    href={`tel:${phoneDisplay}`}
                    onClick={() => showToast(`Calling ${seeker.name}...`, 'call')}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#1b365d] text-white hover:bg-[#002046] active:scale-95 transition-all text-center shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[19px] mb-0.5">
                      call
                    </span>
                    <span className="text-[11px] font-semibold">Direct Call</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => onOpenWhatsAppModal(seeker)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#fe932c] text-[#2f1500] hover:bg-[#ffb77d] active:scale-95 transition-all text-center shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[19px] mb-0.5">
                      chat
                    </span>
                    <span className="text-[11px] font-bold">WhatsApp</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => onOpenLogModal(seeker)}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#dce9ff] text-[#002046] hover:bg-[#d3e4fe] active:scale-95 transition-all text-center border border-[#aec7f7]/60"
              >
                <span className="material-symbols-outlined text-[19px] mb-0.5">
                  calendar_add_on
                </span>
                <span className="text-[11px] font-semibold">Log Care</span>
              </button>

              {/* Data Deletion Request option strictly for Super Admin */}
              {currentUserRole === 'super_admin' && onRequestDataDeletion && (
                <button
                  type="button"
                  onClick={() => onRequestDataDeletion(seeker)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#ffdad6]/60 hover:bg-[#ffdad6] text-[#ba1a1a] active:scale-95 transition-all text-center shadow-xs"
                  title="Erase Seeker Record (Sec 31)"
                >
                  <span className="material-symbols-outlined text-[19px] mb-0.5">
                    delete_forever
                  </span>
                  <span className="text-[11px] font-bold">Erase</span>
                </button>
              )}

              {/* Reassign action strictly for admins */}
              {(currentUserRole === 'super_admin' || currentUserRole === 'union_admin') && (
                <button
                  type="button"
                  onClick={() => {
                    showToast('Reassignment tray opened for Union field overseer', 'swap_horiz');
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#e5eeff] text-[#44474e] hover:text-[#002046] active:scale-95 transition-all text-center border border-[#dce9ff]"
                >
                  <span className="material-symbols-outlined text-[19px] mb-0.5">
                    swap_horiz
                  </span>
                  <span className="text-[11px] font-semibold">Reassign</span>
                </button>
              )}
            </div>
          </div>
        </article>

        {/* Seeker Activity Dashboard Widget (Visible strictly to authorized roles) */}
        <DashboardWidget
          seeker={seeker}
          currentUserRole={currentUserRole}
          allowedRoles={['super_admin', 'union_admin', 'worker']}
          onOpenChat={onOpenChat}
          onOpenLogModal={onOpenLogModal}
          onAddTask={handleAddTask}
        />

        {/* Discipleship Journey & Spiritual Milestones Tracker */}
        <article className="w-full bg-white rounded-2xl shadow-sm border border-[#e5eeff] p-4 sm:p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#d6e3ff] text-[#002046] flex items-center justify-center">
                <span className="material-symbols-outlined text-[17px]">timeline</span>
              </div>
              <h3 className="text-[16px] font-bold text-[#002046]">
                Discipleship Journey
              </h3>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#ffdcc3] text-[#6e3900] font-bold">
              {seeker.stageProgress}% Mapped
            </span>
          </div>

          <div className="w-full flex flex-col gap-1">
            <div className="w-full h-2 rounded-full bg-[#e5eeff] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1b365d] via-[#fe932c] to-[#904d00]"
                style={{ width: `${seeker.stageProgress}%` }}
              />
            </div>
          </div>

          {/* Curriculum */}
          <div className="p-3 rounded-xl bg-[#eff4ff] flex flex-col gap-1.5 border border-[#dce9ff]">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-bold text-[#002046]">
                {seeker.currentCurriculum?.title || 'One Voice 27 Discovery Track'}
              </span>
              <span className="text-[#904d00] font-semibold">
                {seeker.currentCurriculum?.unit || 'Unit 1'}
              </span>
            </div>
            <p className="text-[12px] text-[#44474e]">
              Next Focus: <strong>{seeker.currentCurriculum?.nextTopic}</strong>
            </p>
          </div>
        </article>

        {/* Pastoral Care Tasks (Available to workers) */}
        <article className="w-full bg-white rounded-2xl shadow-sm border border-[#e5eeff] p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#eff4ff] text-[#002046] flex items-center justify-center">
                <span className="material-symbols-outlined text-[17px]">task_alt</span>
              </div>
              <h3 className="text-[16px] font-bold text-[#002046]">
                Assigned Care Tasks
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAddTask}
              className="text-[12px] text-[#002046] font-bold hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Task</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {tasks.length === 0 ? (
              <p className="text-[12px] text-[#74777f] italic py-2">
                No active care tasks assigned yet.
              </p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="p-3 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex items-center justify-between cursor-pointer hover:bg-[#eff4ff] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        task.completed ? 'text-[#904d00]' : 'text-[#74777f]'
                      }`}
                    >
                      {task.completed ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-[13px] leading-tight truncate ${
                          task.completed
                            ? 'line-through text-[#74777f]'
                            : 'font-semibold text-[#002046]'
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className="text-[11px] text-[#44474e]">
                        {task.dueDateOrStatus}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        {/* Data Dignity & Erasure Option (GDPR Right to be Forgotten) */}
        <div className="pt-2 flex items-center justify-between border-t border-[#e5eeff]">
          <span className="text-[11px] text-[#74777f] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
            Section 31 Encrypted Storage
          </span>

          {onRequestDataDeletion && (
            <button
              type="button"
              onClick={() => {
                logUserAction({
                  action: 'requested data deletion',
                  userId: 'current-user-session',
                  role: currentUserRole,
                  targetId: seeker.id,
                  accessedCollection: 'seekers',
                  accessedData: `Requested GDPR Section 31 deletion for ${seeker.name} (${seeker.id})`,
                  location: currentUserUnion,
                });
                onRequestDataDeletion(seeker);
              }}
              className="text-[11px] font-bold text-[#ba1a1a] hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">delete_forever</span>
              <span>Request Data Erasure</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
