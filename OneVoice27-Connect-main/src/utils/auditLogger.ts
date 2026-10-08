import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AuditLogEntry, UserRole } from '../types';

export type StandardAuditAction =
  | 'viewed seeker'
  | 'accessed seeker'
  | 'assigned role'
  | 'changed role'
  | 'assigned task'
  | 'deleted record'
  | 'exported data'
  | 'updated seeker'
  | 'created seeker'
  | 'requested data deletion'
  | 'changed permissions'
  | 'login'
  | 'logout'
  | string;

export interface LogUserActionOptions {
  action: StandardAuditAction;
  userId: string;
  role: UserRole | string;
  accessedCollection?: string;
  targetId?: string;
  accessedData?: string;
  userEmail?: string;
  result?: 'success' | 'failure' | 'denied' | string;
  location?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

/**
 * Universal utility function to log user actions to the audit_logs Firestore collection
 * with timestamp, userId, and role metadata (Section 20 & 31 Data Protection compliance).
 */
export async function logUserAction(options: LogUserActionOptions): Promise<AuditLogEntry> {
  const {
    action,
    userId,
    role,
    accessedCollection = 'general',
    targetId,
    accessedData = targetId || 'N/A',
    userEmail,
    result = 'success',
    location = 'Delhi Metro / Web Client',
    metadata = {},
    timestamp = new Date().toISOString(),
  } = options;

  const logId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const logEntry: AuditLogEntry = {
    id: logId,
    userId,
    userID: userId, // Backward compatibility for existing queries
    role,
    userRole: role, // Backward compatibility for existing views
    userEmail: userEmail || `${userId}@niu-sda.org`,
    action,
    accessedCollection,
    accessedData,
    targetId,
    result,
    timestamp,
    location,
    metadata,
  };

  try {
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
    if (idToken) {
      await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action,
          resource: accessedCollection,
          resourceId: targetId,
          metadata: { ...metadata, location, result, accessedData },
        }),
      });
    }
  } catch (error) {
    // Audit logs are non-blocking for user workflows, but logged for diagnostics
    console.warn('[AuditLogger] Failed to dispatch audit log via backend API:', error);
  }

  return logEntry;
}

/**
 * Utility helper: Log when a user views a seeker record or sensitive seeker profile
 */
export async function logViewedSeeker(
  userId: string,
  role: UserRole | string,
  seekerId: string,
  extra?: { seekerName?: string; userEmail?: string; isPII?: boolean }
): Promise<AuditLogEntry> {
  return logUserAction({
    action: 'viewed seeker',
    userId,
    role,
    accessedCollection: extra?.isPII ? 'seekers_private' : 'seekers',
    targetId: seekerId,
    accessedData: extra?.seekerName ? `Seeker: ${extra.seekerName} (${seekerId})` : `Seeker: ${seekerId}`,
    userEmail: extra?.userEmail,
    result: 'success',
    metadata: {
      isPIIAccess: Boolean(extra?.isPII),
      seekerId,
      seekerName: extra?.seekerName,
    },
  });
}

/**
 * Utility helper: Log document-level activity when a user accesses a seeker record
 */
export async function logAccessedSeeker(
  userId: string,
  role: UserRole | string,
  seekerId: string,
  extra?: { seekerName?: string; userEmail?: string; location?: string; isPII?: boolean }
): Promise<AuditLogEntry> {
  return logUserAction({
    action: 'accessed seeker',
    userId,
    role,
    accessedCollection: extra?.isPII ? 'seekers_private' : 'seekers',
    targetId: seekerId,
    accessedData: extra?.seekerName ? `Accessed seeker: ${extra.seekerName} (${seekerId})` : `Accessed seeker: ${seekerId}`,
    userEmail: extra?.userEmail,
    location: extra?.location || 'Delhi Metro / Regional Field',
    result: 'success',
    metadata: {
      isPIIAccess: Boolean(extra?.isPII),
      seekerId,
      seekerName: extra?.seekerName,
    },
  });
}

/**
 * Utility helper: Log document-level activity when a role is changed or updated
 */
export async function logChangedRole(
  userId: string,
  role: UserRole | string,
  targetUserId: string,
  newRole: string,
  extra?: { targetUserName?: string; userEmail?: string; assignedUnion?: string; location?: string }
): Promise<AuditLogEntry> {
  return logUserAction({
    action: 'changed role',
    userId,
    role,
    accessedCollection: 'users',
    targetId: targetUserId,
    accessedData: `Changed role: ${newRole} for user ${extra?.targetUserName || targetUserId}`,
    userEmail: extra?.userEmail,
    location: extra?.location || 'NIU Headquarters / Administration',
    result: 'success',
    metadata: {
      targetUserId,
      targetUserName: extra?.targetUserName,
      newRole,
      assignedUnion: extra?.assignedUnion,
    },
  });
}

/**
 * Utility helper: Log document-level activity when a pastoral task is assigned
 */
export async function logAssignedTask(
  userId: string,
  role: UserRole | string,
  seekerId: string,
  taskTitle: string,
  extra?: { seekerName?: string; userEmail?: string; location?: string }
): Promise<AuditLogEntry> {
  return logUserAction({
    action: 'assigned task',
    userId,
    role,
    accessedCollection: 'seekers',
    targetId: seekerId,
    accessedData: `Assigned task: "${taskTitle}" to seeker ${extra?.seekerName || seekerId}`,
    userEmail: extra?.userEmail,
    location: extra?.location || 'Delhi Metro / Field Parish',
    result: 'success',
    metadata: {
      seekerId,
      seekerName: extra?.seekerName,
      taskTitle,
    },
  });
}

/**
 * Utility helper: Log when an administrator assigns or updates a user role
 */
export async function logAssignedRole(
  userId: string,
  role: UserRole | string,
  targetUserId: string,
  newRole: string,
  extra?: { targetUserName?: string; userEmail?: string; assignedUnion?: string }
): Promise<AuditLogEntry> {
  return logUserAction({
    action: 'assigned role',
    userId,
    role,
    accessedCollection: 'users',
    targetId: targetUserId,
    accessedData: `Role change: ${newRole} for user ${extra?.targetUserName || targetUserId}`,
    userEmail: extra?.userEmail,
    result: 'success',
    metadata: {
      targetUserId,
      targetUserName: extra?.targetUserName,
      newRole,
      assignedUnion: extra?.assignedUnion,
    },
  });
}

/**
 * Utility helper: Log when a record (seeker, task, note) is deleted
 */
export async function logDeletedRecord(
  userId: string,
  role: UserRole | string,
  recordId: string,
  collectionName: string = 'seekers',
  extra?: { recordDescription?: string; userEmail?: string; reason?: string }
): Promise<AuditLogEntry> {
  return logUserAction({
    action: 'deleted record',
    userId,
    role,
    accessedCollection: collectionName,
    targetId: recordId,
    accessedData: extra?.recordDescription ? `${collectionName}: ${extra.recordDescription} (${recordId})` : `${collectionName}: ${recordId}`,
    userEmail: extra?.userEmail,
    result: 'success',
    metadata: {
      deletedRecordId: recordId,
      collection: collectionName,
      reason: extra?.reason,
    },
  });
}

/**
 * Automated helper: Log when a user successfully logs in through Firebase Auth
 * capturing user role, timestamp, location, and authentication metadata for security tracking.
 */
export async function logSuccessfulLogin(
  userId: string,
  role: UserRole | string,
  extra?: {
    userEmail?: string;
    location?: string;
    authProvider?: string;
    approvalStatus?: string;
  }
): Promise<AuditLogEntry> {
  const loginTimestamp = new Date().toISOString();
  return logUserAction({
    action: 'login',
    userId,
    role,
    accessedCollection: 'auth_sessions',
    targetId: userId,
    accessedData: `Successful authentication event for ${extra?.userEmail || userId} [Role: ${role}]`,
    userEmail: extra?.userEmail,
    location: extra?.location || 'Delhi Metro / Web Client',
    result: 'success',
    timestamp: loginTimestamp,
    metadata: {
      eventType: 'AUTH_SUCCESS_LOGIN',
      authProvider: extra?.authProvider || 'firebase_auth',
      userRole: role,
      approvalStatus: extra?.approvalStatus || 'approved',
      loginTimestamp,
      securityClearance: `Tier-${role}`,
    },
  });
}
