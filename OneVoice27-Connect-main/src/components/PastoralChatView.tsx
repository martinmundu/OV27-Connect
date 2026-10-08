import React, { useState, useEffect } from 'react';
import { ChatMessage, UserRole, Seeker, SeekerTask } from '../types';
import { subscribeChat, persistChatMessage, recordAuditLog, fetchSeekerPrivateData } from '../firebase';
import { canViewSeekerPII } from '../security';
import { User as FirebaseUser } from 'firebase/auth';

interface PastoralChatViewProps {
  onBack?: () => void;
  initialSeeker?: Seeker | null;
  allSeekers?: Seeker[];
  workerTasks?: SeekerTask[];
  currentUser?: FirebaseUser | null;
  currentUserRole?: UserRole;
  currentUserUnion?: string;
  showToast: (msg: string, icon?: string) => void;
}

export const PastoralChatView: React.FC<PastoralChatViewProps> = ({
  onBack,
  initialSeeker,
  allSeekers = [],
  workerTasks = [],
  currentUser,
  currentUserRole = 'worker',
  currentUserUnion = 'Delhi Metro Region',
  showToast,
}) => {
  const isWorker = currentUserRole === 'worker';
  const isPIIAllowed = canViewSeekerPII(currentUserRole) && !isWorker;

  // Filter contacts by role:
  // Workers construct contacts strictly from authorized workerTasks (Firestore /seekers_tasks)
  // Union Admin accesses only their Union's seekers
  // Super Admin accesses all seekers
  const accessibleSeekers = currentUserRole === 'union_admin'
    ? allSeekers.filter((s) => s.assignedUnion === currentUserUnion)
    : allSeekers;

  // Available chat targets: Pastor Massey + Authorized Contacts
  // Workers receive ONLY case number, opaque seeker ID, assigned task, assigned chat.
  // NO seeker full name, NO phone, NO email, NO residential address, NO personal notes.
  const contacts = isWorker
    ? [
        {
          id: 'pastor-massey',
          name: 'Pastor P. Massey',
          roleSubtitle: 'Central SDA Church Shepherd • In-App Channel',
          avatarUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuB_eKZCs2PvvT8G-OyalztIvHY7_FUBRVkTqMHvSFgzWLKP2oDOznZbpaL41LaQP46K03bIej4cREb798-wcgR_53P-TpnyWtpMilCxwWejX1YZcWm_hcbNQcCoIOTKGoArtn5oOS3-HBnwXuRUJGVT4EMwWwQeUTD-04QdNL7t2pP3ZTAlkzaKKCCFryFU_dVZBrO9AWLcqphLGzak5WO0BRLQx4y9_6wVvkwNxbvxWP96m7Z-YvXwmA',
          isPastor: true,
          seekerRef: null,
          phone: '',
          email: '',
          address: '',
          stage: 'Senior Pastor',
          notes: '',
        },
        ...workerTasks.map((t) => {
          const caseNumber = t.caseNumber || `Case #${t.seekerId?.split('-').pop() || t.id}`;
          return {
            id: t.chatReference || t.seekerId || t.id,
            name: caseNumber,
            roleSubtitle: `Task: ${t.taskTitle || t.title}`,
            avatarUrl:
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
            isPastor: false,
            seekerRef: null,
            phone: '',
            email: '',
            address: '',
            stage: t.stage || 'In Progress',
            notes: '',
            seekerId: t.seekerId,
          };
        }),
      ]
    : [
        {
          id: 'pastor-massey',
          name: 'Pastor P. Massey',
          roleSubtitle: 'Central SDA Church Shepherd • Hindi & English',
          avatarUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuB_eKZCs2PvvT8G-OyalztIvHY7_FUBRVkTqMHvSFgzWLKP2oDOznZbpaL41LaQP46K03bIej4cREb798-wcgR_53P-TpnyWtpMilCxwWejX1YZcWm_hcbNQcCoIOTKGoArtn5oOS3-HBnwXuRUJGVT4EMwWwQeUTD-04QdNL7t2pP3ZTAlkzaKKCCFryFU_dVZBrO9AWLcqphLGzak5WO0BRLQx4y9_6wVvkwNxbvxWP96m7Z-YvXwmA',
          isPastor: true,
          seekerRef: null,
          phone: isPIIAllowed ? '+91 11 2334 0000' : '',
          email: isPIIAllowed ? 'pastor.massey@central.sda' : '',
          address: isPIIAllowed ? 'Central SDA Church, 11 Hailey Road, Connaught Place, New Delhi' : '',
          stage: 'Senior Pastor',
          notes: 'Senior Minister, Central SDA Church • Connaught Place, New Delhi',
        },
        ...accessibleSeekers.map((s) => {
          return {
            id: s.id,
            name: s.name,
            roleSubtitle: `Seeker • ${s.assignedChurch} • ${s.assignedUnion}`,
            avatarUrl: s.avatarUrl,
            isPastor: false,
            seekerRef: s,
            phone: '',
            email: '',
            address: isPIIAllowed ? s.location : '',
            stage: s.stage,
            notes: isPIIAllowed ? s.inquiryQuote : '',
          };
        }),
      ];

  // Default active contact: initialSeeker if passed, otherwise Pastor Massey
  const defaultContact = initialSeeker
    ? contacts.find((c) => c.id === initialSeeker.id) || contacts[1] || contacts[0]
    : contacts[0];

  const [activeContact, setActiveContact] = useState(defaultContact);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showContactDetailsModal, setShowContactDetailsModal] = useState(false);
  const [contactPrivateData, setContactPrivateData] = useState<{
    phone?: string;
    email?: string;
    address?: string;
    personalNotes?: string;
  } | null>(null);

  useEffect(() => {
    if (showContactDetailsModal && isPIIAllowed && !activeContact.isPastor) {
      fetchSeekerPrivateData(activeContact.id, currentUserRole).then((data) => {
        if (data) {
          setContactPrivateData(data);
        }
      });
    } else {
      setContactPrivateData(null);
    }
  }, [showContactDetailsModal, activeContact.id, isPIIAllowed, currentUserRole]);

  // Sync real-time messages from Firestore with strict participant query filter
  useEffect(() => {
    if (!currentUser?.uid) return;
    const currentUid = currentUser.uid;
    const unsub = subscribeChat(
      (remoteMsgs) => {
        setMessages(remoteMsgs || []);
      },
      currentUid,
      currentUserRole
    );

    return () => unsub();
  }, [currentUser?.uid, currentUserRole]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (!currentUser?.uid) {
      showToast('Authentication required to send message', 'error');
      return;
    }

    const messageText = inputText.trim();
    const currentUid = currentUser.uid;
    const participants = [currentUid, activeContact.id];

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderID: currentUid,
      receiverID: activeContact.id,
      participants,
      role: currentUserRole,
      sender: activeContact.isPastor ? 'seeker' : 'pastor',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    showToast('Secure message sent over encrypted internal channel', 'send');

    // Persist to Firestore
    persistChatMessage(newMsg, currentUid);
    recordAuditLog(
      'SEND_INTERNAL_CHAT',
      `Chat with: ${activeContact.name} (${activeContact.id}) | Role: ${currentUserRole}`,
      { uid: currentUser?.uid, role: currentUserRole }
    );

    // Simulate automated response
    setIsTyping(true);
    setTimeout(() => {
      const replyText = activeContact.isPastor
        ? 'Grace and peace to you. Your message has been received by our pastoral team at Central SDA Church. We are upholding your family this Sabbath.'
        : `Thank you for checking in with me! I have been reading the scripture passages and looking forward to our next Sabbath fellowship.`;

      const automatedReply: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        senderID: activeContact.id,
        receiverID: currentUid,
        participants,
        role: activeContact.isPastor ? 'pastor' : 'seeker',
        sender: activeContact.isPastor ? 'pastor' : 'seeker',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, automatedReply]);
      setIsTyping(false);
      persistChatMessage(automatedReply, currentUid);
    }, 1800);
  };

  const handlePromptClick = (promptText: string) => {
    setInputText(promptText);
  };

  const toggleAudio = () => {
    setIsPlayingAudio(!isPlayingAudio);
    showToast(
      isPlayingAudio
        ? 'Audio prayer paused'
        : `Playing audio blessing...`,
      isPlayingAudio ? 'pause' : 'volume_up'
    );
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto pb-24 select-none">
      {/* Contact Switcher Tray */}
      <div className="bg-[#e5eeff] px-4 py-2 border-b border-[#d3e4fe] flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-bold text-[#002046] uppercase tracking-wider shrink-0 flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">forum</span>
          <span>Conversations:</span>
        </span>

        {contacts.map((c) => {
          const isSelected = activeContact.id === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setActiveContact(c);
                showToast(`Switched chat to ${c.name}`, 'chat');
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 ${
                isSelected
                  ? 'bg-[#002046] text-white shadow-xs'
                  : 'bg-white text-[#002046] hover:bg-[#dce9ff] border border-[#d3e4fe]'
              }`}
            >
              <img
                className="w-4 h-4 rounded-full object-cover shrink-0"
                alt={c.name}
                src={c.avatarUrl}
              />
              <span>{c.name.split(' ')[0]}</span>
              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          );
        })}
      </div>

      {/* Pastoral Chat Sub-Header */}
      <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-xs border-b border-[#e5eeff]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <button
                aria-label="Back"
                type="button"
                onClick={onBack}
                className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-[#44474e] hover:text-[#002046] hover:bg-[#eff4ff] transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[24px]">arrow_back</span>
              </button>
            )}

            <div
              className="relative shrink-0 cursor-pointer"
              onClick={() => setShowContactDetailsModal(true)}
              title="Click to view details / privacy status"
            >
              <img
                className="w-11 h-11 rounded-full object-cover shadow-xs ring-2 ring-[#aec7f7]"
                alt={activeContact.name}
                src={activeContact.avatarUrl}
              />
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white"
                title="Active & Online"
              />
            </div>

            <div
              className="flex flex-col min-w-0 cursor-pointer"
              onClick={() => setShowContactDetailsModal(true)}
            >
              <div className="flex items-center gap-1.5">
                <h2 className="text-[15px] font-bold text-[#002046] truncate leading-tight hover:underline">
                  {activeContact.name}
                </h2>
                <span
                  className="material-symbols-outlined text-[16px] text-[#904d00] shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  title="Verified Contact"
                >
                  verified
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#eff4ff] text-[#002046] border border-[#dce9ff]">
                  {activeContact.stage}
                </span>
              </div>
              <span className="text-[11px] text-[#44474e] truncate">
                {activeContact.roleSubtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Contact Details & Privacy Inspection Button */}
            <button
              type="button"
              onClick={() => setShowContactDetailsModal(true)}
              className={`px-2.5 py-1 rounded-full flex items-center gap-1 text-[11px] font-bold transition-colors border ${
                isPIIAllowed
                  ? 'bg-[#eff4ff] text-[#002046] border-[#dce9ff] hover:bg-[#dce9ff]'
                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
              }`}
              title={isPIIAllowed ? 'View Full Contact Dossier' : 'Personal Details Protected for your role'}
            >
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isPIIAllowed ? 'badge' : 'lock'}
              </span>
              <span>{isPIIAllowed ? 'Contact Info' : 'PII Hidden'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Role-Based Privacy Notice Ribbon */}
      <div className="px-4 pt-2.5 pb-1">
        {isPIIAllowed ? (
          <div className="bg-[#eff4ff] rounded-2xl p-2.5 px-3 flex items-center justify-between border border-[#dce9ff] text-[11px] text-[#002046]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
              Admin Clearance: Full contact details visible under Section 20 authority.
            </span>
            <button
              type="button"
              onClick={() => setShowContactDetailsModal(true)}
              className="text-[#904d00] font-bold underline shrink-0 ml-2"
            >
              View Info
            </button>
          </div>
        ) : (
          <div className="bg-amber-50 rounded-2xl p-2.5 px-3 flex items-center justify-between border border-amber-200 text-[11px] text-amber-900">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-[16px] text-amber-700">lock</span>
              Personal details hidden for lower users. In-app messaging is active and fully functional.
            </span>
            <button
              type="button"
              onClick={() => setShowContactDetailsModal(true)}
              className="text-amber-800 font-bold underline shrink-0 ml-2"
            >
              Check Status
            </button>
          </div>
        )}
      </div>

      {/* Chat History Stream */}
      <div className="flex flex-col px-4 py-3 gap-3.5" id="chat-thread">
        <div className="flex justify-center my-1">
          <span className="px-3 py-1 rounded-full bg-[#eff4ff] text-[11px] font-semibold text-[#44474e] border border-[#dce9ff]">
            Today • Encrypted Ministry Session
          </span>
        </div>

        {messages.map((msg) => {
          const isPastor = msg.sender === 'pastor';

          if (msg.audioPrayer) {
            return (
              <div key={msg.id} className="flex items-end gap-2 max-w-[92%]">
                <img
                  className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 ring-1 ring-[#aec7f7]"
                  alt="Avatar"
                  src={activeContact.avatarUrl}
                />
                <div className="bg-white text-[#0b1c30] rounded-2xl rounded-bl-sm p-3.5 shadow-xs border border-[#e5eeff] flex flex-col gap-2 w-full">
                  <div className="flex items-center justify-between border-b pb-2 border-[#eff4ff]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="material-symbols-outlined text-[#904d00] text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        graphic_eq
                      </span>
                      <span className="text-[12px] font-bold text-[#002046]">
                        Pastoral Audio Blessing &amp; Prayer
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#44474e]">
                      {msg.audioPrayer.duration}
                    </span>
                  </div>

                  <p className="text-[12px] italic text-[#44474e] bg-[#eff4ff] p-2.5 rounded-xl border border-[#dce9ff]">
                    {msg.audioPrayer.scriptureSnippet}
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={toggleAudio}
                      className="w-10 h-10 rounded-full bg-[#002046] hover:bg-[#1b365d] text-white flex items-center justify-center transition-all shadow-xs shrink-0"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {isPlayingAudio ? 'pause' : 'play_arrow'}
                      </span>
                    </button>

                    <div className="flex-1 flex items-center gap-1">
                      {[40, 65, 30, 85, 95, 50, 70, 45, 90, 60, 40, 75, 35, 80, 50].map(
                        (h, idx) => (
                          <div
                            key={idx}
                            className={`flex-1 rounded-full transition-all duration-300 ${
                              isPlayingAudio ? 'bg-[#904d00]' : 'bg-[#aec7f7]'
                            }`}
                            style={{
                              height: `${
                                isPlayingAudio ? Math.max(12, ((h * (idx % 2 + 1)) % 28)) : h / 3.5
                              }px`,
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (msg.scheduleCard) {
            return (
              <div key={msg.id} className="flex items-end gap-2 max-w-[92%]">
                <img
                  className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 ring-1 ring-[#aec7f7]"
                  alt="Avatar"
                  src={activeContact.avatarUrl}
                />
                <div className="bg-white text-[#0b1c30] rounded-2xl rounded-bl-sm p-4 shadow-xs border border-[#e5eeff] flex flex-col gap-2.5 w-full">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#002046] text-[20px]">
                      church
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#002046]">
                        {msg.scheduleCard.title}
                      </span>
                      <span className="text-[11px] text-[#44474e]">
                        {msg.scheduleCard.location}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-[#eff4ff] p-2.5 rounded-xl border border-[#dce9ff] text-[12px]">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-[#74777f]">
                        Sabbath School
                      </span>
                      <span className="font-bold text-[#002046]">
                        {msg.scheduleCard.sabbathSchoolTime}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-[#74777f]">
                        Divine Worship
                      </span>
                      <span className="font-bold text-[#002046]">
                        {msg.scheduleCard.divineServiceTime}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#44474e] italic">
                    {msg.scheduleCard.potluckNote}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${
                isPastor ? 'justify-start max-w-[85%]' : 'justify-end max-w-[85%] ml-auto'
              }`}
            >
              {isPastor && (
                <img
                  className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 ring-1 ring-[#aec7f7]"
                  alt="Avatar"
                  src={activeContact.avatarUrl}
                />
              )}

              <div
                className={`rounded-2xl p-3 shadow-xs flex flex-col gap-1 text-[13px] leading-relaxed ${
                  isPastor
                    ? 'bg-white text-[#0b1c30] rounded-bl-sm border border-[#e5eeff]'
                    : 'bg-[#002046] text-white rounded-br-sm'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
                <div
                  className={`flex items-center justify-between text-[10px] pt-0.5 ${
                    isPastor ? 'text-[#74777f]' : 'text-white/70'
                  }`}
                >
                  <span className="font-mono text-[9px]">
                    {msg.role ? `[${msg.role}]` : ''}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 max-w-[85%]">
            <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2 shadow-xs border border-[#e5eeff] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#002046] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#002046] animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#002046] animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="text-[11px] text-[#74777f] italic">
              {activeContact.name} is typing...
            </span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-1 overflow-x-auto no-scrollbar flex items-center gap-2">
        {[
          'Can you please pray for my family this week?',
          'What time does Sabbath School start?',
          'How can I receive Lesson 3 Daniel 2 study guide?',
          'Looking forward to joining this Sabbath service!',
        ].map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handlePromptClick(prompt)}
            className="px-3 py-1 rounded-full bg-white hover:bg-[#eff4ff] text-[#002046] text-[11px] font-medium border border-[#dce9ff] whitespace-nowrap shadow-2xs transition-colors shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message Input Bar */}
      <form
        onSubmit={handleSendMessage}
        className="fixed bottom-0 w-full max-w-4xl bg-white/95 backdrop-blur-md px-4 py-2.5 border-t border-[#e5eeff] flex items-center gap-2 z-30"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Message ${activeContact.name.split(' ')[0]}...`}
          className="flex-1 h-11 px-4 rounded-xl bg-[#eff4ff] text-[13px] text-[#0b1c30] placeholder:text-[#74777f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#002046]/20 border border-[#dce9ff]"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-11 h-11 rounded-xl bg-[#002046] hover:bg-[#1b365d] active:scale-95 text-white flex items-center justify-center transition-all disabled:opacity-40 shadow-xs shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </form>

      {/* MODAL: CONTACT DETAILS & PRIVACY DOSSIER */}
      {showContactDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#002046]/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-3.5 max-h-[88vh] overflow-y-auto border border-[#dce9ff]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#002046] text-[#fe932c] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">
                    {isPIIAllowed ? 'badge' : 'lock'}
                  </span>
                </div>
                <h3 className="text-[16px] font-bold text-[#002046]">
                  {isPIIAllowed ? 'Contact Personal Dossier' : 'Protected Contact Information'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContactDetailsModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#44474e] hover:bg-[#eff4ff]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Profile Avatar & Header */}
            <div className="flex items-center gap-3 p-3 bg-[#eff4ff] rounded-xl border border-[#dce9ff]">
              <img
                className="w-14 h-14 rounded-full object-cover ring-2 ring-[#aec7f7]"
                alt={activeContact.name}
                src={activeContact.avatarUrl}
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[16px] font-bold text-[#002046] truncate">
                    {activeContact.name}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-white text-[#002046] border border-[#dce9ff]">
                    {activeContact.stage}
                  </span>
                </div>
                <span className="text-[12px] text-[#44474e] truncate">
                  {activeContact.roleSubtitle}
                </span>
              </div>
            </div>

            {/* CASE 1: LOWER USER (worker, chat_user) -> PERSONAL DETAILS HIDDEN */}
            {!isPIIAllowed ? (
              <div className="flex flex-col gap-3">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-bold text-[13px] text-[#78350f]">
                    <span className="material-symbols-outlined text-[18px]">shield</span>
                    <span>Section 20 Privacy Protocol Enforced</span>
                  </div>
                  <p className="text-[12px] leading-snug">
                    Personal contact details (direct phone number, email address, physical residence, and private notes) are <strong>strictly hidden</strong> for your role clearance (<strong>{currentUserRole.replace('_', ' ')}</strong>).
                  </p>
                </div>

                <div className="flex flex-col gap-2 bg-[#f8f9ff] p-3 rounded-xl border border-[#e5eeff] text-[12px]">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#e5eeff]">
                    <span className="text-[#44474e]">Mobile / WhatsApp:</span>
                    <span className="font-mono text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
                      [HIDDEN BY SECURITY PROTOCOL]
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-1.5 border-b border-[#e5eeff]">
                    <span className="text-[#44474e]">Email Address:</span>
                    <span className="font-mono text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
                      [HIDDEN BY SECURITY PROTOCOL]
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-1.5 border-b border-[#e5eeff]">
                    <span className="text-[#44474e]">Residential Address:</span>
                    <span className="font-mono text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
                      [PROTECTED - REGION ONLY]
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#44474e]">Private Pastoral Notes:</span>
                    <span className="font-mono text-[11px] font-bold text-[#ba1a1a] bg-red-100 px-2 py-0.5 rounded">
                      [RESTRICTED TO LEVEL 1 &amp; 2 ADMINS]
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff] flex items-center justify-between text-[12px] text-[#002046]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                    <span>In-App Chat is 100% active and secure for all ministry conversations.</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowContactDetailsModal(false)}
                  className="w-full h-10 rounded-xl bg-[#002046] text-white text-[13px] font-bold hover:bg-[#1b365d]"
                >
                  Return to Chat
                </button>
              </div>
            ) : (
              /* CASE 2: HIGHER USER (super_admin, union_admin) -> FULL PERSONAL DETAILS VISIBLE */
              <div className="flex flex-col gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-[12px]">
                  <span className="material-symbols-outlined text-[18px] text-emerald-700">verified_user</span>
                  <span>Administrative Clearance Verified: Full personal information accessible.</span>
                </div>

                <div className="flex flex-col gap-2.5 bg-[#f8f9ff] p-3 rounded-xl border border-[#e5eeff] text-[12px]">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#e5eeff]">
                    <span className="text-[#44474e]">Phone / WhatsApp:</span>
                    <span className="font-mono font-bold text-[#002046]">
                      {activeContact.isPastor ? activeContact.phone : contactPrivateData?.phone || 'Loading from /seekers_private...'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-1.5 border-b border-[#e5eeff]">
                    <span className="text-[#44474e]">Email:</span>
                    <span className="font-mono text-[#002046]">
                      {activeContact.isPastor ? activeContact.email : contactPrivateData?.email || 'Not provided'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5 pb-1.5 border-b border-[#e5eeff]">
                    <span className="text-[#44474e]">Address:</span>
                    <span className="font-medium text-[#002046]">
                      {activeContact.isPastor ? activeContact.address : contactPrivateData?.address || activeContact.address || 'Confidential'}
                    </span>
                  </div>

                  {(activeContact.isPastor ? activeContact.notes : contactPrivateData?.personalNotes || activeContact.notes) && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[#44474e]">Pastoral Notes:</span>
                      <p className="italic text-[#44474e] text-[11px] bg-white p-2 rounded border border-[#e5eeff]">
                        {activeContact.isPastor ? activeContact.notes : contactPrivateData?.personalNotes || activeContact.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions for Higher Users */}
                <div className="flex items-center gap-2">
                  {activeContact.phone && (
                    <a
                      href={`tel:${activeContact.phone}`}
                      onClick={() => showToast(`Calling ${activeContact.name}...`, 'call')}
                      className="flex-1 h-10 rounded-xl bg-[#002046] hover:bg-[#1b365d] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[17px]">call</span>
                      <span>Call Directly</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowContactDetailsModal(false);
                      showToast('Continued in-app conversation', 'chat');
                    }}
                    className="flex-1 h-10 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002046] text-[12px] font-bold"
                  >
                    Back to Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
