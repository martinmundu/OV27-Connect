import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navbar, NavTab } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { UnauthorizedView } from './components/UnauthorizedView';
import { SeekerConnectView } from './components/SeekerConnectView';
import { ChurchesView } from './components/ChurchesView';
import { WorkerCrmView } from './components/WorkerCrmView';
import { SeekerProfileView } from './components/SeekerProfileView';
import { UnionAnalyticsView } from './components/UnionAnalyticsView';
import { RolesGovernanceView } from './components/RolesGovernanceView';
import { PastoralChatView } from './components/PastoralChatView';
import { LogInteractionModal } from './components/LogInteractionModal';
import { WhatsAppDispatchModal } from './components/WhatsAppDispatchModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { TermsOfServiceModal } from './components/TermsOfServiceModal';
import { DataDeletionModal } from './components/DataDeletionModal';
import { PendingApprovalView } from './components/PendingApprovalView';
import { SecurityTestModal } from './components/SecurityTestModal';
import { Toast } from './components/Toast';
import { Language, Seeker, SeekerTask, PastoralTimelineEntry, AppUser, UserRole } from './types';
import { defaultChurch } from './data/mockData';
import {
  subscribeToAuth,
  subscribeSeekers,
  subscribeSeekerTasks,
  persistSeeker,
  persistSeekerTask,
  persistPastoralLog,
  syncUserProfile,
  subscribeUserProfile,
  deleteSeekerRecord,
  logDeletedRecord,
  logChangedRole,
  logUserAction,
  logOut,
} from './firebase';
import { isRouteAuthorized, getUnauthorizedReason } from './security';
import { User as FirebaseUser } from 'firebase/auth';
import { useFirebaseAuthAudit } from './hooks/useFirebaseAuthAudit';

export default function App() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<NavTab>('crm');
  const [seekers, setSeekers] = useState<Seeker[]>([]);
  const [selectedSeeker, setSelectedSeeker] = useState<Seeker | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [activeModalSeeker, setActiveModalSeeker] = useState<Seeker | null>(null);
  const [inPastoralChat, setInPastoralChat] = useState(false);
  const [chatTargetSeeker, setChatTargetSeeker] = useState<Seeker | null>(null);

  // Authentication & Route Protection State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPublicSeekerMode, setIsPublicSeekerMode] = useState(false);

  // Enterprise RBAC User State (Roles come only from Firebase claims or Firestore user profile)
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  const [workerTasks, setWorkerTasks] = useState<SeekerTask[]>([]);
  const [isSecurityTestOpen, setIsSecurityTestOpen] = useState(false);

  // Privacy & Compliance Modals
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isDataDeletionModalOpen, setIsDataDeletionModalOpen] = useState(false);
  const [deletionTargetSeeker, setDeletionTargetSeeker] = useState<Seeker | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIcon, setToastIcon] = useState<string>('check_circle');

  const showToast = (msg: string, icon: string = 'check_circle') => {
    setToastMessage(msg);
    setToastIcon(icon);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Automated hook in the Firebase authentication flow to log every successful login event to audit_logs
  useFirebaseAuthAudit(currentUser, appUser, isAuthenticated);

  // Subscribe to Firebase Auth and real-time user profile on mount
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (user) {
        try {
          const profile = await syncUserProfile(user);
          setAppUser(profile);
          setIsAuthenticated(true);

          // Listen for profile changes (e.g. approval, union changes, role elevation by Super Admin)
          unsubProfile = subscribeUserProfile(user.uid, (updatedProfile) => {
            if (updatedProfile) {
              setAppUser(updatedProfile);
            }
          });
        } catch (e) {
          console.warn('Profile sync fallback:', e);
          setIsAuthenticated(false);
          setAppUser(null);
        }
      } else {
        setAppUser(null);
        setIsAuthenticated(false);
      }
      setIsAuthLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubProfile) {
        unsubProfile();
      }
    };
  }, []);

  // Scoped subscription by role: workers ONLY subscribe to seekers_tasks (NO /seekers query)
  useEffect(() => {
    if (!isAuthenticated || !appUser) return;

    if (appUser.role === 'worker') {
      const unsubTasks = subscribeSeekerTasks(
        (tasks) => {
          setWorkerTasks(tasks || []);
        },
        'worker',
        appUser.uid,
        appUser.assignedUnion
      );
      return () => unsubTasks();
    } else {
      const unsubSeekers = subscribeSeekers(
        (firestoreSeekers) => {
          setSeekers(firestoreSeekers || []);
        },
        appUser.role,
        appUser.assignedUnion
      );
      return () => unsubSeekers();
    }
  }, [appUser?.role, appUser?.assignedUnion, appUser?.uid, isAuthenticated]);

  // Sign out handler
  const handleSignOut = async () => {
    if (appUser) {
      logUserAction({
        action: 'logout',
        userId: appUser.uid,
        role: appUser.role,
        userEmail: appUser.email,
        location: appUser.assignedUnion,
        accessedData: `User logged out`,
      });
    }
    try {
      await logOut();
    } catch (e) {
      console.warn('Logout fallback:', e);
    }
    setCurrentUser(null);
    setAppUser(null);
    setIsAuthenticated(false);
    setIsPublicSeekerMode(false);
    setSelectedSeeker(null);
    setInPastoralChat(false);
    showToast('Signed out. Redirected to ministry login', 'logout');
  };

  // Open Chat helper
  const handleOpenChatWithContact = (seeker?: Seeker | null) => {
    setChatTargetSeeker(seeker || null);
    setInPastoralChat(true);
    setActiveTab('chat');
    setSelectedSeeker(null);
  };

  // Seeker registration strictly routed to trusted backend API (POST /api/seekers/register)
  // Browser NEVER directly persists private PII to Firestore
  const handleRegisterSeeker = async (
    newSeekerData: Partial<Seeker>,
    privatePII?: { fullName: string; phone: string; email?: string; address: string }
  ) => {
    try {
      const parsedAge = typeof newSeekerData.age === 'number'
        ? newSeekerData.age
        : parseInt(String(newSeekerData.age || '30'), 10) || 30;

      const response = await fetch('/api/seekers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `reg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        },
        body: JSON.stringify({
          fullName: privatePII?.fullName || newSeekerData.name || 'Inquirer',
          phone: privatePII?.phone || '',
          email: privatePII?.email || undefined,
          address: privatePII?.address || newSeekerData.location || '',
          pinCode: newSeekerData.pinCode || '110001',
          location: newSeekerData.location || undefined,
          interests: newSeekerData.interests || [],
          age: parsedAge,
          gender: newSeekerData.gender || 'Male',
          language: newSeekerData.language || 'हिंदी (Hindi)',
        }),
      });

      const result = await response.json();
      if (result.success) {
        showToast(`Registration received: ${result.caseNumber || result.seekerId}`, 'check_circle');
      } else {
        showToast(result.error || 'Registration failed', 'error');
      }
    } catch (err: any) {
      console.error('Registration processing failed:', err);
      showToast('Registration submitted', 'check_circle');
    }
  };

  const handleUpdateSeeker = (updated: Seeker) => {
    const updatedList = seekers.map((s) => (s.id === updated.id ? updated : s));
    setSeekers(updatedList);
    if (selectedSeeker?.id === updated.id) {
      setSelectedSeeker(updated);
    }
    persistSeeker(updated);
  };

  const handleSavePastoralEntry = (
    entry: PastoralTimelineEntry,
    advanceStage?: boolean
  ) => {
    const targetSeeker = activeModalSeeker;
    if (!targetSeeker) return;
    let nextStage = targetSeeker.stage;
    let nextProgress = targetSeeker.stageProgress;

    if (advanceStage) {
      if (targetSeeker.stage === 'New Interest') {
        nextStage = 'Contacted';
        nextProgress = 30;
      } else if (targetSeeker.stage === 'Contacted') {
        nextStage = 'Bible Study';
        nextProgress = 45;
      } else if (targetSeeker.stage === 'Bible Study') {
        nextStage = 'Visited Sabbath';
        nextProgress = 65;
      } else if (targetSeeker.stage === 'Visited Sabbath') {
        nextStage = 'Baptismal Prep';
        nextProgress = 85;
      }
    }

    const updated: Seeker = {
      ...targetSeeker,
      stage: nextStage,
      stageProgress: nextProgress,
      slaUrgent: false,
      timeline: [entry, ...(targetSeeker.timeline || [])],
    };

    handleUpdateSeeker(updated);
    persistPastoralLog(targetSeeker.id, entry);
  };

  const handleOpenLogModal = (seeker?: Seeker) => {
    setActiveModalSeeker(seeker || selectedSeeker || seekers[0]);
    setIsLogModalOpen(true);
  };

  const handleOpenWhatsAppModal = (seeker: Seeker) => {
    setActiveModalSeeker(seeker);
    setIsWhatsAppModalOpen(true);
  };

  const handleOpenDataDeletion = (seeker?: Seeker) => {
    setDeletionTargetSeeker(seeker || selectedSeeker);
    setIsDataDeletionModalOpen(true);
  };

  const handleConfirmDeletion = async (seekerId: string) => {
    setSeekers((prev) => prev.filter((s) => s.id !== seekerId));
    if (selectedSeeker?.id === seekerId) {
      setSelectedSeeker(null);
    }
    try {
      await deleteSeekerRecord(seekerId);
      if (appUser) {
        await logDeletedRecord(
          appUser.uid,
          appUser.role,
          seekerId,
          'seekers',
          {
            userEmail: appUser.email,
            reason: 'GDPR Section 31 Data Erasure executed',
          }
        );
      }
    } catch (e) {
      console.warn('Local seeker purged:', e);
    }
  };

  const urgentCount = seekers.filter((s) => s.slaUrgent).length;

  // 1. Initial Loading Splash
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#071326] text-white flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#904d00] to-[#ffdcc3] p-0.5 shadow-2xl flex items-center justify-center animate-pulse">
          <div className="w-full h-full bg-[#071326] rounded-[14px] flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[28px] text-[#ffdcc3]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              church
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="text-[17px] font-bold tracking-tight">OneVoice27 Connect</span>
          <span className="text-[12px] text-[#8e9099] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Verifying Firebase Auth state &amp; Section 31 custom claims...
          </span>
        </div>
      </div>
    );
  }

  // 2. Route Protection: Unauthenticated Users are redirected to LoginView
  if (!isAuthenticated && !isPublicSeekerMode) {
    return (
      <div className="min-h-screen bg-[#071326]">
        <LoginView
          onOpenPublicSeeker={() => setIsPublicSeekerMode(true)}
          showToast={showToast}
        />
        <Toast message={toastMessage} icon={toastIcon} />
      </div>
    );
  }

  // 3. Public Seeker Mode (Unauthenticated visitors can register & find churches)
  if (isPublicSeekerMode && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans">
        {/* Public Visitor Header */}
        <div className="bg-[#1b365d] text-white px-4 py-2.5 flex items-center justify-between text-[12px] shadow-md sticky top-0 z-50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[18px] text-[#ffdcc3] shrink-0">
              person_pin_circle
            </span>
            <span className="font-semibold truncate">
              Public Seeker Portal • Northern India Union SDA
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsPublicSeekerMode(false)}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#ffdcc3] font-semibold text-[11px] transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">login</span>
            <span>Staff Login</span>
          </button>
        </div>

        <main className="flex-1 w-full pb-16">
          <SeekerConnectView
            currentLanguage={currentLanguage}
            onRegisterSeeker={handleRegisterSeeker}
            onNavigateToChurches={() => setActiveTab('churches')}
            onOpenPrivacyPolicy={() => setIsPrivacyModalOpen(true)}
            onOpenTerms={() => setIsTermsModalOpen(true)}
            showToast={showToast}
          />
        </main>

        <PrivacyPolicyModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
          onRequestDataDeletion={() => handleOpenDataDeletion()}
        />
        <TermsOfServiceModal
          isOpen={isTermsModalOpen}
          onClose={() => setIsTermsModalOpen(false)}
        />
        <Toast message={toastMessage} icon={toastIcon} />
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="min-h-screen bg-[#071326] text-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-[13px] text-[#8e9099]">Loading verified user credentials...</span>
      </div>
    );
  }

  // 4. Authenticated Route Protection Verification
  const currentTargetRoute = inPastoralChat ? 'chat' : activeTab;
  const isAuthorized = isRouteAuthorized(
    currentTargetRoute,
    appUser.role,
    appUser.approvalStatus
  );
  const unauthorizedReason = getUnauthorizedReason(
    currentTargetRoute,
    appUser.role,
    appUser.approvalStatus
  );

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans selection:bg-[#aec7f7]">
      {/* Universal App Header with Role Badge & Security Tools */}
      <Header
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        onOpenProfile={() => {
          if (appUser.role === 'super_admin') {
            setActiveTab('admin');
            setSelectedSeeker(null);
            setInPastoralChat(false);
            showToast('Opened Roles & Governance (Section 20 & 31)', 'admin_panel_settings');
          } else {
            showToast('Roles & Governance requires Super Admin custom claims', 'lock');
          }
        }}
        currentUser={currentUser}
        currentUserRole={appUser.role}
        currentUserUnion={appUser.assignedUnion}
        onOpenPrivacyPolicy={() => setIsPrivacyModalOpen(true)}
        onOpenTerms={() => setIsTermsModalOpen(true)}
        onOpenSecurityTesting={() => {
          setIsSecurityTestOpen(true);
        }}
        onSignOut={handleSignOut}
        showToast={showToast}
      />

      {/* Main Screen Router */}
      <main className="flex-1 w-full pt-16">
        {/* If account is pending approval, gate entire dashboard */}
        {appUser.approvalStatus === 'pending' || appUser.role === 'pending_user' ? (
          <PendingApprovalView
            user={appUser}
            onRefreshProfile={(updated) => setAppUser(updated)}
            showToast={showToast}
          />
        ) : !isAuthorized ? (
          /* Route Protection Intercept: User tried to access an unauthorized route */
          <UnauthorizedView
            attemptedRoute={currentTargetRoute}
            userRole={appUser.role}
            userUnion={appUser.assignedUnion}
            reason={unauthorizedReason}
            onNavigateHome={() => {
              setInPastoralChat(false);
              setActiveTab('crm');
            }}
            onSignOut={handleSignOut}
          />
        ) : inPastoralChat || activeTab === 'chat' ? (
          <PastoralChatView
            onBack={() => {
              setInPastoralChat(false);
              if (activeTab === 'chat') {
                setActiveTab('crm');
              }
            }}
            initialSeeker={chatTargetSeeker}
            allSeekers={appUser.role === 'worker' ? [] : seekers}
            workerTasks={workerTasks}
            currentUser={currentUser}
            currentUserRole={appUser.role}
            currentUserUnion={appUser.assignedUnion}
            showToast={showToast}
          />
        ) : selectedSeeker && appUser.role !== 'worker' ? (
          <SeekerProfileView
            seeker={selectedSeeker}
            onBack={() => setSelectedSeeker(null)}
            onOpenLogModal={handleOpenLogModal}
            onOpenWhatsAppModal={handleOpenWhatsAppModal}
            onOpenChat={() => handleOpenChatWithContact(selectedSeeker)}
            onRequestDataDeletion={handleOpenDataDeletion}
            onUpdateSeeker={handleUpdateSeeker}
            currentUserRole={appUser.role}
            currentUserUnion={appUser.assignedUnion}
            showToast={showToast}
          />
        ) : activeTab === 'seekers' ? (
          <SeekerConnectView
            currentLanguage={currentLanguage}
            onRegisterSeeker={handleRegisterSeeker}
            onNavigateToChurches={() => {
              setActiveTab('churches');
            }}
            onOpenPrivacyPolicy={() => setIsPrivacyModalOpen(true)}
            onOpenTerms={() => setIsTermsModalOpen(true)}
            showToast={showToast}
          />
        ) : activeTab === 'churches' ? (
          <ChurchesView
            church={defaultChurch}
            onOpenChat={() => handleOpenChatWithContact(null)}
            showToast={showToast}
          />
        ) : activeTab === 'crm' ? (
          <WorkerCrmView
            seekers={appUser.role === 'worker' ? [] : seekers}
            workerTasks={workerTasks}
            onSelectSeeker={(seeker) => setSelectedSeeker(seeker)}
            onOpenLogModal={handleOpenLogModal}
            onOpenWhatsAppModal={handleOpenWhatsAppModal}
            onOpenChat={(target) => handleOpenChatWithContact(target as any)}
            onToggleTask={(taskId) => {
              setWorkerTasks((prev) =>
                prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
              );
            }}
            currentUserRole={appUser.role}
            currentUserUnion={appUser.assignedUnion}
            showToast={showToast}
          />
        ) : activeTab === 'analytics' ? (
          <UnionAnalyticsView
            currentUserRole={appUser.role}
            currentUserUnion={appUser.assignedUnion}
            showToast={showToast}
          />
        ) : activeTab === 'admin' ? (
          <RolesGovernanceView
            currentUserRole={appUser.role}
            currentUserUnion={appUser.assignedUnion}
            showToast={showToast}
          />
        ) : null}
      </main>

      {/* Bottom Sticky Navigation with Role-Aware Tab Visibility */}
      {isAuthenticated &&
        appUser.approvalStatus === 'approved' &&
        appUser.role !== 'pending_user' && (
          <Navbar
            activeTab={inPastoralChat ? 'chat' : activeTab}
            currentUserRole={appUser.role}
            onTabChange={(tab) => {
              // Route protection check on tab click
              if (!isRouteAuthorized(tab, appUser.role, appUser.approvalStatus)) {
                showToast(
                  getUnauthorizedReason(tab, appUser.role, appUser.approvalStatus),
                  'lock'
                );
                return;
              }
              setActiveTab(tab);
              setSelectedSeeker(null);
              if (tab === 'chat') {
                setInPastoralChat(true);
              } else {
                setInPastoralChat(false);
              }
            }}
            urgentCount={urgentCount}
          />
        )}

      {/* Log Pastoral Interaction Drawer Modal */}
      {activeModalSeeker && (
        <LogInteractionModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          seeker={activeModalSeeker}
          onSaveEntry={handleSavePastoralEntry}
          showToast={showToast}
        />
      )}

      {/* WhatsApp Ministry Dispatch Modal */}
      {activeModalSeeker && (
        <WhatsAppDispatchModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          seeker={activeModalSeeker}
          currentUserRole={appUser.role}
          showToast={showToast}
        />
      )}

      {/* Data Dignity & Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        onRequestDataDeletion={() => handleOpenDataDeletion()}
      />

      {/* Terms of Ministry Service Modal */}
      <TermsOfServiceModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />

      {/* Seeker Data Erasure Request Modal */}
      <DataDeletionModal
        isOpen={isDataDeletionModalOpen}
        onClose={() => setIsDataDeletionModalOpen(false)}
        seeker={deletionTargetSeeker}
        onConfirmDeletion={handleConfirmDeletion}
        showToast={showToast}
      />

      {/* Automated Security Test Suite Modal (Worker / Union Admin / Super Admin / Unauth) */}
      <SecurityTestModal
        isOpen={isSecurityTestOpen}
        onClose={() => setIsSecurityTestOpen(false)}
        currentUserRole={appUser.role}
        currentUserUnion={appUser.assignedUnion}
        showToast={showToast}
      />

      {/* Scannable Feedback Toast */}
      <Toast message={toastMessage} icon={toastIcon} />
    </div>
  );
}
