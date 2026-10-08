import React, { useState, useEffect } from 'react';
import { Seeker, UserRole } from '../types';
import { fetchSeekerPrivateData } from '../firebase';
import { canViewSeekerPII } from '../security';

interface WhatsAppDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  seeker: Seeker;
  currentUserRole?: UserRole;
  showToast: (msg: string, icon?: string) => void;
}

export const WhatsAppDispatchModal: React.FC<WhatsAppDispatchModalProps> = ({
  isOpen,
  onClose,
  seeker,
  currentUserRole = 'super_admin',
  showToast,
}) => {
  if (!isOpen) return null;

  const [dialect, setDialect] = useState<'hi' | 'en' | 'pa'>('hi');
  const [selectedTemplate, setSelectedTemplate] = useState<number>(1);
  const [personalGreeting, setPersonalGreeting] = useState(
    'Praying for peace in your household this week.'
  );
  const [includeLocation, setIncludeLocation] = useState(true);
  const [includeGuide, setIncludeGuide] = useState(true);
  const [includeAudio, setIncludeAudio] = useState(false);
  const [logToCrm, setLogToCrm] = useState(true);
  const [setReminder, setSetReminder] = useState(true);
  const [phone, setPhone] = useState<string>('');

  useEffect(() => {
    if (canViewSeekerPII(currentUserRole)) {
      fetchSeekerPrivateData(seeker.id, currentUserRole).then((data) => {
        if (data?.phone) {
          setPhone(data.phone);
        }
      });
    }
  }, [seeker.id, currentUserRole]);

  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

  const handleCopy = () => {
    const text = `नमस्ते ${seeker.name} जी (Namaste ${seeker.name} ji),\n\nआशा है आप सकुशल हैं। One Voice 27 प्रसारण में आपकी रुचि के लिए धन्यवाद। ${personalGreeting}\n\nहम आपको इस शनिवार (सबथ) Central Seventh-day Adventist Church, Connaught Place में सादर आमंत्रित करते हैं (प्रातः 9:30 बजे)।\n\n— Pr. Emmanuel Masih\nनॉर्दर्न इंडिया यूनियन`;
    navigator.clipboard?.writeText(text);
    showToast('WhatsApp message copied to clipboard!', 'content_copy');
  };

  const handleDispatch = () => {
    const message = `Namaste ${seeker.name} ji, grace and peace from Central SDA Church. ${personalGreeting} One Voice 27 Hope Series follow-up.`;
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
    
    showToast('Dispatching WhatsApp message & updating CRM timeline...', 'send');
    setTimeout(() => {
      window.open(waUrl, '_blank');
      onClose();
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#002046]/50 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-[#dce9ff]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col items-center pt-3 pb-2 px-4 sm:px-6 border-b border-[#e5eeff] bg-white/95 backdrop-blur-md sticky top-0 z-20">
          <div className="w-12 h-1.5 rounded-full bg-[#d3e4fe] mb-2 sm:hidden" />
          <div className="w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0">
                <span className="material-symbols-outlined text-[20px]">chat</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[16px] font-bold text-[#002046] leading-tight truncate">
                    WhatsApp Ministry Dispatch
                  </h2>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    Direct
                  </span>
                </div>
                <p className="text-[12px] text-[#44474e] truncate">
                  Recipient: {seeker.name} •{' '}
                  <span className="text-[#002046] font-semibold">{phone}</span>
                </p>
              </div>
            </div>

            <button
              aria-label="Dismiss Modal"
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#44474e] flex items-center justify-center hover:bg-[#e5eeff] transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          {/* Dialect Selector */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#44474e] uppercase tracking-wider">
                Target Dialect / Script
              </span>
              <span className="text-[11px] text-[#904d00] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  translate
                </span>
                Auto-localized
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 bg-[#eff4ff] p-1 rounded-xl border border-[#dce9ff]">
              {[
                { id: 'hi' as const, label: 'हिंदी (Hindi)' },
                { id: 'en' as const, label: 'English' },
                { id: 'pa' as const, label: 'ਪੰਜਾਬੀ (Punjabi)' },
              ].map((item) => {
                const isActive = dialect === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDialect(item.id)}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[12px] font-semibold transition-all ${
                      isActive
                        ? 'bg-white text-[#002046] shadow-xs'
                        : 'text-[#44474e] hover:text-[#002046]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="material-symbols-outlined text-[14px] text-emerald-600">
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Approved Templates Carousel */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#44474e] uppercase tracking-wider">
                NIU Approved Template
              </span>
              <span className="text-[11px] text-[#002046] font-bold">
                4 Pre-loaded
              </span>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
              {[
                {
                  id: 1,
                  badge: 'Active Selection',
                  title: '1. Peace Video & Welcome',
                  desc: 'OV27 Episode 4 follow-up + Guide',
                  icon: 'verified',
                },
                {
                  id: 2,
                  badge: 'Sabbath Invite',
                  title: '2. Worship Fellowship',
                  desc: 'Connaught Place Central SDA invite',
                  icon: 'church',
                },
                {
                  id: 3,
                  badge: 'Prophecy Study',
                  title: '3. Daniel 2 Hope Guide',
                  desc: 'PDF attachment with pastoral note',
                  icon: 'menu_book',
                },
              ].map((tpl) => {
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`flex-shrink-0 w-56 sm:w-60 p-3 rounded-xl border-2 flex flex-col justify-between gap-1.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#e5eeff] border-[#002046]/40 shadow-xs'
                        : 'bg-white border-[#e5eeff] hover:bg-[#eff4ff]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-[#002046] text-white'
                            : 'bg-[#eff4ff] text-[#44474e]'
                        }`}
                      >
                        {tpl.badge}
                      </span>
                      <span className="material-symbols-outlined text-[16px] text-[#002046]">
                        {tpl.icon}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <h4 className="text-[13px] font-bold text-[#002046] leading-tight">
                        {tpl.title}
                      </h4>
                      <p className="text-[11px] text-[#44474e] line-clamp-1">
                        {tpl.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tokens Pill Bar */}
          <div className="flex flex-col gap-1.5 p-3 bg-[#eff4ff] rounded-xl border border-[#dce9ff]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#44474e] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-[#002046]">
                  data_object
                </span>
                Injected Personalization Tokens
              </span>
              <span className="text-[10px] text-[#904d00] font-bold">Ready</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="bg-white px-2 py-0.5 rounded-md text-[11px] text-[#0b1c30] shadow-2xs border border-[#dce9ff]">
                <span className="text-[#74777f]">{'{{SeekerName}}'}:</span> {seeker.name}
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md text-[11px] text-[#0b1c30] shadow-2xs border border-[#dce9ff]">
                <span className="text-[#74777f]">{'{{Church}}'}:</span> Central SDA Delhi
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md text-[11px] text-[#0b1c30] shadow-2xs border border-[#dce9ff]">
                <span className="text-[#74777f]">{'{{Pastor}}'}:</span> Pr. Emmanuel Masih
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md text-[11px] text-[#0b1c30] shadow-2xs border border-[#dce9ff]">
                <span className="text-[#74777f]">{'{{Time}}'}:</span> Sat 9:30 AM
              </span>
            </div>
          </div>

          {/* Authentic WhatsApp Preview Canvas */}
          <div className="flex flex-col rounded-2xl overflow-hidden shadow-sm border border-[#075e54]/20 bg-[#efeae2]">
            {/* Header Strip */}
            <div className="bg-[#075e54] text-white px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold text-white">
                  RK
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-white leading-none">
                    {seeker.name}
                  </span>
                  <span className="text-[10px] text-emerald-100">
                    WhatsApp Messenger Preview
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <span className="material-symbols-outlined text-[16px]">videocam</span>
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span className="material-symbols-outlined text-[16px]">more_vert</span>
              </div>
            </div>

            {/* Chat Body */}
            <div className="p-3 flex flex-col gap-2">
              <div className="self-center bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-md shadow-2xs">
                <span className="text-[10px] text-[#74777f] font-bold uppercase tracking-wider">
                  Today
                </span>
              </div>

              {/* Outgoing Message Bubble */}
              <div className="self-end max-w-[92%] bg-[#d9fdd3] text-[#111b21] rounded-2xl rounded-tr-xs p-2.5 shadow-xs flex flex-col gap-2 relative">
                {/* Media Attachment Card */}
                <div className="rounded-xl overflow-hidden bg-white shadow-2xs border border-[#000]/5">
                  <img
                    className="w-full h-28 object-cover"
                    alt="Sanctuary"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuASvdJi4GjJd1voKyv7prXEtXhnmCbJSgMQyh3KJkdWnGs8tUT6_Kb4HNs3cCzkhwyb_drnw0W9qc8inPiRRv8p6lxHS6htv071X3p6GqWsVeIZNO3VdF_Vv-hnBtkwIUlPPWHLVn-UrAczJlHdixRWTVI7zMRSsCDskv5vttwcopNP-eSHaTZAuZ__EdNvMEJNcXegcwFg5sfg2sF2d47onEZAvqPMFEWT_De4urd4x8iEmTuaBTqutA"
                  />
                  <div className="p-2 flex flex-col bg-white">
                    <span className="text-[11px] text-emerald-800 font-bold truncate">
                      One Voice 27 • Ep. 04
                    </span>
                    <span className="text-[12px] text-[#0b1c30] font-semibold truncate">
                      सच्ची शांति की खोज (Finding Inner Peace)
                    </span>
                    <span className="text-[10px] text-[#74777f] truncate">
                      onevoice27.org/study-guide-04.pdf
                    </span>
                  </div>
                </div>

                {/* Message Text */}
                <div className="text-[13px] leading-relaxed text-[#111b21] whitespace-pre-line">
                  <strong className="text-[#002046]">नमस्ते {seeker.name} जी (Namaste {seeker.name} ji),</strong>
                  {'\n\n'}
                  आशा है आप सकुशल हैं। One Voice 27 प्रसारण में आपकी रुचि के लिए धन्यवाद। आपके अनुरोध अनुसार, मसीह में आत्मिक शांति पाने का अध्ययन पत्र हम आपसे साझा कर रहे हैं।
                  {'\n\n'}
                  {personalGreeting}
                  {'\n\n'}
                  हम आपको इस शनिवार (सबथ) <strong className="text-[#002046]">Central Seventh-day Adventist Church, Connaught Place</strong> में सादर आमंत्रित करते हैं (सबथ स्कूल प्रातः 9:30 बजे)।
                  {'\n\n'}
                  प्रार्थना अथवा किसी भी प्रश्न के लिए आप बेझिझक मुझे संदेश भेज सकते हैं।
                  {'\n\n'}
                  — <strong className="text-[#002046]">Pr. Emmanuel Masih</strong>
                  <span className="text-[11px] text-[#44474e] block">
                    नॉर्दर्न इंडिया यूनियन (NIU Adventist Ministry)
                  </span>
                </div>

                {/* WhatsApp Interactive Action Buttons */}
                <div className="flex flex-col gap-1 pt-1">
                  <div className="w-full py-1.5 px-3 rounded-lg bg-white/95 shadow-2xs flex items-center justify-center gap-1.5 text-emerald-800 text-[11px] font-bold">
                    <span className="material-symbols-outlined text-[14px] text-emerald-600">
                      location_on
                    </span>
                    <span>Church Location (Hailey Road, CP)</span>
                  </div>
                  <div className="w-full py-1.5 px-3 rounded-lg bg-white/95 shadow-2xs flex items-center justify-center gap-1.5 text-emerald-800 text-[11px] font-bold">
                    <span className="material-symbols-outlined text-[14px] text-emerald-600">
                      download
                    </span>
                    <span>Download Study Guide (PDF)</span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className="text-[10px] text-[#74777f]">11:42 AM</span>
                  <span className="material-symbols-outlined text-[14px] text-blue-500">
                    done_all
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Text Customizer */}
          <div className="flex flex-col gap-1.5 bg-[#eff4ff] p-3 rounded-xl border border-[#dce9ff]">
            <div className="flex items-center justify-between">
              <label
                htmlFor="personal-greeting"
                className="text-[12px] font-bold text-[#002046] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-[#002046]">
                  edit_note
                </span>
                Add Personal Pastoral Greeting
              </label>
              <span className="text-[11px] text-[#74777f]">
                {personalGreeting.length}/180 chars
              </span>
            </div>
            <textarea
              id="personal-greeting"
              rows={2}
              value={personalGreeting}
              onChange={(e) => setPersonalGreeting(e.target.value)}
              placeholder="Add personal prayer note (e.g. 'Praying for your family and peace')"
              className="w-full bg-white text-[#0b1c30] text-[13px] rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#002046]/20 shadow-2xs resize-none border border-[#dce9ff]"
            />
          </div>

          {/* Included Attachments */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-[#44474e] uppercase tracking-wider">
              Included Attachments
            </span>

            <div className="flex flex-col gap-1.5">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] transition-colors cursor-pointer border border-[#dce9ff]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#002046] shrink-0 shadow-2xs">
                    <span className="material-symbols-outlined text-[18px]">pin_drop</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-[#0b1c30] truncate">
                      SDA Church Location Pin
                    </span>
                    <span className="text-[11px] text-[#44474e] truncate">
                      11, Hailey Rd, Vakil Lane, Connaught Place
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeLocation}
                  onChange={(e) => setIncludeLocation(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#002046] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] transition-colors cursor-pointer border border-[#dce9ff]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#904d00] shrink-0 shadow-2xs">
                    <span className="material-symbols-outlined text-[18px]">
                      picture_as_pdf
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-[#0b1c30] truncate">
                      One Voice 27 Study Guide #04 (Hindi)
                    </span>
                    <span className="text-[11px] text-[#44474e] truncate">
                      PDF Document • 1.8 MB
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeGuide}
                  onChange={(e) => setIncludeGuide(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#002046] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] transition-colors cursor-pointer border border-[#dce9ff]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#44474e] shrink-0 shadow-2xs">
                    <span className="material-symbols-outlined text-[18px]">mic</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-[#0b1c30] truncate">
                      Pr. Emmanuel Audio Greeting Note
                    </span>
                    <span className="text-[11px] text-[#44474e] truncate">
                      Voice message (38 sec) • Hindi
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeAudio}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#002046] cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* CRM Automation & Follow-up Triggers */}
          <div className="flex flex-col gap-2 p-3 bg-[#e5eeff] rounded-xl border border-[#d3e4fe]">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={logToCrm}
                onChange={(e) => setLogToCrm(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded accent-[#002046] shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-[12px] text-[#002046] font-bold">
                  Log to {seeker.name}'s CRM Timeline
                </span>
                <span className="text-[11px] text-[#44474e]">
                  Records "WhatsApp Follow-Up Sent (Ep.4)" under Delhi Metro register.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 pt-1 border-t border-[#dce9ff] cursor-pointer">
              <input
                type="checkbox"
                checked={setReminder}
                onChange={(e) => setSetReminder(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded accent-[#002046] shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-[12px] text-[#002046] font-bold">
                  Set 48-Hour Pastoral Reminder
                </span>
                <span className="text-[11px] text-[#44474e]">
                  Alert Pr. Emmanuel on Friday morning if seeker does not reply.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 bg-white border-t border-[#e5eeff] flex flex-col gap-2 shadow-lg">
          <button
            type="button"
            onClick={handleDispatch}
            className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] active:scale-[0.99] text-white flex items-center justify-center gap-2 shadow-md transition-all text-[15px] font-bold"
          >
            <span className="material-symbols-outlined text-[22px]">send</span>
            <span>Open &amp; Dispatch in WhatsApp</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="h-10 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#002046] text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-[#dce9ff]"
            >
              <span className="material-symbols-outlined text-[16px]">
                content_copy
              </span>
              <span>Copy Message</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl bg-[#eff4ff] text-[#44474e] hover:text-[#0b1c30] text-[12px] font-semibold flex items-center justify-center transition-colors border border-[#dce9ff]"
            >
              Cancel &amp; Return
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 pt-0.5 text-center">
            <span className="material-symbols-outlined text-[13px] text-[#74777f]">
              shield
            </span>
            <span className="text-[11px] text-[#74777f]">
              One Voice 27 Pastoral Outreach Security Protocol
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
