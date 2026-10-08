import { UserRole, UserPrivileges } from './types';

/**
 * Enterprise RBAC & Section 20 / 31 Security Helper Functions
 */

// PII Read Access: Strictly Super Admin and authorized Union Admin
export function canViewSeekerPII(role: UserRole, privileges?: UserPrivileges): boolean {
  if (privileges && typeof privileges.canViewSeekers === 'boolean') {
    return privileges.canViewSeekers;
  }
  return role === 'super_admin' || role === 'union_admin';
}

// Data Export & Download: Controlled by Super Admin privilege assignment
export function canExportData(role: UserRole, privileges?: UserPrivileges): boolean {
  if (privileges && typeof privileges.canExportData === 'boolean') {
    return privileges.canExportData;
  }
  return role === 'super_admin';
}

// Global System & User Management: Super Admin or delegated privilege
export function canManageUsers(role: UserRole, privileges?: UserPrivileges): boolean {
  if (privileges && typeof privileges.canManageUsers === 'boolean') {
    return privileges.canManageUsers;
  }
  return role === 'super_admin';
}

// Seeker Database Access: Chat users and workers CANNOT access the /seekers collection unless granted
export function canAccessSeekerDatabase(role: UserRole, privileges?: UserPrivileges): boolean {
  if (privileges && typeof privileges.canViewSeekers === 'boolean') {
    return privileges.canViewSeekers;
  }
  return role === 'super_admin' || role === 'union_admin';
}

// Capability Matrix visibility: Super Admin or delegated privilege
export function canViewCapabilityMatrix(role: UserRole, privileges?: UserPrivileges): boolean {
  if (privileges && typeof privileges.canManageUsers === 'boolean') {
    return privileges.canManageUsers;
  }
  return role === 'super_admin';
}

// In-App Chat Access
export function canAccessChat(role: UserRole, privileges?: UserPrivileges): boolean {
  if (privileges && typeof privileges.canAccessChat === 'boolean') {
    return privileges.canAccessChat;
  }
  return role !== 'pending_user';
}

// Audit Logs Access: Super Admin or delegated privilege
export function canViewAuditLogs(role: UserRole, privileges?: UserPrivileges): boolean {
  if (privileges && typeof privileges.canViewAuditLogs === 'boolean') {
    return privileges.canViewAuditLogs;
  }
  return role === 'super_admin';
}

// Union Boundary Access Check:
// Super Admin can see all unions.
// Union Admin can ONLY see seekers assigned to their Union.
// Worker can see only assigned seekers/tasks within their union.
export function canAccessSeekerByUnion(
  userRole: UserRole,
  userUnion: string,
  seekerUnion: string
): boolean {
  if (userRole === 'super_admin') return true;
  if (userRole === 'union_admin') {
    return seekerUnion.toLowerCase().trim() === userUnion.toLowerCase().trim();
  }
  if (userRole === 'worker') {
    return seekerUnion.toLowerCase().trim() === userUnion.toLowerCase().trim();
  }
  return false;
}

// Phone masking for unauthorized roles (Workers, Chat Users)
export function maskPhoneNumber(phone: string, role: UserRole): string {
  if (canViewSeekerPII(role)) {
    return phone;
  }
  return '+91 ••••• ••••• [PROTECTED - Chat Only]';
}

// Email masking for unauthorized roles
export function maskEmail(email: string | undefined, role: UserRole): string {
  if (!email) return 'Not Provided';
  if (canViewSeekerPII(role)) {
    return email;
  }
  const parts = email.split('@');
  if (parts.length < 2) return '••••••@•••••.com [RESTRICTED]';
  return `${parts[0].slice(0, 1)}•••••@${parts[1].slice(0, 1)}••••.org [RESTRICTED]`;
}

// Address / Location masking
export function maskAddress(address: string, role: UserRole): string {
  if (canViewSeekerPII(role)) {
    return address;
  }
  // Worker can see general locality for task logistics, but not exact private residence
  return address.split(',')[0] + ' [Private Details Protected]';
}

// Copy-protection handler for sensitive elements
export function handleCopyProtection(
  e: React.ClipboardEvent | React.MouseEvent,
  role: UserRole,
  onNotify?: (msg: string, icon?: string) => void
) {
  if (!canExportData(role)) {
    e.preventDefault();
    if (onNotify) {
      onNotify(
        'Section 31 Security Alert: Copying seeker personal information is disabled for this role',
        'security_update_warning'
      );
    }
  }
}

// Route Protection & Claims-Based Access Rules
export function isRouteAuthorized(
  tab: string,
  role: UserRole,
  approvalStatus: string
): boolean {
  // If user is pending approval or pending_user, block all privileged routes
  if (approvalStatus !== 'approved' || role === 'pending_user') {
    return false;
  }

  switch (tab) {
    case 'admin':
      return role === 'super_admin';
    case 'analytics':
      return role === 'super_admin' || role === 'union_admin';
    case 'crm':
    case 'seekers':
    case 'churches':
      return role === 'super_admin' || role === 'union_admin' || role === 'worker';
    case 'chat':
      return role === 'super_admin' || role === 'union_admin' || role === 'worker' || role === 'chat_user';
    default:
      return true;
  }
}

export function getUnauthorizedReason(
  tab: string,
  role: UserRole,
  approvalStatus: string
): string {
  if (approvalStatus === 'pending' || role === 'pending_user') {
    return 'Your account is pending administrative approval by the Northern India Union Secretariat. Access to ministry dashboards is locked until verified.';
  }
  if (approvalStatus === 'rejected') {
    return 'Access has been revoked or denied by the administrator. Contact your Union Director.';
  }
  if (tab === 'admin' && role !== 'super_admin') {
    return 'Your account is authenticated, but it has not been approved for Super Admin access. Please contact the system administrator.';
  }
  if (tab === 'analytics' && role === 'worker') {
    return 'Union Executive Analytics is restricted to Union Administrators and Super Admins.';
  }
  return 'You do not have clearance for this ministry module.';
}

