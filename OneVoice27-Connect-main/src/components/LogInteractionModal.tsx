import React, { useState } from 'react';
import { Seeker, PastoralTimelineEntry } from '../types';

interface LogInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  seeker: Seeker;
  onSaveEntry: (entry: PastoralTimelineEntry, advanceStage?: boolean) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const LogInteractionModal: React.FC<LogInteractionModalProps> = ({
  isOpen,
  onClose,
  seeker,
  onSaveEntry,
  showToast,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'visit' | 'phone' | 'audio' | 'church'>('visit');
  const [duration, setDuration] = useState('45 min');
  const [advanceStage, setAdvanceStage] = useState(true);
  const [notes, setNotes] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [selectedMilestones, setSelectedMilestones] = useState<string[]>([
    'Prayer Offered',
    'Steps to Christ Gifted',
    'Sabbath Service Invited',
    'Bible Study Conducted',
    'Transport Arranged',
  ]);
  const [assignDeacon, setAssignDeacon] = useState(true);

  const toggleMilestone = (m: string) => {
    if (selectedMilestones.includes(m)) {
      setSelectedMilestones(selectedMilestones.filter((item) => item !== m));
    } else {
      setSelectedMilestones([...selectedMilestones, m]);
    }
  };

  const handleVoiceDictation = () => {
    setIsDictating(true);
    showToast('Listening for Hindi / English dictation...', 'mic');
    setTimeout(() => {
      setIsDictating(false);
      setNotes((prev) => prev ? prev + ' [Voice note transcribed]' : '[Voice note transcribed: Inquirer requested prayer and fellowship]');
      showToast('Voice transcription attached', 'check_circle');
    }, 1400);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      showToast('Please provide a brief pastoral note', 'warning');
      return;
    }

    const newEntry: PastoralTimelineEntry = {
      id: `tl-${Date.now()}`,
      type: mode === 'audio' ? 'whatsapp' : mode,
      title:
        mode === 'visit'
          ? 'In-person Home Pastoral Visit'
          : mode === 'phone'
          ? 'Phone Pastoral Intake'
          : mode === 'audio'
          ? 'Audio Scripture Note'
          : 'Sabbath Church Greeting',
      duration: duration,
      timestamp: 'Today • 05:30 PM',
      loggedBy: 'Pr. Emmanuel Masih',
      notes: notes.trim(),
      tags: selectedMilestones,
    };

    onSaveEntry(newEntry, advanceStage);
    showToast('Pastoral interaction saved and synced with NIU Care Team!', 'cloud_sync');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#002046]/50 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-[#dce9ff]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header & Drag Handle */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 pt-3 pb-2.5 px-4 sm:px-6 border-b border-[#e5eeff] flex flex-col">
          <div className="w-12 h-1.5 rounded-full bg-[#d3e4fe] self-center mb-2.5 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[#002046] text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  menu_book
                </span>
                <h2 className="text-[17px] font-bold text-[#002046] truncate">
                  Log Pastoral Interaction
                </h2>
              </div>
              <p className="text-[12px] text-[#44474e] truncate mt-0.5">
                {seeker.name} • {seeker.assignedChurch} (Delhi Metro)
              </p>
            </div>

            <button
              aria-label="Close"
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#eff4ff] hover:bg-[#e5eeff] text-[#44474e] flex items-center justify-center transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[19px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          {/* Ministry Engagement Mode */}
          <section className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-[#002046]">
                Ministry Engagement Mode
              </label>
              <span className="text-[11px] text-[#44474e]">Field Record</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: 'visit' as const,
                  title: 'Home Pastoral Visit',
                  sub: 'In-Person Encounter',
                  icon: 'home',
                },
                {
                  id: 'phone' as const,
                  title: 'Phone / WhatsApp',
                  sub: 'Voice Fellowship',
                  icon: 'phone_in_talk',
                },
                {
                  id: 'audio' as const,
                  title: 'Audio / WhatsApp',
                  sub: 'Scripture Note',
                  icon: 'mic',
                },
                {
                  id: 'church' as const,
                  title: 'Church / Sabbath',
                  sub: 'Sanctuary Greeting',
                  icon: 'church',
                },
              ].map((item) => {
                const isSelected = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all border ${
                      isSelected
                        ? 'bg-[#002046] text-white border-[#002046] shadow-sm'
                        : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff] border-transparent'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-white/15 text-white'
                          : 'bg-white text-[#002046] shadow-2xs'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {item.icon}
                      </span>
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[12px] font-bold truncate">
                        {item.title}
                      </span>
                      <span
                        className={`text-[10px] truncate ${
                          isSelected ? 'text-white/80' : 'text-[#44474e]'
                        }`}
                      >
                        {item.sub}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Encounter Logistics */}
          <section className="flex flex-col gap-1.5 bg-[#eff4ff] p-3 rounded-xl border border-[#dce9ff]">
            <label className="text-[12px] font-bold text-[#44474e]">
              Encounter Logistics
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#dce9ff] shadow-2xs">
                <span className="material-symbols-outlined text-[17px] text-[#002046]">
                  calendar_today
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-[#74777f]">Date</span>
                  <span className="text-[12px] text-[#002046] font-bold truncate">
                    Today, Oct 10, 2024
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#dce9ff] shadow-2xs">
                <span className="material-symbols-outlined text-[17px] text-[#002046]">
                  schedule
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-[#74777f]">Time</span>
                  <span className="text-[12px] text-[#002046] font-bold truncate">
                    05:30 PM (IST)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[11px] text-[#44474e] font-medium">
                Duration of Spiritual Counsel
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {['15 min', '30 min', '45 min', '60+ min'].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setDuration(dur)}
                    className={`py-1.5 text-center rounded-lg text-[11px] font-bold transition-all ${
                      duration === dur
                        ? 'bg-[#1b365d] text-white shadow-2xs'
                        : 'bg-white text-[#44474e] hover:bg-[#dce9ff] border border-[#dce9ff]'
                    }`}
                  >
                    {dur} {duration === dur ? '✓' : ''}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Discipleship Pathway Stage */}
          <section className="flex flex-col gap-2 bg-[#eff4ff] p-3 rounded-xl border border-[#dce9ff]">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-[#002046] flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-[#fe932c]">
                  trending_up
                </span>
                Discipleship Pathway Stage
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ffdcc3] text-[#2f1500] font-bold">
                Stage 3 of 6
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-[#dce9ff] flex items-center justify-between shadow-2xs">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-[#74777f]">
                  Current Verified Milestone
                </span>
                <span className="text-[13px] text-[#002046] font-bold truncate">
                  Stage 3: Active Bible Study
                </span>
              </div>
              <span className="material-symbols-outlined text-[#002046] text-[20px]">
                check_circle
              </span>
            </div>

            <label className="flex items-center gap-2.5 bg-[#dce9ff]/70 p-2.5 rounded-xl cursor-pointer hover:bg-[#dce9ff] transition-colors border border-[#aec7f7]">
              <input
                type="checkbox"
                checked={advanceStage}
                onChange={(e) => setAdvanceStage(e.target.checked)}
                className="w-5 h-5 rounded text-[#002046] accent-[#002046] cursor-pointer shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] text-[#002046] font-bold">
                  Advance to Stage 4: Sabbath Service Invited
                </span>
                <span className="text-[11px] text-[#44474e] truncate">
                  Inquirer accepted invitation to Central SDA this Sabbath
                </span>
              </div>
            </label>
          </section>

          {/* Curriculum Completed & Next Lesson */}
          <section className="flex flex-col gap-2 bg-[#eff4ff] p-3 rounded-xl border border-[#dce9ff]">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-[#002046] flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-[#002046]">
                  auto_stories
                </span>
                One Voice 27 Discovery Curriculum
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#44474e] border border-[#dce9ff]">
                Hindi Edition (हिंदी)
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="bg-white p-2.5 rounded-xl border border-[#dce9ff] flex items-start gap-2 shadow-2xs">
                <div className="w-5 h-5 rounded-full bg-[#002046] flex items-center justify-center text-white mt-0.5 shrink-0">
                  <span className="material-symbols-outlined text-[13px]">done</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-[#74777f]">
                    Completed in Session:
                  </span>
                  <span className="text-[12px] text-[#002046] font-bold">
                    Lesson 3: The Sanctuary &amp; Finding Hope in Prophecy
                  </span>
                  <span className="text-[11px] text-[#44474e]">
                    Daniel 2, 8:14 • Questions Answered with Scripture
                  </span>
                </div>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-[#dce9ff] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[#904d00] text-[18px] shrink-0">
                    assignment_turned_in
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-[#904d00] font-bold">
                      Assigned for Oct 12:
                    </span>
                    <span className="text-[12px] text-[#0b1c30] truncate">
                      Lesson 4: The Law, Grace &amp; Sabbath Rest
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#74777f] text-[18px]">
                  edit_note
                </span>
              </div>
            </div>
          </section>

          {/* Pastoral Observations & Prayer Needs */}
          <section className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="pastoral-obs"
                className="text-[13px] font-bold text-[#002046] flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[17px]">notes</span>
                Pastoral Observations &amp; Prayer Needs
              </label>

              <button
                type="button"
                onClick={handleVoiceDictation}
                disabled={isDictating}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#dce9ff] text-[#002046] text-[11px] font-bold hover:bg-[#d3e4fe] active:scale-95 transition-all border border-[#aec7f7]"
              >
                <span
                  className={`material-symbols-outlined text-[14px] text-[#fe932c] ${
                    isDictating ? 'animate-pulse' : ''
                  }`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  mic
                </span>
                <span>{isDictating ? 'Listening...' : 'Dictate (हिंदी / EN)'}</span>
              </button>
            </div>

            <div className="relative bg-white rounded-xl shadow-xs border border-[#dce9ff] p-3">
              <textarea
                id="pastoral-obs"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Record pastoral observations, scriptures read, family prayer requests, and next steps..."
                className="w-full bg-transparent text-[13px] text-[#0b1c30] resize-none focus:outline-none placeholder:text-[#74777f]"
              />
              <div className="flex items-center justify-between pt-2 border-t border-[#eff4ff] text-[11px] text-[#74777f]">
                <span className="flex items-center gap-1 text-[#6e3900]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fe932c]" />
                  Auto-saved to local offline store
                </span>
                <span>{notes.length} characters</span>
              </div>
            </div>
          </section>

          {/* Spiritual Milestones & Actions (Toggle Chips) */}
          <section className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-[#002046]">
                Spiritual Milestones &amp; Actions
              </label>
              <span className="text-[11px] text-[#74777f]">Tap to toggle</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                'Prayer Offered',
                'Steps to Christ Gifted',
                'Sabbath Service Invited',
                'Bible Study Conducted',
                'Health Message Shared',
                'Family Counseled',
                'Transport Arranged',
                'Baptism Discussed',
              ].map((milestone) => {
                const isSelected = selectedMilestones.includes(milestone);
                return (
                  <button
                    key={milestone}
                    type="button"
                    onClick={() => toggleMilestone(milestone)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all shadow-2xs ${
                      isSelected
                        ? milestone === 'Transport Arranged'
                          ? 'bg-[#ffdcc3] text-[#2f1500] border border-[#fe932c]'
                          : 'bg-[#002046] text-white border border-[#002046]'
                        : 'bg-[#eff4ff] text-[#44474e] hover:text-[#002046] border border-[#dce9ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {isSelected ? 'check' : 'add'}
                    </span>
                    <span>{milestone}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Next Scheduled Follow-up */}
          <section className="flex flex-col gap-1.5 bg-[#eff4ff] p-3 rounded-xl border border-[#dce9ff]">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-[#002046] flex items-center gap-1">
                <span className="material-symbols-outlined text-[17px] text-[#904d00]">
                  event_upcoming
                </span>
                Next Scheduled Pastoral Follow-Up
              </label>
              <span className="text-[11px] text-[#904d00] font-bold">
                Sabbath Morning
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-[#dce9ff] flex flex-col gap-2 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#dce9ff] flex items-center justify-center text-[#002046] shrink-0">
                  <span className="material-symbols-outlined text-[18px]">
                    notifications_active
                  </span>
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-bold text-[#002046]">
                    Saturday, Oct 12 • 09:15 AM
                  </span>
                  <span className="text-[11px] text-[#44474e] truncate">
                    Central SDA Church Main Entrance, Delhi
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-2 pt-2 border-t border-[#eff4ff] cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignDeacon}
                  onChange={(e) => setAssignDeacon(e.target.checked)}
                  className="w-4 h-4 rounded text-[#002046] accent-[#002046]"
                />
                <span className="text-[11px] text-[#0b1c30] font-medium">
                  Assign Duty Deacon for transport &amp; welcome reception
                </span>
              </label>
            </div>
          </section>

          {/* Sticky Bottom Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-[#002046] hover:bg-[#1b365d] text-white text-[14px] font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all"
            >
              <span className="material-symbols-outlined text-[19px]">
                cloud_sync
              </span>
              <span>Save &amp; Sync Pastoral Log</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  showToast('Pastoral note draft saved locally', 'bookmark');
                  onClose();
                }}
                className="h-10 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#002046] text-[12px] font-bold flex items-center justify-center gap-1 border border-[#dce9ff]"
              >
                <span className="material-symbols-outlined text-[16px]">
                  bookmark_border
                </span>
                <span>Save as Draft</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl text-[#74777f] hover:bg-[#eff4ff] text-[12px] font-semibold flex items-center justify-center"
              >
                Cancel &amp; Discard
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
