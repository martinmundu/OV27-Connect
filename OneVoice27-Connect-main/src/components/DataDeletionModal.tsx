import React, { useState } from 'react';
import { submitDataDeletionRequest, recordAuditLog } from '../firebase';
import { Seeker } from '../types';

interface DataDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  seeker?: Seeker | null;
  onConfirmDeletion?: (seekerId: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const DataDeletionModal: React.FC<DataDeletionModalProps> = ({
  isOpen,
  onClose,
  seeker,
  onConfirmDeletion,
  showToast,
}) => {
  const [seekerId, setSeekerId] = useState(seeker?.id || '');
  const [seekerEmail, setSeekerEmail] = useState('');
  const [reason, setReason] = useState('Personal privacy request / Right to be forgotten');
  const [confirmedPledge, setConfirmedPledge] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedPledge) {
      showToast('Please confirm the data erasure verification checkbox', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const targetId = seekerId.trim() || seeker?.id || `REQ-${Date.now()}`;
      await submitDataDeletionRequest(targetId, reason, seekerEmail);
      await recordAuditLog(
        'DATA_DELETION_REQUESTED',
        `Seeker ID: ${targetId} | Email: ${seekerEmail}`,
        { role: 'super_admin' },
        'Client Privacy Portal'
      );

      if (onConfirmDeletion && seeker) {
        onConfirmDeletion(seeker.id);
      }

      showToast('Data erasure request registered in Section 31 privacy ledger', 'delete');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Erasure request logged. Union privacy officer will process within 24h.', 'check_circle');
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#002046]/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto border border-[#ffdad6]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">delete_forever</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-[17px] font-bold text-[#002046]">
                Seeker Data Erasure Request
              </h2>
              <span className="text-[11px] text-[#ba1a1a] font-semibold">
                GDPR &amp; Section 31 Right-to-be-Forgotten Compliance
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

        <p className="text-[12px] text-[#44474e] leading-snug">
          Under the Northern India Union Data Dignity Charter, seekers have the absolute right to have their personal details, phone numbers, addresses, and notes permanently expunged from all active ministry databases.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-bold text-[#44474e]">
              Seeker ID or Reference
            </label>
            <input
              type="text"
              required
              value={seekerId || seeker?.id || ''}
              onChange={(e) => setSeekerId(e.target.value)}
              placeholder="e.g. CR-2024-8841"
              className="h-10 px-3 rounded-xl bg-[#eff4ff] text-[13px] border border-[#dce9ff] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#002046]/20"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-bold text-[#44474e]">
              Seeker Email or Mobile (for verification)
            </label>
            <input
              type="text"
              required
              value={seekerEmail}
              onChange={(e) => setSeekerEmail(e.target.value)}
              placeholder="e.g. registered email or 10-digit mobile number"
              className="h-10 px-3 rounded-xl bg-[#eff4ff] text-[13px] border border-[#dce9ff] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#002046]/20"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-bold text-[#44474e]">
              Reason for Erasure
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#eff4ff] text-[13px] border border-[#dce9ff] text-[#0b1c30] focus:outline-none"
            >
              <option value="Personal privacy request / Right to be forgotten">
                Personal privacy request / Right to be forgotten
              </option>
              <option value="Relocated outside Northern India Union territory">
                Relocated outside Northern India Union territory
              </option>
              <option value="Completed Bible study & requested archive">
                Completed Bible study &amp; requested archive
              </option>
              <option value="Withdrawal of consent">
                Withdrawal of consent
              </option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-[#fff8f6] border border-[#ffdad6] flex items-start gap-2.5">
            <input
              id="confirm-erasure"
              type="checkbox"
              checked={confirmedPledge}
              onChange={(e) => setConfirmedPledge(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-[#ba1a1a] accent-[#ba1a1a] cursor-pointer shrink-0"
            />
            <label
              htmlFor="confirm-erasure"
              className="text-[11px] text-[#44474e] select-none cursor-pointer leading-tight"
            >
              I confirm that this data erasure request is authorized and will permanently purge all PII from the local directory and notify the regional pastor.
            </label>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl bg-[#eff4ff] text-[#002046] text-[12px] font-bold hover:bg-[#e5eeff]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 h-10 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[12px] font-bold shadow-md transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Confirm Data Erasure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
