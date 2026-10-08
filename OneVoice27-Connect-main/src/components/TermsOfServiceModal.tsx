import React from 'react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#002046]/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto border border-[#dce9ff]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#002046] text-[#fe932c] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">gavel</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-[18px] font-bold text-[#002046]">
                Terms of Ministry Service
              </h2>
              <span className="text-[12px] text-[#44474e]">
                One Voice 27 Connect • Northern India Union
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#44474e] hover:bg-[#eff4ff]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="text-[13px] text-[#44474e] flex flex-col gap-3 leading-relaxed">
          <p>
            Welcome to One Voice 27 Connect, the digital ministry and pastoral care service of the Northern India Union of Seventh-day Adventists. By registering, you agree to these Terms of Service.
          </p>
          <div>
            <h4 className="font-bold text-[#002046]">1. Pastoral &amp; Fellowship Purpose</h4>
            <p>
              This platform provides spiritual guidance, complimentary Bible discovery guides, prayer support, and connections with local Seventh-day Adventist congregations across Northern India.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-[#002046]">2. Respectful &amp; Dignified Communication</h4>
            <p>
              In-app messaging and pastoral discussions are governed by Christian pastoral ethics. Harassment, commercial solicitation, and unauthorized dissemination of spiritual records are prohibited.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-[#002046]">3. Worker Accreditation &amp; Confidentiality</h4>
            <p>
              All pastoral workers, Bible teachers, and union officers operate under Section 20 accreditation and Section 31 confidentiality oaths. Violations result in immediate revocation of credentials.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-[#eff4ff] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-xl bg-[#002046] text-white text-[13px] font-bold hover:bg-[#1b365d] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
