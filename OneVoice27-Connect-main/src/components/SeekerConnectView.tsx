import React, { useState } from 'react';
import { Language, Seeker } from '../types';

interface SeekerConnectViewProps {
  currentLanguage: Language;
  onRegisterSeeker: (
    newSeeker: Partial<Seeker>,
    privatePII?: { fullName: string; phone: string; email?: string; address: string }
  ) => void;
  onNavigateToChurches: () => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenTerms?: () => void;
  showToast: (msg: string, icon?: string) => void;
}

export const SeekerConnectView: React.FC<SeekerConnectViewProps> = ({
  currentLanguage,
  onRegisterSeeker,
  onNavigateToChurches,
  onOpenPrivacyPolicy,
  onOpenTerms,
  showToast,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [ageGroup, setAgeGroup] = useState('26-40');
  const [gender, setGender] = useState('male');
  const [studyLang, setStudyLang] = useState('hi');
  const [interests, setInterests] = useState<string[]>([
    'Free Bible Study Guide',
  ]);
  const [pinCode, setPinCode] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleInterest = (title: string) => {
    if (interests.includes(title)) {
      setInterests(interests.filter((i) => i !== title));
    } else {
      setInterests([...interests, title]);
    }
  };

  const handleGpsDetect = () => {
    setIsDetectingGps(true);
    setTimeout(() => {
      setIsDetectingGps(false);
      setGpsStatus('Location Locked: Connaught Place, ND (Accurate to 15m • Central Delhi District)');
      setPinCode('110001 - Connaught Place, New Delhi');
      showToast('GPS coordinates locked: Central Delhi Region', 'my_location');
    }, 700);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      showToast('Please enter your full name and mobile number', 'warning');
      return;
    }

    if (!privacyConsent) {
      showToast('Please accept the Data Dignity & Privacy Pledge', 'info');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onRegisterSeeker(
        {
          name: fullName,
          age: ageGroup === '26-40' ? '32' : '28',
          gender: gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Other',
          language: studyLang === 'hi' ? 'हिंदी (Hindi)' : studyLang === 'pa' ? 'ਪੰਜਾਬੀ (Punjabi)' : 'English',
          location: pinCode,
          pinCode: '110001',
          interests: interests,
          assignedUnion: 'Delhi Metro Region',
          assignedWorker: '',
          chatReference: `chat-inbound-${Date.now()}`,
        },
        {
          fullName,
          phone: `+91 ${phone}`,
          email: email || undefined,
          address: pinCode,
        }
      );
      setIsSubmitting(false);
      showToast('Connected! Matched with Central SDA Church & Pr. Massey', 'church');
      onNavigateToChurches();
    }, 850);
  };

  return (
    <div className="flex flex-col w-full px-4 py-3 gap-4 max-w-4xl mx-auto pb-24">
      {/* Campaign Attribution Pill */}
      <div className="flex items-center gap-2 bg-[#dce9ff] text-[#002046] px-3.5 py-1.5 rounded-full shadow-xs">
        <span
          className="material-symbols-outlined text-[18px] text-[#904d00] shrink-0"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          campaign
        </span>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[12px] text-[#44474e] shrink-0">Source:</span>
          <span className="text-[12px] font-semibold truncate text-[#002046]">
            One Voice 27 • Hope Series #04 (YouTube Campaign)
          </span>
        </div>
      </div>

      {/* Warm Pastoral Greeting Card with Emblem Motif */}
      <div className="relative overflow-hidden bg-[#1b365d] text-white rounded-2xl p-4 sm:p-5 shadow-md border border-[#002046]/10">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10 pointer-events-none">
          <svg className="w-full h-full text-[#ffdcc3]" fill="currentColor" viewBox="0 0 100 100">
            <path d="M50 5 C30 5 15 20 15 40 C15 65 50 95 50 95 C50 95 85 65 85 40 C85 20 70 5 50 5 Z M50 55 C41.7 55 35 48.3 35 40 C35 31.7 41.7 25 50 25 C58.3 25 65 31.7 65 40 C65 48.3 58.3 55 50 55 Z" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-1.5 bg-[#904d00] px-2.5 py-0.5 rounded-full w-fit">
            <span className="material-symbols-outlined text-[14px] text-white">menu_book</span>
            <span className="text-[11px] font-semibold text-white uppercase tracking-wider">
              Namaste • सत श्री अकाल • Welcome
            </span>
          </div>
          <h2 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-white mt-1">
            {currentLanguage === 'hi'
              ? 'शांति, उद्देश्य और आत्मिक संगति पाएं'
              : 'Find Peace, Purpose & Community'}
          </h2>
          <p className="text-[13px] text-[#d3e4fe] leading-relaxed">
            {currentLanguage === 'hi'
              ? 'आप एक विशेष उद्देश्य से यहाँ पहुंचे हैं। उत्तर भारत के हज़ारों लोगों के साथ जुड़ें जो नए विश्वास, स्वास्थ्य शिक्षा और आत्मिक संगति का अनुभव कर रहे हैं।'
              : 'You were guided here for a reason. Join thousands across Northern India discovering renewed faith, health teachings, and supportive fellowship.'}
          </p>
        </div>
      </div>

      {/* Seeker Registration Form Container */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#e5eeff] flex flex-col gap-4"
      >
        {/* Contact Details Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#002046] text-[20px]">
              person_outline
            </span>
            <h3 className="text-[16px] font-bold text-[#002046]">
              Personal Details
            </h3>
          </div>

          {/* Full Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-[#44474e]" htmlFor="seeker-fullname">
              Full Name (पूरा नाम)
            </label>
            <input
              id="seeker-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
              className="w-full h-11 px-3.5 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#002046]/20 transition-all border border-transparent focus:border-[#002046]/30 shadow-inner"
            />
          </div>

          {/* WhatsApp / Phone with prefix */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-[#44474e]" htmlFor="seeker-phone">
              WhatsApp / Mobile Number
            </label>
            <div className="flex h-11 rounded-xl overflow-hidden bg-[#eff4ff] border border-transparent focus-within:border-[#002046]/30 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#002046]/20 shadow-inner transition-all">
              <span className="flex items-center px-3.5 bg-[#e5eeff] text-[#44474e] text-[13px] font-semibold select-none shrink-0 border-r border-[#dce9ff]">
                🇮🇳 +91
              </span>
              <input
                id="seeker-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full px-3.5 bg-transparent text-[#0b1c30] text-[14px] focus:outline-none"
              />
            </div>
          </div>

          {/* Email Address (Optional) */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-[13px] font-medium text-[#44474e]" htmlFor="seeker-email">
                Email Address
              </label>
              <span className="text-[11px] text-[#74777f]">Optional</span>
            </div>
            <input
              id="seeker-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full h-11 px-3.5 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#002046]/20 transition-all border border-transparent focus:border-[#002046]/30 shadow-inner"
            />
          </div>

          {/* Age Group and Gender Row */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Age Bracket */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#44474e]">Age Group</label>
              <div className="grid grid-cols-2 gap-1.5">
                {['18-25', '26-40', '41-60', '60+'].map((age) => {
                  const isSelected = ageGroup === age;
                  return (
                    <button
                      key={age}
                      type="button"
                      onClick={() => setAgeGroup(age)}
                      className={`h-9 rounded-lg text-[12px] transition-all font-medium ${
                        isSelected
                          ? 'bg-[#002046] text-white shadow-sm font-semibold'
                          : 'bg-[#e5eeff] text-[#44474e] hover:bg-[#dce9ff]'
                      }`}
                    >
                      {age.replace('-', '–')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gender */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#44474e]">Gender</label>
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`flex-1 h-9 rounded-lg text-[12px] transition-all font-medium ${
                      gender === 'male'
                        ? 'bg-[#002046] text-white shadow-sm font-semibold'
                        : 'bg-[#e5eeff] text-[#44474e] hover:bg-[#dce9ff]'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`flex-1 h-9 rounded-lg text-[12px] transition-all font-medium ${
                      gender === 'female'
                        ? 'bg-[#002046] text-white shadow-sm font-semibold'
                        : 'bg-[#e5eeff] text-[#44474e] hover:bg-[#dce9ff]'
                    }`}
                  >
                    Female
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setGender('other')}
                  className={`h-9 rounded-lg text-[11px] transition-all font-medium ${
                    gender === 'other'
                      ? 'bg-[#002046] text-white shadow-sm font-semibold'
                      : 'bg-[#e5eeff] text-[#44474e] hover:bg-[#dce9ff]'
                  }`}
                >
                  Prefer not to say
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Study Language Preference */}
        <div className="flex flex-col gap-1 pt-1">
          <label className="text-[13px] font-medium text-[#44474e] flex items-center justify-between" htmlFor="seeker-lang">
            <span>Preferred Study Language (भाषा)</span>
            <span className="text-[11px] text-[#904d00] font-semibold">
              Pastoral support available
            </span>
          </label>
          <div className="relative">
            <select
              id="seeker-lang"
              value={studyLang}
              onChange={(e) => setStudyLang(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-[14px] appearance-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#002046]/20 transition-colors shadow-inner border border-transparent focus:border-[#002046]/30 cursor-pointer"
            >
              <option value="hi">हिंदी (Hindi)</option>
              <option value="en">English</option>
              <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="ur">اردو (Urdu)</option>
            </select>
            <span className="material-symbols-outlined text-[20px] text-[#44474e] absolute right-3 top-3 pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        {/* Spiritual & Pastoral Interests Chips */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium text-[#44474e]">
              How Can We Walk With You?
            </label>
            <span className="text-[11px] text-[#74777f]">Select all that apply</span>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-0.5">
            {[
              {
                id: 'Free Bible Study Guide',
                title: 'Free Bible Study Guide',
                desc: 'Delivered physically or via WhatsApp',
                icon: 'auto_stories',
              },
              {
                id: 'Pastoral Prayer Request',
                title: 'Pastoral Prayer Request',
                desc: 'Confidential prayer from regional pastors',
                icon: 'volunteer_activism',
              },
              {
                id: 'Visit Sabbath Service',
                title: 'Visit Sabbath Service',
                desc: 'Saturday morning spiritual worship & fellowship',
                icon: 'church',
              },
              {
                id: 'Health & Wellness Seminars',
                title: 'Health & Wellness Seminars',
                desc: 'Vegetarian cooking, stress relief & vitality',
                icon: 'spa',
              },
            ].map((option) => {
              const isSelected = interests.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleInterest(option.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                    isSelected
                      ? 'bg-[#dce9ff] text-[#002046] font-semibold border-[#aec7f7] shadow-xs'
                      : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff] border-transparent'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                      isSelected
                        ? 'bg-white text-[#904d00]'
                        : 'bg-white text-[#002046]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {option.icon}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[14px] leading-tight font-semibold">
                      {option.title}
                    </span>
                    <span className="text-[12px] text-[#44474e] font-normal leading-snug">
                      {option.desc}
                    </span>
                  </div>
                  <span
                    className={`material-symbols-outlined ml-auto text-[20px] ${
                      isSelected ? 'text-[#904d00]' : 'text-[#74777f]'
                    }`}
                  >
                    {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location Detection & Manual PIN Entry */}
        <div className="flex flex-col gap-2.5 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#002046] text-[20px]">
              location_on
            </span>
            <h3 className="text-[15px] font-bold text-[#002046]">
              Find Nearby Congregations
            </h3>
          </div>

          {/* Quick GPS Auto-Detect Button */}
          <button
            type="button"
            onClick={handleGpsDetect}
            disabled={isDetectingGps}
            className="w-full flex items-center justify-center gap-2 h-12 bg-[#dce9ff] hover:bg-[#d3e4fe] active:scale-[0.99] text-[#002046] rounded-xl text-[14px] font-semibold transition-all shadow-xs border border-[#aec7f7]/60"
          >
            <span
              className={`material-symbols-outlined text-[20px] text-[#904d00] ${
                isDetectingGps ? 'animate-spin' : ''
              }`}
            >
              {isDetectingGps ? 'sync' : 'my_location'}
            </span>
            <span>
              {isDetectingGps ? 'Detecting coordinates...' : 'Auto-detect My Location (GPS)'}
            </span>
          </button>

          {/* GPS Status feedback */}
          <p className="text-[11px] text-[#74777f] flex items-center gap-1.5 px-0.5">
            <span className="material-symbols-outlined text-[14px] text-[#904d00]">
              info
            </span>
            <span>
              {gpsStatus || 'Locates nearest SDA Church in Delhi Metro, Punjab, UP, or Bihar'}
            </span>
          </p>

          {/* Manual Input Fallback */}
          <div className="flex items-center gap-2 my-1">
            <div className="flex-1 h-[1px] bg-[#c4c6cf]/60"></div>
            <span className="text-[11px] text-[#74777f] uppercase tracking-wider font-semibold">
              or enter manually
            </span>
            <div className="flex-1 h-[1px] bg-[#c4c6cf]/60"></div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-[#44474e]" htmlFor="seeker-pin">
              PIN Code / City
            </label>
            <div className="relative">
              <input
                id="seeker-pin"
                type="text"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#002046]/20 shadow-inner border border-transparent focus:border-[#002046]/30"
              />
              <span className="material-symbols-outlined text-[20px] text-[#44474e] absolute left-3 top-2.5">
                pin_drop
              </span>
            </div>
          </div>

          {/* Static Map Visual Preview of Territory */}
          <div className="relative rounded-xl overflow-hidden h-28 bg-[#e5eeff] shadow-inner mt-1 border border-[#d3e4fe]">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDC1d1_ZD33oiB1PCNtkti81zt8nIDjqL-KwHrE4JtnnGvhSbboYKGxj-QmbPjwqpeLvduicuktmlAHEPdOmSwdRqzZDCyGb1aCZ8vbhQRd9fsZy9KElqZ7aWph9Ja_MFJ1zU4gCYxLdgxofX29A3SQ3EYupkdELaB37k0VurklDBVYt0kqntPSMOOrJTf1WBMdZaWLppBxPyKGpJTv6JitGxTTGpAGgp-ZizQiWRuXIspG8CB3IDO3kA')",
              }}
            />
            <div className="absolute inset-0 bg-[#002046]/25 backdrop-blur-[1px] flex items-center justify-center p-2 text-center">
              <div className="bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full shadow-md flex items-center gap-2 border border-white">
                <span className="material-symbols-outlined text-[16px] text-[#904d00]">
                  explore
                </span>
                <span className="text-[12px] font-bold text-[#002046]">
                  3 Churches • 2 Prayer Centers Detected
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Dignity & Privacy Pledge Checkbox */}
        <div className="bg-[#eff4ff] rounded-xl p-3 flex flex-col gap-2 border border-[#dce9ff]">
          <div className="flex items-start gap-2.5">
            <input
              id="privacy-consent"
              type="checkbox"
              checked={privacyConsent}
              onChange={(e) => setPrivacyConsent(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded text-[#002046] accent-[#002046] cursor-pointer shrink-0"
            />
            <label
              htmlFor="privacy-consent"
              className="text-[12px] text-[#44474e] select-none cursor-pointer leading-snug"
            >
              <strong className="font-semibold text-[#0b1c30]">
                Data Dignity &amp; Privacy Pledge:
              </strong>{' '}
              I consent to my details being stored under Section 20 &amp; 31 pastoral protocols solely for spiritual fellowship with accredited SDA pastors. No third-party sharing.
            </label>
          </div>
          <div className="flex items-center gap-3 pl-7 text-[11px]">
            {onOpenPrivacyPolicy && (
              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className="text-[#002046] font-bold hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">policy</span>
                <span>Privacy Policy</span>
              </button>
            )}
            {onOpenTerms && (
              <button
                type="button"
                onClick={onOpenTerms}
                className="text-[#44474e] hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">gavel</span>
                <span>Terms of Service</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Find & Connect Action */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-[#002046] hover:bg-[#1b365d] active:scale-[0.99] text-white rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-80"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">
                  sync
                </span>
                <span>Connecting you with local pastor...</span>
              </>
            ) : (
              <>
                <span>Find My Nearest Church &amp; Connect</span>
                <span className="material-symbols-outlined text-[20px] text-[#fe932c]">
                  arrow_forward
                </span>
              </>
            )}
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-2.5 text-center">
            <span className="material-symbols-outlined text-[15px] text-[#904d00]">
              verified_user
            </span>
            <span className="text-[11px] text-[#44474e]">
              Northern India Union of Seventh-day Adventists
            </span>
          </div>
        </div>
      </form>

      {/* Regional Pastor Help Banner */}
      <div className="bg-[#e5eeff] rounded-2xl p-4 flex items-center justify-between gap-3 border border-[#d3e4fe]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#904d00] text-white flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[22px]">
              support_agent
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-[14px] font-bold text-[#002046] truncate">
              Prefer to speak right now?
            </h4>
            <span className="text-[12px] text-[#44474e] truncate">
              Northern Helpline: 1800-27-VOICE
            </span>
          </div>
        </div>
        <a
          href="tel:18002786423"
          onClick={() => showToast('Calling Northern India Union Helpline...', 'call')}
          className="h-9 px-4 bg-white text-[#002046] rounded-xl text-[12px] font-bold flex items-center justify-center shrink-0 shadow-sm hover:bg-[#f8f9ff] transition-colors border border-[#dce9ff]"
        >
          Call Free
        </a>
      </div>
    </div>
  );
};
