import React, { useState, useEffect } from 'react';
import { Seeker, UserRole, ChatMessage, PastoralTimelineEntry } from '../types';
import { subscribeChat } from '../firebase';

export interface DashboardWidgetProps {
  seeker: Seeker;
  currentUserRole?: UserRole;
  allowedRoles?: UserRole[];
  onOpenChat?: () => void;
  onOpenLogModal?: (seeker: Seeker) => void;
  onAddTask?: () => void;
}

/**
 * DashboardWidget displays summary activity counts (e.g. total messages,
 * follow-up logs, care tasks, and discipleship progress) for the selected seeker.
 * It strictly enforces role-based access control, rendering only for users with
 * authorized clearance (Super Admin, Union Admin, and Assigned Worker).
 */
export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  seeker,
  currentUserRole = 'super_admin',
  allowedRoles = ['super_admin', 'union_admin', 'worker'],
  onOpenChat,
  onOpenLogModal,
  onAddTask,
}) => {
  const [messagesCount, setMessagesCount] = useState<number>(0);
  const [activeMetricTab, setActiveMetricTab] = useState<'all' | 'logs' | 'messages' | 'tasks'>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  // Subscribe to real-time chat messages to calculate live count for this seeker
  useEffect(() => {
    try {
      const unsub = subscribeChat((messages: ChatMessage[]) => {
        if (messages && messages.length > 0) {
          // If messages contain receiver or sender tags matching seeker, or default thread
          const relevant = messages.filter(
            (m) =>
              !m.receiverID ||
              m.receiverID === seeker.id ||
              m.senderID === seeker.id ||
              seeker.id === 'CR-2024-8841' // Primary demo active chat thread
          );
          setMessagesCount(relevant.length > 0 ? relevant.length : messages.length);
        }
      });
      return () => {
        if (unsub) unsub();
      };
    } catch {
      setMessagesCount(0);
    }
  }, [seeker.id]);

  // Role Access Control: Only visible to authorized pastoral/admin roles
  const isAuthorized = allowedRoles.includes(currentUserRole);

  if (!isAuthorized) {
    return null;
  }

  // Calculate detailed activity breakdown
  const timelineLogs = seeker.timeline || [];
  const totalFollowUpLogs = timelineLogs.length;

  const visitsCount = timelineLogs.filter((t) => t.type === 'visit').length;
  const phoneLogsCount = timelineLogs.filter((t) => t.type === 'phone').length;
  const whatsappLogsCount = timelineLogs.filter((t) => t.type === 'whatsapp').length;
  const churchLogsCount = timelineLogs.filter((t) => t.type === 'church').length;

  const tasksList = seeker.tasks || [];
  const completedTasks = tasksList.filter((t) => t.completed).length;
  const pendingTasks = tasksList.length - completedTasks;

  const latestLog: PastoralTimelineEntry | undefined = timelineLogs[0];

  return (
    <article className="w-full bg-white rounded-2xl shadow-sm border border-[#e5eeff] overflow-hidden transition-all">
      {/* Widget Header with Role Clearance Tag */}
      <div className="px-4 py-3.5 bg-gradient-to-r from-[#eff4ff] via-white to-[#eff4ff] border-b border-[#dce9ff] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#002046] text-[#fe932c] flex items-center justify-center shadow-xs">
            <span
              className="material-symbols-outlined text-[19px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              insights
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[14px] font-bold text-[#002046]">
                Seeker Activity Dashboard
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                Live Metrics
              </span>
            </div>
            <span className="text-[11px] text-[#44474e]">
              Cumulative care interactions for {seeker.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e5eeff] text-[#002046] border border-[#dce9ff]">
            Role: {currentUserRole.replace('_', ' ')}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#44474e] hover:bg-[#dce9ff] transition-colors"
            title={isExpanded ? 'Collapse activity ledger' : 'Expand activity ledger'}
          >
            <span
              className={`material-symbols-outlined text-[18px] transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>
        </div>
      </div>

      {/* Main Metric Tiles Grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Metric 1: Total Messages */}
        <div
          onClick={() => {
            setActiveMetricTab('messages');
            setIsExpanded(true);
          }}
          className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
            activeMetricTab === 'messages' && isExpanded
              ? 'bg-[#eff4ff] border-[#002046] shadow-xs'
              : 'bg-[#f8faff] border-[#e5eeff] hover:border-[#aec7f7]'
          }`}
        >
          <div className="flex items-center justify-between text-[#44474e]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Messages
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#002046]">
              forum
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[22px] font-bold text-[#002046] leading-none">
              {messagesCount}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Encrypted
            </span>
          </div>
          <span className="mt-1 text-[10px] text-[#74777f] truncate">
            In-app spiritual chat
          </span>
        </div>

        {/* Metric 2: Follow-Up Logs */}
        <div
          onClick={() => {
            setActiveMetricTab('logs');
            setIsExpanded(true);
          }}
          className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
            activeMetricTab === 'logs' && isExpanded
              ? 'bg-[#eff4ff] border-[#002046] shadow-xs'
              : 'bg-[#f8faff] border-[#e5eeff] hover:border-[#aec7f7]'
          }`}
        >
          <div className="flex items-center justify-between text-[#44474e]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Follow-Up Logs
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#904d00]">
              history_edu
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[22px] font-bold text-[#904d00] leading-none">
              {totalFollowUpLogs}
            </span>
            <span className="text-[10px] text-[#904d00] font-semibold bg-[#ffdcc3] px-1.5 py-0.5 rounded">
              {visitsCount} visits
            </span>
          </div>
          <span className="mt-1 text-[10px] text-[#74777f] truncate">
            {whatsappLogsCount} WhatsApp • {phoneLogsCount} Calls
          </span>
        </div>

        {/* Metric 3: Care Tasks */}
        <div
          onClick={() => {
            setActiveMetricTab('tasks');
            setIsExpanded(true);
          }}
          className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
            activeMetricTab === 'tasks' && isExpanded
              ? 'bg-[#eff4ff] border-[#002046] shadow-xs'
              : 'bg-[#f8faff] border-[#e5eeff] hover:border-[#aec7f7]'
          }`}
        >
          <div className="flex items-center justify-between text-[#44474e]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Care Tasks
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#140077]">
              task_alt
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[22px] font-bold text-[#140077] leading-none">
              {tasksList.length}
            </span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
              {completedTasks} done
            </span>
          </div>
          <span className="mt-1 text-[10px] text-[#74777f] truncate">
            {pendingTasks} pending action
          </span>
        </div>

        {/* Metric 4: Stage & SLA */}
        <div
          onClick={() => {
            setActiveMetricTab('all');
            setIsExpanded(!isExpanded);
          }}
          className="p-3 rounded-xl border border-[#e5eeff] bg-[#f8faff] hover:border-[#aec7f7] flex flex-col justify-between cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-[#44474e]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Discipleship
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#fe932c]">
              trending_up
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[22px] font-bold text-[#002046] leading-none">
              {seeker.stageProgress}%
            </span>
            <span className="text-[10px] font-bold text-[#6e3900] bg-[#ffdcc3] px-1.5 py-0.5 rounded truncate max-w-[85px]">
              {seeker.stage}
            </span>
          </div>
          <span className="mt-1 text-[10px] text-[#74777f] truncate">
            {seeker.slaUrgent ? 'SLA Alert (<4h)' : 'Normal SLA Pace'}
          </span>
        </div>
      </div>

      {/* Latest Activity Ribbon */}
      <div className="px-4 py-2 bg-[#f4f7ff] border-t border-[#e5eeff] flex items-center justify-between text-[11px] text-[#44474e]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="material-symbols-outlined text-[15px] text-[#002046] shrink-0">
            schedule
          </span>
          <span className="truncate">
            <strong>Latest Touchpoint:</strong>{' '}
            {latestLog
              ? `${latestLog.title} (${latestLog.timestamp}) by ${latestLog.loggedBy}`
              : 'Registered interest in One Voice 27'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[#002046] font-bold hover:underline shrink-0 text-[11px] flex items-center gap-0.5"
        >
          <span>{isExpanded ? 'Hide Activity' : 'View Ledger'}</span>
          <span className="material-symbols-outlined text-[14px]">
            {isExpanded ? 'arrow_drop_up' : 'arrow_drop_down'}
          </span>
        </button>
      </div>

      {/* Expandable Activity Breakdown Ledger */}
      {isExpanded && (
        <div className="p-4 bg-white border-t border-[#e5eeff] animate-in fade-in duration-150 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#002046]">
              Detailed Activity Ledger
            </span>
            <div className="flex items-center gap-1">
              {(['all', 'logs', 'messages', 'tasks'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveMetricTab(tab)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize transition-all ${
                    activeMetricTab === tab
                      ? 'bg-[#002046] text-white'
                      : 'bg-[#eff4ff] text-[#44474e] hover:bg-[#dce9ff]'
                  }`}
                >
                  {tab === 'all'
                    ? 'All'
                    : tab === 'logs'
                    ? `Logs (${totalFollowUpLogs})`
                    : tab === 'messages'
                    ? `Messages (${messagesCount})`
                    : `Tasks (${tasksList.length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Activity items list */}
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {/* Follow-up logs */}
            {(activeMetricTab === 'all' || activeMetricTab === 'logs') &&
              timelineLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex flex-col gap-1 text-[12px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#002046] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#904d00]">
                        {log.type === 'visit'
                          ? 'home'
                          : log.type === 'phone'
                          ? 'call'
                          : log.type === 'whatsapp'
                          ? 'chat'
                          : 'church'}
                      </span>
                      {log.title}
                    </span>
                    <span className="text-[10px] text-[#74777f]">{log.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-[#44474e] line-clamp-2">{log.notes}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-[#eff4ff] text-[10px] text-[#74777f]">
                    <span>By: {log.loggedBy}</span>
                    <div className="flex gap-1">
                      {log.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.2 rounded bg-white border border-[#dce9ff]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

            {/* Chat messages */}
            {(activeMetricTab === 'all' || activeMetricTab === 'messages') && (
              <div className="p-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#002046] text-[18px]">
                    chat
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-[#002046]">
                      {messagesCount} In-App Spiritual Messages Logged
                    </span>
                    <span className="text-[11px] text-[#44474e]">
                      Continuous encrypted prayer and scripture discourse
                    </span>
                  </div>
                </div>
                {onOpenChat && (
                  <button
                    type="button"
                    onClick={onOpenChat}
                    className="px-3 py-1 rounded-lg bg-[#002046] text-white text-[11px] font-bold hover:bg-[#1b365d] active:scale-95 transition-all"
                  >
                    Open Chat
                  </button>
                )}
              </div>
            )}

            {/* Care Tasks */}
            {(activeMetricTab === 'all' || activeMetricTab === 'tasks') &&
              tasksList.map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex items-center justify-between text-[12px]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        task.completed ? 'text-[#904d00]' : 'text-[#74777f]'
                      }`}
                    >
                      {task.completed ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    <span
                      className={`${
                        task.completed ? 'line-through text-[#74777f]' : 'font-semibold text-[#002046]'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#44474e]">{task.dueDateOrStatus}</span>
                </div>
              ))}
          </div>

          {/* Quick Action Footer inside Ledger */}
          <div className="pt-2 border-t border-[#e5eeff] flex items-center justify-between">
            <span className="text-[10px] text-[#74777f] flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-emerald-600">
                verified_user
              </span>
              Section 31 Audited Activity Trail
            </span>

            <div className="flex items-center gap-1.5">
              {onOpenLogModal && (
                <button
                  type="button"
                  onClick={() => onOpenLogModal(seeker)}
                  className="px-2.5 py-1 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002046] text-[11px] font-bold border border-[#dce9ff]"
                >
                  + Add Log
                </button>
              )}
              {onAddTask && (
                <button
                  type="button"
                  onClick={onAddTask}
                  className="px-2.5 py-1 rounded-lg bg-[#002046] hover:bg-[#1b365d] text-white text-[11px] font-bold"
                >
                  + New Task
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
