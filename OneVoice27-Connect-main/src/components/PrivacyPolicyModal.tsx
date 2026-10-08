import React from 'react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestDataDeletion: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onRequestDataDeletion,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#002046]/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[88vh] overflow-y-auto border border-[#dce9ff]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#002046] text-[#fe932c] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">policy</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-[18px] font-bold text-[#002046]">
                Data Dignity &amp; Privacy Policy
              </h2>
              <span className="text-[12px] text-[#44474e]">
                Northern India Union Seventh-day Adventist • Section 31 Protocols
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

        {/* Content */}
        <div className="text-[13px] text-[#44474e] flex flex-col gap-3.5 leading-relaxed">
          <div className="bg-[#eff4ff] p-3.5 rounded-xl border border-[#dce9ff] flex items-start gap-2.5 text-[#002046]">
            <span className="material-symbols-outlined text-[20px] text-[#904d00] shrink-0">
              verified_user
            </span>
            <p className="text-[12px]">
              <strong>Pastoral Privacy Commitment:</strong> The Northern India Union respects every seeker's spiritual privacy. Your personally identifiable information (PII) is safeguarded under strict Role-Based Access Controls (Section 20) and tamper-resistant audit tracking (Section 31).
            </p>
          </div>

          <div>
            <h3 className="text-[14px] font-bold text-[#002046] mb-1">
              1. What Information We Collect
            </h3>
            <p>
              When registering for pastoral care, Bible study guides, or local Sabbath services, we collect your name, phone/WhatsApp number, optional email address, approximate geographic area or PIN code, age bracket, and spiritual study interests.
            </p>
          </div>

          <div>
            <h3 className="text-[14px] font-bold text-[#002046] mb-1">
              2. Strict Role-Based Access Boundaries
            </h3>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-[12px]">
              <li>
                <strong>Super Administrators:</strong> Full oversight across the Northern India Union to ensure ministry integrity and system protection.
              </li>
              <li>
                <strong>Union Administrators:</strong> Access strictly limited to seekers within their assigned union territory (e.g. Delhi Metro, Upper Ganges, Punjab). No data export permitted.
              </li>
              <li>
                <strong>Pastoral Workers &amp; Lay Caretakers:</strong> Contact information (phone, email) is masked and withheld. All communications occur exclusively through the internal secure app messaging system.
              </li>
              <li>
                <strong>Chat Users:</strong> Can only send and receive spiritual messages; cannot view seeker records or personal contact details.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[14px] font-bold text-[#002046] mb-1">
              3. Anti-Data Leakage &amp; Security Auditing
            </h3>
            <p>
              Every access to seeker records is logged in an immutable, cryptographically verifiable security ledger (`audit_logs`). Copying personal information, screen downloading, and unauthorized exporting are technically blocked.
            </p>
          </div>

          <div>
            <h3 className="text-[14px] font-bold text-[#002046] mb-1">
              4. Your Rights &amp; Data Deletion (Right to be Forgotten)
            </h3>
            <p>
              You maintain the absolute right to inspect your ministry record or request complete erasure of your data at any time without penalty or question.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#eff4ff] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestDataDeletion();
            }}
            className="text-[12px] font-bold text-[#ba1a1a] hover:underline flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">delete_forever</span>
            <span>Request Complete Data Deletion / Erasure</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-xl bg-[#002046] text-white text-[13px] font-bold hover:bg-[#1b365d] transition-colors"
          >
            I Understand &amp; Agree
          </button>
        </div>
      </div>
    </div>
  );
};
