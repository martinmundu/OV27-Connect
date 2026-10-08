import { useEffect, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { AppUser } from '../types';
import { logSuccessfulLogin } from '../utils/auditLogger';

/**
 * Automated React hook in the Firebase authentication flow to log every successful
 * login event to the audit_logs Firestore collection, capturing the user role,
 * timestamp, and security metadata for compliance tracking.
 *
 * @param currentUser - The active Firebase auth user object (null when signed out)
 * @param appUser - The resolved RBAC application user object with verified role
 * @param isAuthenticated - Boolean flag indicating successful authentication
 */
export function useFirebaseAuthAudit(
  currentUser: FirebaseUser | null,
  appUser: AppUser | null,
  isAuthenticated: boolean
) {
  // Prevent duplicate audit logs during active session re-renders or token refreshes
  const lastLoggedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && appUser && appUser.uid) {
      const sessionKey = `${appUser.uid}-${appUser.role}-${appUser.approvalStatus}`;

      // Only dispatch the automated audit log if this login session hasn't been logged yet
      if (lastLoggedSessionRef.current !== sessionKey) {
        lastLoggedSessionRef.current = sessionKey;

        const authProvider = currentUser?.isAnonymous
          ? 'anonymous'
          : currentUser?.providerData?.[0]?.providerId || 'google.com';

        logSuccessfulLogin(appUser.uid, appUser.role, {
          userEmail: appUser.email || currentUser?.email || `${appUser.uid}@niu-sda.org`,
          location: appUser.assignedUnion || 'Delhi Metro Region',
          authProvider,
          approvalStatus: appUser.approvalStatus,
        })
          .then((entry) => {
            console.info(
              `[FirebaseAuthAudit] Automated login logged: User ${entry.userId} (${entry.userRole}) at ${entry.timestamp}`
            );
          })
          .catch((err) => {
            console.warn('[FirebaseAuthAudit] Automated login audit write warning:', err);
          });
      }
    } else if (!isAuthenticated) {
      // Clear session cache upon logout so subsequent logins by the same or another user are logged
      lastLoggedSessionRef.current = null;
    }
  }, [
    isAuthenticated,
    appUser?.uid,
    appUser?.role,
    appUser?.approvalStatus,
    appUser?.assignedUnion,
    currentUser,
  ]);
}
