import React, { useState } from 'react';
import { UserRole } from '../types';
import { recordAuditLog } from '../firebase';

interface UnionAnalyticsViewProps {
  currentUserRole?: UserRole;
  currentUserUnion?: string;
  showToast: (msg: string, icon?: string) => void;
}

export const UnionAnalyticsView: React.FC<UnionAnalyticsViewProps> = ({
  currentUserRole = 'super_admin',
  currentUserUnion = 'Delhi Metro Region',
  showToast,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [sortByLeads, setSortByLeads] = useState(false);

  const initialLeaderboard = [
    {
      rank: 1,
      name: 'Delhi Metro Region',
      rate: '84% Rate',
      rateNum: 84,
      leads: 428,
      followed: 360,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      rank: 2,
      name: 'Upper Ganges Section',
      rate: '78% Rate',
      rateNum: 78,
      leads: 392,
      followed: 306,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      rank: 3,
      name: 'North India Section',
      rate: '75% Rate',
      rateNum: 75,
      leads: 345,
      followed: 260,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      rank: 4,
      name: 'Haryana Region',
      rate: '72% Rate',
      rateNum: 72,
      leads: 310,
      followed: 223,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      rank: 5,
      name: 'North Bengal Section',
      rate: '69% Rate',
      rateNum: 69,
      leads: 245,
      followed: 169,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      rank: 6,
      name: 'Central Uttar Pradesh Region',
      rate: '67% Rate',
      rateNum: 67,
      leads: 230,
      followed: 154,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      rank: 7,
      name: 'Eastern Uttar Pradesh Section',
      rate: '65% Rate',
      rateNum: 65,
      leads: 215,
      followed: 140,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      rank: 8,
      name: 'Rajasthan Section',
      rate: '64% Rate',
      rateNum: 64,
      leads: 198,
      followed: 127,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      rank: 9,
      name: 'Kolkata Metro Region',
      rate: '63% Rate',
      rateNum: 63,
      leads: 190,
      followed: 120,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      rank: 10,
      name: 'South Bengal Section',
      rate: '61% Rate',
      rateNum: 61,
      leads: 175,
      followed: 107,
      badgeColor: 'bg-blue-100 text-blue-900',
    },
    {
      rank: 11,
      name: 'Bihar Region',
      rate: '60% Rate',
      rateNum: 60,
      leads: 168,
      followed: 101,
      badgeColor: 'bg-blue-100 text-blue-900',
    },
    {
      rank: 12,
      name: 'Madhya Pradesh Region',
      rate: '58% Rate',
      rateNum: 58,
      leads: 155,
      followed: 90,
      badgeColor: 'bg-blue-100 text-blue-900',
    },
    {
      rank: 13,
      name: 'Uttarakhand Region',
      rate: '57% Rate',
      rateNum: 57,
      leads: 142,
      followed: 81,
      badgeColor: 'bg-blue-100 text-blue-900',
    },
    {
      rank: 14,
      name: 'Chhattisgarh Region',
      rate: '55% Rate',
      rateNum: 55,
      leads: 135,
      followed: 74,
      badgeColor: 'bg-blue-100 text-blue-900',
    },
    {
      rank: 15,
      name: 'Himachal Pradesh Region',
      rate: '54% Rate',
      rateNum: 54,
      leads: 120,
      followed: 65,
      badgeColor: 'bg-blue-100 text-blue-900',
    },
    {
      rank: 16,
      name: 'Western Jharkhand Section',
      rate: '52% Rate',
      rateNum: 52,
      leads: 112,
      followed: 58,
      badgeColor: 'bg-blue-100 text-blue-900',
    },
    {
      rank: 17,
      name: 'Eastern Jharkhand Section',
      rate: '50% Rate',
      rateNum: 50,
      leads: 105,
      followed: 53,
      badgeColor: 'bg-blue-100 text-blue-900',
    },
  ];

  const sortedLeaderboard = [...initialLeaderboard].sort((a, b) => {
    return sortByLeads ? b.leads - a.leads : b.rateNum - a.rateNum;
  });

  const handleExport = () => {
    if (currentUserRole !== 'super_admin') {
      recordAuditLog(
        'BLOCKED_EXPORT_ATTEMPT',
        `Union Analytics Export attempt by role: ${currentUserRole}`,
        { role: currentUserRole }
      );
      showToast(
        'Section 20 Security Alert: Downloading synod reports is restricted to Super Administrators.',
        'block'
      );
      return;
    }

    setIsExporting(true);
    showToast('Generating NIU Territory Summary (PDF/XLSX)...', 'download');
    setTimeout(() => {
      setIsExporting(false);
      recordAuditLog(
        'EXPORTED_SYNOD_REPORT',
        'NIU Monthly Synod Report (Oct 2024)',
        { role: 'super_admin' }
      );
      showToast('NIU Monthly Synod Report (Oct 2024) downloaded!', 'file_download_done');
    }, 1200);
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto pb-28">
      {/* Subtle Top Banner Accent */}
      <div className="w-full px-4 pt-4 pb-2 bg-gradient-to-b from-[#dce9ff]/40 to-transparent">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-full shadow-2xs border border-[#dce9ff]">
            <span className="w-2 h-2 rounded-full bg-[#fe932c] animate-pulse" />
            <span className="text-[12px] font-bold text-[#002046]">
              Live Synod Intelligence
            </span>
          </div>
          <div className="inline-flex items-center gap-1 text-[12px] text-[#44474e]">
            <span className="material-symbols-outlined text-[16px] text-[#904d00]">
              calendar_today
            </span>
            <span>October 2024 Cycle</span>
          </div>
        </div>
      </div>

      {/* Executive Header Area */}
      <section className="px-4 pt-1 pb-3">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#e5eeff]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-[#904d00] font-bold uppercase tracking-wider">
                Territory Command
              </span>
              <h2 className="text-[20px] sm:text-[22px] text-[#002046] font-bold mt-0.5 leading-tight">
                Northern India Union Administration
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#eff4ff] flex items-center justify-center shrink-0 text-[#002046] border border-[#dce9ff]">
              <span className="material-symbols-outlined text-[22px]">verified</span>
            </div>
          </div>

          {/* Territory Scope Pills */}
          <div className="flex items-center gap-2 flex-wrap bg-[#eff4ff] p-2 rounded-xl border border-[#dce9ff]">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg text-[#002046] text-[12px] font-bold shadow-2xs border border-[#dce9ff]">
              <span className="material-symbols-outlined text-[16px] text-[#904d00]">
                domain
              </span>
              <span>8 Sections</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg text-[#002046] text-[12px] font-bold shadow-2xs border border-[#dce9ff]">
              <span className="material-symbols-outlined text-[16px] text-[#904d00]">
                explore
              </span>
              <span>9 Regions</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg text-[#002046] text-[12px] font-bold shadow-2xs border border-[#dce9ff]">
              <span className="material-symbols-outlined text-[16px] text-[#904d00]">
                church
              </span>
              <span>420+ Congregations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Evangelism Funnel KPI Cards (2x2 Grid) */}
      <section className="px-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#002046] text-[20px]">
              filter_alt
            </span>
            <h3 className="text-[16px] font-bold text-[#002046]">
              Evangelism Funnel
            </h3>
          </div>
          <span className="text-[11px] text-[#44474e]">Real-time sync</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: Reach */}
          <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-[#e5eeff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-[#44474e] font-medium">
                  QR / Video Reach
                </span>
                <span className="material-symbols-outlined text-[18px] text-[#002046]">
                  broadcast_on_personal
                </span>
              </div>
              <p className="text-[22px] text-[#002046] font-bold tracking-tight">
                142,850
              </p>
            </div>
            <div className="mt-2.5 pt-1.5 flex items-center justify-between border-t border-[#eff4ff]">
              <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-[13px] mr-0.5">
                  trending_up
                </span>
                +18.4%
              </span>
              <span className="text-[11px] text-[#74777f]">vs last mo</span>
            </div>
          </div>

          {/* Card 2: Leads */}
          <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-[#e5eeff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-[#44474e] font-medium">
                  Interest Leads
                </span>
                <span className="material-symbols-outlined text-[18px] text-[#904d00]">
                  person_add
                </span>
              </div>
              <p className="text-[22px] text-[#002046] font-bold tracking-tight">
                4,620
              </p>
            </div>
            <div className="mt-2.5 pt-1.5 flex items-center justify-between border-t border-[#eff4ff]">
              <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-[13px] mr-0.5">
                  trending_up
                </span>
                +9.2%
              </span>
              <span className="text-[11px] text-[#74777f]">registered</span>
            </div>
          </div>

          {/* Card 3: Pastoral Care */}
          <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-[#e5eeff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-[#44474e] font-medium">
                  Pastoral Care
                </span>
                <span className="material-symbols-outlined text-[18px] text-[#002046]">
                  menu_book
                </span>
              </div>
              <p className="text-[22px] text-[#002046] font-bold tracking-tight">
                3,180
              </p>
            </div>
            <div className="mt-2.5 pt-1.5 flex items-center gap-2">
              <div className="w-full bg-[#eff4ff] rounded-full h-2 overflow-hidden border border-[#dce9ff]">
                <div className="bg-[#fe932c] h-2 rounded-full" style={{ width: '68.8%' }} />
              </div>
              <span className="text-[11px] font-bold text-[#904d00] shrink-0">
                68.8%
              </span>
            </div>
          </div>

          {/* Card 4: Sabbath Visits */}
          <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-[#e5eeff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-[#44474e] font-medium">
                  Sabbath Visits
                </span>
                <span className="material-symbols-outlined text-[18px] text-[#904d00]">
                  church
                </span>
              </div>
              <p className="text-[22px] text-[#002046] font-bold tracking-tight">
                842
              </p>
            </div>
            <div className="mt-2.5 pt-1.5 flex items-center justify-between border-t border-[#eff4ff]">
              <span className="text-[11px] text-[#44474e]">Confirmed in Pews</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#904d00]" />
            </div>
          </div>
        </div>
      </section>

      {/* Territorial Density Map Preview */}
      <section className="px-4 mb-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#e5eeff] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-[16px] font-bold text-[#002046]">
                Territorial Density
              </h3>
              <span className="text-[12px] text-[#44474e]">
                Concentration: Punjab, Haryana, Delhi NCR, UP, Bihar, Bengal
              </span>
            </div>
            <span className="material-symbols-outlined text-[#904d00] text-[22px]">
              map
            </span>
          </div>

          {/* Interactive Map Frame with Data Location */}
          <div
            className="relative w-full h-44 rounded-xl overflow-hidden bg-[#eff4ff] shadow-inner border border-[#dce9ff] bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDIdIA2_mdSvA9Pq3zAC0WFryCEHykNPK8JRFGtCXQy-G9mVboYnl7i8nktzaZmCNMgXh-RJl-29rWKG-l8yykwnZucQDU2KQS3I2sMAc0Sms_kDYjH_XHAx143SNxJpSe1bh4hqP1p5ZWA3h2oShqMqWBAYsTkg4f7tWNDaGV-C2EMFZ4FpjuC5I_sZ0Qg6i2ZQYONIgucOI3ap0ycOfM1S9RF3hBJ3W2K9o2bTeQLN1CePZ1RI9vCuA')",
            }}
          >
            <div className="absolute inset-0 bg-[#002046]/20 pointer-events-none" />

            {/* Density Heat Pin: Delhi NCR */}
            <div className="absolute top-[42%] left-[46%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <span className="absolute w-8 h-8 rounded-full bg-[#fe932c]/50 animate-ping" />
              <span className="relative px-2.5 py-0.5 rounded-full bg-[#002046] text-white text-[11px] font-bold shadow-md border border-white">
                NCR · 428
              </span>
            </div>

            {/* Density Heat Pin: Punjab/Haryana */}
            <div className="absolute top-[28%] left-[34%] -translate-x-1/2 -translate-y-1/2">
              <span className="px-2 py-0.5 rounded-md bg-white text-[#002046] text-[11px] font-bold shadow border border-[#dce9ff]">
                Punjab · 310
              </span>
            </div>

            {/* Density Heat Pin: Eastern Belt / Bengal */}
            <div className="absolute bottom-[24%] right-[22%] -translate-x-1/2 -translate-y-1/2">
              <span className="px-2 py-0.5 rounded-md bg-white text-[#002046] text-[11px] font-bold shadow border border-[#dce9ff]">
                N. Bengal · 245
              </span>
            </div>

            {/* Floating Map Legend */}
            <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center justify-between text-[11px] font-semibold text-[#0b1c30] shadow-sm border border-white">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#fe932c]" />
                <span>High Density Follow-up</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#aec7f7]" />
                <span>Harvest Ready Zone</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Territory Leaderboard */}
      <section className="px-4 mb-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#e5eeff]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#904d00] text-[22px]">
                trophy
              </span>
              <h3 className="text-[16px] font-bold text-[#002046]">
                Territory Leaderboard
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSortByLeads(!sortByLeads)}
              className="px-3 py-1 rounded-full bg-[#eff4ff] text-[11px] font-bold text-[#002046] flex items-center gap-1 hover:bg-[#e5eeff] transition-colors border border-[#dce9ff]"
            >
              <span>{sortByLeads ? 'Total Leads' : 'Follow-up %'}</span>
              <span className="material-symbols-outlined text-[14px]">
                unfold_more
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {sortedLeaderboard.map((item, idx) => (
              <div
                key={item.name}
                className="bg-[#eff4ff] p-3 rounded-xl flex flex-col gap-1 hover:bg-[#e5eeff] transition-all border border-[#dce9ff]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#002046] text-white text-[11px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-[14px] font-bold text-[#002046]">
                      {item.name}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${item.badgeColor}`}
                  >
                    {item.rate}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#44474e] text-[12px] pl-7">
                  <span>{item.leads} Registered Leads</span>
                  <span className="text-[#002046] font-bold">
                    {item.followed} Followed up
                  </span>
                </div>

                <div className="w-full bg-[#d3e4fe] rounded-full h-1.5 mt-1 overflow-hidden">
                  <div
                    className="bg-[#002046] h-1.5 rounded-full"
                    style={{ width: `${item.rateNum}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Campaign Performance Breakdown */}
      <section className="px-4 mb-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#e5eeff]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-bold text-[#002046]">
              Campaign Performance
            </h3>
            <span className="material-symbols-outlined text-[#002046] text-[20px]">
              campaign
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Campaign 1 */}
            <div className="p-3 rounded-xl bg-[#eff4ff] flex flex-col gap-1 border border-[#dce9ff]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-red-600">
                    smart_display
                  </span>
                  <span className="text-[13px] font-bold text-[#002046]">
                    One Voice 27 - Hope Series #04
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#904d00]">
                  YouTube
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-[#44474e] text-[12px]">
                <span>Direct Interest Submissions</span>
                <span className="text-[14px] font-bold text-[#002046]">
                  1,840
                </span>
              </div>
              <div className="w-full bg-[#d3e4fe] rounded-full h-1.5 mt-0.5 overflow-hidden">
                <div className="bg-[#fe932c] h-1.5 rounded-full" style={{ width: '58%' }} />
              </div>
            </div>

            {/* Campaign 2 */}
            <div className="p-3 rounded-xl bg-[#eff4ff] flex flex-col gap-1 border border-[#dce9ff]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#002046]">
                    qr_code_2
                  </span>
                  <span className="text-[13px] font-bold text-[#002046]">
                    Delhi Metro Billboard &amp; Leaflet QR
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#002046]">
                  Print &amp; Transit
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-[#44474e] text-[12px]">
                <span>Scanned Responses</span>
                <span className="text-[14px] font-bold text-[#002046]">960</span>
              </div>
              <div className="w-full bg-[#d3e4fe] rounded-full h-1.5 mt-0.5 overflow-hidden">
                <div className="bg-[#1b365d] h-1.5 rounded-full" style={{ width: '32%' }} />
              </div>
            </div>

            {/* Campaign 3 */}
            <div className="p-3 rounded-xl bg-[#eff4ff] flex flex-col gap-1 border border-[#dce9ff]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-pink-600">
                    motion_photos_on
                  </span>
                  <span className="text-[13px] font-bold text-[#002046]">
                    Facebook &amp; Instagram Reels
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#904d00]">
                  Social Reach
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-[#44474e] text-[12px]">
                <span>Form Conversions</span>
                <span className="text-[14px] font-bold text-[#002046]">820</span>
              </div>
              <div className="w-full bg-[#d3e4fe] rounded-full h-1.5 mt-0.5 overflow-hidden">
                <div className="bg-[#904d00] h-1.5 rounded-full" style={{ width: '26%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pastoral Field Capacity */}
      <section className="px-4 mb-4">
        <div className="bg-[#002046] text-white rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5 shadow-md border border-[#1b365d]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#ffdcc3]">
                assignment_ind
              </span>
              <h4 className="text-[15px] font-bold text-white">
                Pastoral Field Capacity
              </h4>
            </div>
            <span className="text-[10px] text-[#d6e3ff] bg-[#1b365d] px-2.5 py-0.5 rounded-full font-bold">
              Active Bible Workers
            </span>
          </div>

          <p className="text-[13px] text-white/90 leading-relaxed">
            138 credentialed pastors and 290 lay evangelists are currently assigned to active follow-up inquiries across the 8 sections.
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-white/80 text-[12px]">
            <span>Average First-Contact Time:</span>
            <span className="font-bold text-[#ffdcc3]">3.8 Hours</span>
          </div>
        </div>
      </section>

      {/* Export Action strictly rendered for Super Admin */}
      {currentUserRole === 'super_admin' && (
        <section className="px-4 mb-4">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3.5 px-4 bg-[#904d00] hover:bg-[#6e3900] active:scale-[0.99] text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-80"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isExporting ? 'hourglass_empty' : 'file_download'}
            </span>
            <span>
              {isExporting
                ? 'Generating Report...'
                : 'Download Monthly Union Report (PDF/Excel)'}
            </span>
          </button>
        </section>
      )}
    </div>
  );
};
