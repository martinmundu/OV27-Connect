export type Language = 'en' | 'hi';

export const ASSIGNED_TERRITORIAL_UNIONS = [
  'Eastern Jharkhand Section',
  'Eastern Uttar Pradesh Section',
  'North Bengal Section',
  'North India Section',
  'Rajasthan Section',
  'South Bengal Section',
  'Upper Ganges Section',
  'Western Jharkhand Section',
  'Bihar Region',
  'Central Uttar Pradesh Region',
  'Chhattisgarh Region',
  'Delhi Metro Region',
  'Haryana Region',
  'Himachal Pradesh Region',
  'Kolkata Metro Region',
  'Madhya Pradesh Region',
  'Uttarakhand Region',
] as const;

export type AssignedTerritorialUnion = (typeof ASSIGNED_TERRITORIAL_UNIONS)[number];

export type UserRole = 'super_admin' | 'union_admin' | 'worker' | 'chat_user' | 'pending_user';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserPrivileges {
  canViewSeekers?: boolean;
  canExportData?: boolean;
  canReassignSeekers?: boolean;
  canAccessChat?: boolean;
  canEditNotes?: boolean;
  canViewAuditLogs?: boolean;
  canManageUsers?: boolean;
  canDeleteRecords?: boolean;
}

export const DEFAULT_ROLE_PRIVILEGES: Record<UserRole, UserPrivileges> = {
  super_admin: {
    canViewSeekers: true,
    canExportData: true,
    canReassignSeekers: true,
    canAccessChat: true,
    canEditNotes: true,
    canViewAuditLogs: true,
    canManageUsers: true,
    canDeleteRecords: true,
  },
  union_admin: {
    canViewSeekers: true,
    canExportData: false,
    canReassignSeekers: true,
    canAccessChat: true,
    canEditNotes: true,
    canViewAuditLogs: false,
    canManageUsers: false,
    canDeleteRecords: false,
  },
  worker: {
    canViewSeekers: false,
    canExportData: false,
    canReassignSeekers: false,
    canAccessChat: true,
    canEditNotes: true,
    canViewAuditLogs: false,
    canManageUsers: false,
    canDeleteRecords: false,
  },
  chat_user: {
    canViewSeekers: false,
    canExportData: false,
    canReassignSeekers: false,
    canAccessChat: true,
    canEditNotes: false,
    canViewAuditLogs: false,
    canManageUsers: false,
    canDeleteRecords: false,
  },
  pending_user: {
    canViewSeekers: false,
    canExportData: false,
    canReassignSeekers: false,
    canAccessChat: false,
    canEditNotes: false,
    canViewAuditLogs: false,
    canManageUsers: false,
    canDeleteRecords: false,
  },
};

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  assignedUnion: string;
  approvalStatus: ApprovalStatus;
  emailVerified: boolean;
  privileges?: UserPrivileges;
  createdAt: string;
}

export type DiscipleshipStage = 
  | 'New Interest' 
  | 'Contacted' 
  | 'Bible Study' 
  | 'Visited Sabbath' 
  | 'Baptismal Prep'
  | 'Baptized Member';

// Isolated Seeker PII stored strictly in /seekers_private/{seekerId}
// RESTRICTED TO SUPER_ADMIN AND UNION_ADMIN. WORKERS CANNOT ACCESS.
export interface SeekerPrivateData {
  seekerId: string;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  personalNotes?: string;
  assignedUnion: string;
  updatedAt?: any;
}

// Seeker pastoral document stored in /seekers/{seekerId}
// COMPLETELY STRIPPED OF PII: No phone, no email, no address.
// WORKERS CANNOT ACCESS /seekers COLLECTION. Accessible ONLY to Super Admin and Union Admin.
export interface Seeker {
  id: string;
  name: string; // Ministry pseudonym / public name
  nameHindi?: string;
  age: string;
  gender: string;
  language: string;
  location: string; // General district / region (e.g. "Connaught Place, New Delhi") - NO street address
  pinCode: string;
  occupation?: string;
  avatarUrl: string;

  // Union boundary & Caretaker assignment
  assignedUnion: string;
  assignedWorker: string;
  chatReference: string;

  stage: DiscipleshipStage;
  stageProgress: number; // 0 to 100
  slaUrgent: boolean;
  slaDueHours?: number;
  inboundSource: string;
  registrationDate: string;
  inquiryQuote: string;
  assignedChurch: string;
  assignedChurchAddress: string;
  assignedPastor: string;
  assignedPastorTitle: string;
  interests: string[];
  currentCurriculum: {
    title: string;
    unit: string;
    nextTopic: string;
    completedLesson?: string;
  };
  scheduledAppointment?: {
    date: string;
    time: string;
    type: string;
  };
  spiritualFocusAreas: string[];
  timeline: PastoralTimelineEntry[];
  tasks: PastoralTask[];
}

// Dedicated Pastoral Task stored in /seekers_tasks/{taskId}
// Accessible by workers strictly via assignedWorker == auth.uid queries. Contains NO PII!
export interface SeekerTask {
  id: string; // taskId
  taskId?: string;
  seekerId: string; // Opaque Case ID (e.g. "CASE-8841" or "CR-2024-8841") - NO real names
  caseNumber?: string;
  title: string;
  taskTitle?: string;
  stage?: DiscipleshipStage;
  dueDate?: string;
  dueDateOrStatus: string;
  status?: 'pending' | 'in_progress' | 'completed' | string;
  completed: boolean;
  assignedWorker: string;
  assignedUnion: string;
  assignedChurch?: string;
  notes?: string;
  chatReference?: string;
  createdAt?: string;
  updatedAt?: any;
}

export interface ChatConversation {
  id: string; // chatId
  seekerId: string; // Opaque case ID
  assignedWorkerId: string;
  assignedUnion: string;
  participants: string[]; // [authorizedWorkerUid, authorizedSeekerUid]
  lastMessage?: string;
  lastMessageTime?: string;
  updatedAt?: any;
  createdAt?: any;
  status?: 'active' | 'archived';
  typing?: Record<string, boolean>;
}

export interface PastoralTimelineEntry {
  id: string;
  type: 'visit' | 'whatsapp' | 'phone' | 'church';
  title: string;
  duration?: string;
  timestamp: string;
  loggedBy: string;
  notes: string;
  tags: string[];
}

export interface PastoralTask {
  id: string;
  title: string;
  dueDateOrStatus: string;
  completed: boolean;
  assignee?: string;
}

export interface Church {
  id: string;
  name: string;
  locality: string;
  address: string;
  distanceKm: number;
  isVerified: boolean;
  mapCoordinates: { lat: number; lng: number };
  pastor: {
    name: string;
    role: string;
    phone: string;
    whatsapp: string;
    languages: string[];
    avatarUrl: string;
    availableToday: boolean;
    quote: string;
  };
  sabbathSchedule: {
    time: string;
    event: string;
    accentColor: string;
  }[];
  alternateChurches?: {
    name: string;
    locality: string;
    distanceKm: number;
    worshipTimes: string;
    contact: string;
  }[];
}

export interface ChatMessage {
  id: string;
  senderID?: string;
  receiverID?: string;
  participants?: string[];
  assignedUnion?: string;
  role?: string;
  sender: 'pastor' | 'seeker';
  text: string;
  timestamp: string;
  audioPrayer?: {
    duration: string;
    scriptureSnippet: string;
  };
  scheduleCard?: {
    title: string;
    location: string;
    sabbathSchoolTime: string;
    divineServiceTime: string;
    potluckNote: string;
  };
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userID?: string;
  role: UserRole | string;
  userRole?: UserRole | string;
  userEmail?: string;
  action: string;
  accessedCollection?: string;
  accessedData?: string;
  targetId?: string;
  result?: 'success' | 'failure' | 'denied' | string;
  timestamp: string;
  location?: string;
  metadata?: Record<string, any>;
}

export interface WorkerPersonnel {
  id: string;
  name: string;
  roleTitle: string;
  tierLevel: number;
  tierName: string;
  jurisdiction: string;
  avatarUrl: string;
  statusBadge: string;
  assignedSoulsCount?: number;
  phone: string;
  category: 'super' | 'section' | 'pastoral';
  roleKey?: UserRole;
  assignedUnion?: string;
  approvalStatus?: ApprovalStatus;
}
