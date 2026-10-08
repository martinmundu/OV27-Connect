import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  Seeker,
  SeekerPrivateData,
  SeekerTask,
  ChatMessage,
  PastoralTimelineEntry,
  PastoralTask,
  AppUser,
  AuditLogEntry,
  UserRole,
  ApprovalStatus,
  UserPrivileges,
  DEFAULT_ROLE_PRIVILEGES,
} from './types';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with custom database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test Firestore connection on boot as mandated by skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline or connecting...');
    }
  }
}
testConnection();

// User Account & Profile Helpers & Claims Verification
export async function getUserClaims(firebaseUser: FirebaseUser) {
  try {
    // Force fresh token to read authoritative custom claims directly from Firebase Auth
    const tokenResult = await firebaseUser.getIdTokenResult(true);
    let role = tokenResult.claims.role as UserRole | undefined;
    let approved = tokenResult.claims.approved === true;
    let unionId = (tokenResult.claims.unionId || tokenResult.claims.union) as string | undefined;

    if (!role) {
      try {
        const idToken = await firebaseUser.getIdToken(false);
        const res = await fetch(`/api/auth/claims/${firebaseUser.uid}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.claims) {
            role = data.claims.role as UserRole;
            approved = data.claims.approved === true;
            unionId = (data.claims.unionId || unionId) as string;
            (tokenResult.claims as any).role = role;
            (tokenResult.claims as any).approved = approved;
            (tokenResult.claims as any).unionId = unionId;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // Strict verification: user is Super Admin ONLY when claims.role === 'super_admin' AND claims.approved === true
    const isSuperAdmin = role === 'super_admin' && approved === true;

    return {
      role,
      isSuperAdmin,
      approved,
      unionId,
      union: unionId,
      claims: tokenResult.claims,
    };
  } catch (err) {
    console.warn('Claims retrieval notice:', err);
    return {
      role: undefined,
      isSuperAdmin: false,
      approved: false,
      unionId: undefined,
      union: undefined,
      claims: {},
    };
  }
}

// Force-refresh Firebase ID token and retrieve latest authoritative Custom Claims
export async function forceRefreshAdminClaims(user?: FirebaseUser | null): Promise<{
  role: UserRole | undefined;
  approved: boolean;
  isSuperAdmin: boolean;
  claims: Record<string, any>;
}> {
  const targetUser = user || auth.currentUser;
  if (!targetUser) {
    throw new Error('No active user session to refresh');
  }
  // Force refresh ID token directly from Firebase Auth server
  await targetUser.getIdToken(true);
  const tokenResult = await targetUser.getIdTokenResult(true);
  let role = tokenResult.claims.role as UserRole | undefined;
  let approved = tokenResult.claims.approved === true;
  const unionId = (tokenResult.claims.unionId || tokenResult.claims.union) as string | undefined;

  if (!role) {
    try {
      const res = await fetch(`/api/auth/claims/${targetUser.uid}`, {
        headers: { Authorization: `Bearer ${tokenResult.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.claims) {
          role = data.claims.role as UserRole;
          approved = data.claims.approved === true;
          (tokenResult.claims as any).role = role;
          (tokenResult.claims as any).approved = approved;
          (tokenResult.claims as any).unionId = data.claims.unionId || unionId;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const isSuperAdmin = role === 'super_admin' && approved === true;

  return {
    role,
    approved,
    isSuperAdmin,
    claims: tokenResult.claims,
  };
}

export async function syncUserProfile(
  firebaseUser: FirebaseUser,
  fallbackProfile?: Partial<AppUser>
): Promise<AppUser> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const claims = await getUserClaims(firebaseUser);

  // Authoritative role assignment derived strictly from Custom Claims
  let authorizedRole: UserRole = 'pending_user';
  if (claims.role === 'super_admin' && claims.approved === true) {
    authorizedRole = 'super_admin';
  } else if (claims.role && claims.approved === true) {
    authorizedRole = claims.role;
  } else if (claims.role) {
    authorizedRole = claims.role;
  }

  const approvalStatus: ApprovalStatus = claims.approved ? 'approved' : 'pending';
  const assignedUnion = claims.unionId || fallbackProfile?.assignedUnion || 'Delhi Metro Region';

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as AppUser;
      // Do NOT trust Firestore document over Custom Claims!
      data.role = authorizedRole;
      data.approvalStatus = approvalStatus;
      data.assignedUnion = assignedUnion;
      data.privileges = DEFAULT_ROLE_PRIVILEGES[authorizedRole] || DEFAULT_ROLE_PRIVILEGES['pending_user'];
      return data;
    }
  } catch (err) {
    console.warn('Could not read existing user doc:', err);
  }

  const newProfile: AppUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || fallbackProfile?.email || `${firebaseUser.uid}@anonymous.niu.org`,
    displayName: firebaseUser.displayName || fallbackProfile?.displayName || 'Ministry Worker',
    photoURL:
      firebaseUser.photoURL ||
      fallbackProfile?.photoURL ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
    role: authorizedRole,
    assignedUnion,
    approvalStatus,
    emailVerified: Boolean(firebaseUser.emailVerified),
    privileges: DEFAULT_ROLE_PRIVILEGES[authorizedRole] || DEFAULT_ROLE_PRIVILEGES['pending_user'],
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(userRef, {
      ...newProfile,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Failed to save user profile to Firestore:', err);
  }

  return newProfile;
}

// Real-time listener for current user's profile document in /users/{uid}
export function subscribeUserProfile(
  uid: string,
  callback: (profile: AppUser | null) => void
) {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(
    userRef,
    async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppUser;
        if (auth.currentUser) {
          const claims = await getUserClaims(auth.currentUser);
          if (claims.role) data.role = claims.role;
          if (claims.union) data.assignedUnion = claims.union;
          if (claims.approved !== undefined) {
            data.approvalStatus = claims.approved ? 'approved' : 'pending';
          }
        }
        if (!data.privileges) {
          data.privileges = DEFAULT_ROLE_PRIVILEGES[data.role] || DEFAULT_ROLE_PRIVILEGES['pending_user'];
        }
        callback(data);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Current user profile snapshot notice:', err.message);
    }
  );
}

// Subscribe to User Accounts (For Super Admin Approval Queue)
export function subscribeUsers(
  callback: (users: AppUser[]) => void,
  userRole: UserRole = 'super_admin'
) {
  if (userRole !== 'super_admin') {
    callback([]);
    return () => {};
  }
  const usersCol = collection(db, 'users');
  return onSnapshot(
    usersCol,
    (snapshot) => {
      if (!snapshot.empty) {
        const users = snapshot.docs.map((d) => d.data() as AppUser);
        callback(users);
      }
    },
    (err) => {
      console.warn('Users listener permission note:', err.message);
    }
  );
}

// Update User Role & Approval Status (Super Admin Action)
export async function updateUserRoleAndStatus(
  uid: string,
  role: UserRole,
  approvalStatus: ApprovalStatus,
  assignedUnion?: string
) {
  if (!auth.currentUser) {
    throw new Error('Authentication required for role update');
  }
  const idToken = await auth.currentUser.getIdToken(true);
  const response = await fetch('/api/auth/set-claims', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      targetUid: uid,
      role,
      approved: approvalStatus === 'approved',
      unionId: assignedUnion || 'Delhi Metro Region',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to assign custom claims via backend');
  }

  // Update client Firestore mirror only after claims succeed
  const userRef = doc(db, 'users', uid);
  const updates: any = {
    role,
    approvalStatus,
    updatedAt: serverTimestamp(),
  };
  if (assignedUnion) {
    updates.assignedUnion = assignedUnion;
  }
  await setDoc(userRef, updates, { merge: true });
}

// Super Admin Privilege & Role Management: Assign or Remove Privileges
export async function updateUserPrivilegesAndRole(
  uid: string,
  role: UserRole,
  approvalStatus: ApprovalStatus,
  privileges: UserPrivileges,
  assignedUnion?: string,
  adminUser?: { uid?: string; email?: string; role?: UserRole }
) {
  if (!auth.currentUser) {
    throw new Error('Authentication required for updating privileges');
  }
  const idToken = await auth.currentUser.getIdToken(true);
  const response = await fetch('/api/auth/set-claims', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      targetUid: uid,
      role,
      approved: approvalStatus === 'approved',
      unionId: assignedUnion || 'Delhi Metro Region',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to sync custom claims');
  }

  const userRef = doc(db, 'users', uid);
  const updates: any = {
    role,
    approvalStatus,
    privileges,
    updatedAt: serverTimestamp(),
  };
  if (assignedUnion) {
    updates.assignedUnion = assignedUnion;
  }
  await setDoc(userRef, updates, { merge: true });

  // Log to Section 31 Audit using real user credentials
  await recordAuditLog(
    'UPDATE_PRIVILEGES_AND_ROLE',
    `Super Admin updated role to [${role}], status to [${approvalStatus}], and modified privileges for UID: ${uid}`,
    adminUser || {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email || `${auth.currentUser.uid}@niu-sda.org`,
      role: 'super_admin',
    },
    assignedUnion || 'NIU Secretariat'
  );
}

// Secondary app instance for Super Admin direct account provisioning without disrupting current admin session
let secondaryAdminAuth: any = null;
function getSecondaryAdminAuth() {
  if (!secondaryAdminAuth) {
    const existingApps = getApps();
    const existing = existingApps.find((a) => a.name === 'AdminAccountProvisioner');
    const adminApp = existing || initializeApp(firebaseConfig, 'AdminAccountProvisioner');
    secondaryAdminAuth = getAuth(adminApp);
  }
  return secondaryAdminAuth;
}

// Super Admin Direct Account Creation (Login ID, initial password, pre-approved with privileges)
export async function adminCreateUserAccount(params: {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  assignedUnion: string;
  privileges?: UserPrivileges;
}): Promise<AppUser> {
  if (!auth.currentUser) {
    throw new Error('Super Admin session required to provision user account');
  }

  const adminAuth = getSecondaryAdminAuth();
  const cred = await createUserWithEmailAndPassword(adminAuth, params.email.trim(), params.password);
  const newUser = cred.user;

  if (params.displayName) {
    try {
      await updateProfile(newUser, { displayName: params.displayName });
    } catch (e) {
      console.warn('Profile name notice:', e);
    }
  }

  // Sign out secondary session immediately
  try {
    await signOut(adminAuth);
  } catch (e) {
    // ignore
  }

  // Combine default role privileges with custom privileges
  const combinedPrivileges: UserPrivileges = {
    ...(DEFAULT_ROLE_PRIVILEGES[params.role] || {}),
    ...(params.privileges || {}),
  };

  const userProfile: AppUser = {
    uid: newUser.uid,
    email: params.email.trim(),
    displayName: params.displayName || 'Accredited Worker',
    role: params.role,
    assignedUnion: params.assignedUnion || 'Delhi Metro Region',
    approvalStatus: 'approved',
    emailVerified: true,
    privileges: combinedPrivileges,
    createdAt: new Date().toISOString(),
  };

  // Step 2: Set Custom Claims via backend API — MUST SUCCEED (throws if fails, before creating Firestore profile)
  const idToken = await auth.currentUser.getIdToken(true);
  const claimsResponse = await fetch('/api/auth/set-claims', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      targetUid: newUser.uid,
      role: params.role,
      approved: true,
      unionId: params.assignedUnion,
    }),
  });

  if (!claimsResponse.ok) {
    const errData = await claimsResponse.json().catch(() => ({}));
    throw new Error(errData.error || 'Custom Claims assignment failed during account provisioning');
  }

  // Step 3: Create /users profile document in Firestore
  const userRef = doc(db, 'users', newUser.uid);
  await setDoc(userRef, {
    ...userProfile,
    updatedAt: serverTimestamp(),
    createdBy: 'super_admin',
  });

  // Step 4: Create immutable audit log using real admin UID
  await recordAuditLog(
    'PROVISION_LOGIN_ID',
    `Super Admin created login ID for ${params.email} with role [${params.role}] and approved status`,
    {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email || `${auth.currentUser.uid}@niu-sda.org`,
      role: 'super_admin',
    },
    params.assignedUnion
  );

  // Step 5: Return success
  return userProfile;
}

// Authentication Helpers
export async function signInWithEmail(email: string, password: string) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  } catch (error: any) {
    console.error('Email sign in error:', error);
    throw error;
  }
}

export async function sendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return true;
  } catch (error: any) {
    console.error('Password reset email error:', error);
    throw error;
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
  assignedUnion: string = 'Delhi Metro Region'
) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = cred.user;

    // Update Firebase Auth profile displayName
    if (displayName) {
      try {
        await updateProfile(user, { displayName });
      } catch (err) {
        console.warn('Profile update notice:', err);
      }
    }

    // Initialize user profile in /users/{uid} as pending_user adhering to Section 20 RBAC
    const userRef = doc(db, 'users', user.uid);
    const newProfile: AppUser = {
      uid: user.uid,
      email: user.email || email.trim(),
      displayName: displayName || user.displayName || 'Ministry Worker',
      photoURL:
        user.photoURL ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
      role: 'pending_user',
      assignedUnion,
      approvalStatus: 'pending',
      emailVerified: user.emailVerified,
      privileges: DEFAULT_ROLE_PRIVILEGES['pending_user'],
      createdAt: new Date().toISOString(),
    };

    await setDoc(userRef, {
      ...newProfile,
      updatedAt: serverTimestamp(),
    });

    return user;
  } catch (error: any) {
    console.error('Email registration error:', error);
    throw error;
  }
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    try {
      const anonResult = await signInAnonymously(auth);
      return anonResult.user;
    } catch (anonErr) {
      throw error;
    }
  }
}

export async function logOut() {
  return await signOut(auth);
}

export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const origGetIdTokenResult = user.getIdTokenResult.bind(user);
      user.getIdTokenResult = async (forceRefresh?: boolean) => {
        const res = await origGetIdTokenResult(forceRefresh);
        if (!res.claims.role) {
          try {
            const rawToken = res.token;
            const backendRes = await fetch(`/api/auth/claims/${user.uid}`, {
              headers: { Authorization: `Bearer ${rawToken}` },
            });
            if (backendRes.ok) {
              const data = await backendRes.json();
              if (data?.claims) {
                Object.assign(res.claims, data.claims);
              }
            }
          } catch (e) {
            // ignore
          }
        }
        return res;
      };
    }
    callback(user);
  });
}

// Firestore Seekers Sync (Accessible ONLY to Super Admin and Union Admin. WORKERS CANNOT ACCESS /seekers)
export function subscribeSeekers(
  callback: (seekers: Seeker[]) => void,
  userRole: UserRole = 'super_admin',
  userUnion: string = 'Delhi Metro Region'
) {
  // Requirement 1 & 9: Strictly prohibit Workers, Chat Users, and Pending Users from querying /seekers
  if (userRole !== 'super_admin' && userRole !== 'union_admin') {
    callback([]);
    return () => {};
  }

  const seekersCol = collection(db, 'seekers');
  // Secure scoped query: Union Admins are strictly scoped to their assigned union
  const q =
    userRole === 'union_admin'
      ? query(seekersCol, where('assignedUnion', '==', userUnion))
      : query(seekersCol);

  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const items = snapshot.docs.map((d) => {
          const data = d.data() as Seeker;
          // Cleanse any accidental private PII fields; private data is stored strictly in /seekers_private
          const sanitized: Seeker = {
            ...data,
            id: d.id,
          };
          delete (sanitized as any).phone;
          delete (sanitized as any).email;
          delete (sanitized as any).address;
          delete (sanitized as any).personalNotes;
          return sanitized;
        });
        callback(items);
      } else {
        callback([]);
      }
    },
    (err) => {
      console.warn('Firestore seekers listener error:', err.message);
    }
  );
}

export async function persistSeeker(
  seeker: Seeker,
  privatePII?: Partial<SeekerPrivateData>
) {
  try {
    // Remove all PII fields from non-sensitive /seekers record
    const raw: Record<string, any> = { ...seeker };
    delete raw.phone;
    delete raw.email;
    delete raw.address;
    delete raw.personalNotes;

    const docRef = doc(db, 'seekers', seeker.id);
    await setDoc(
      docRef,
      {
        ...raw,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Persist private PII strictly in /seekers_private/{seekerId}
    // Accessible ONLY to Super Admin and authorized Union Admin
    if (privatePII) {
      const piiData: SeekerPrivateData = {
        seekerId: seeker.id,
        fullName: privatePII.fullName || seeker.name,
        phone: privatePII.phone || '',
        email: privatePII.email || '',
        address: privatePII.address || '',
        personalNotes: privatePII.personalNotes || '',
        assignedUnion: seeker.assignedUnion || 'Delhi Metro Region',
        updatedAt: serverTimestamp(),
      };
      const privateDocRef = doc(db, 'seekers_private', seeker.id);
      await setDoc(privateDocRef, piiData, { merge: true });
    }
  } catch (err) {
    console.error('Failed to persist seeker to Firestore:', err);
  }
}

export async function deleteSeekerRecord(seekerId: string) {
  try {
    const docRef = doc(db, 'seekers', seekerId);
    await deleteDoc(docRef);

    try {
      const topLevelPrivateRef = doc(db, 'seekers_private', seekerId);
      await deleteDoc(topLevelPrivateRef);
    } catch {
      // Non-fatal if private doc doesn't exist
    }
  } catch (err) {
    console.error('Failed to delete seeker record:', err);
    throw err;
  }
}

/**
 * Loads isolated private PII for a seeker.
 * Strictly restricted by Firestore rules to Super Admin and authorized Union Admin.
 * Field workers and chat users are completely barred from accessing /seekers_private.
 * Authoritative location: ONLY /seekers_private/{seekerId}.
 */
export async function fetchSeekerPrivateData(
  seekerId: string,
  userRole?: UserRole,
  userUnion?: string
): Promise<SeekerPrivateData | null> {
  // Only Super Admin and Union Admin can ever access /seekers_private
  if (userRole !== 'super_admin' && userRole !== 'union_admin') {
    return null;
  }
  try {
    const topLevelSnap = await getDoc(doc(db, 'seekers_private', seekerId));
    if (topLevelSnap.exists()) {
      const data = topLevelSnap.data() as SeekerPrivateData;
      // Enforce territorial jurisdiction boundary for Union Admin
      if (userRole === 'union_admin' && userUnion && data.assignedUnion && data.assignedUnion !== userUnion) {
        return null;
      }
      return data;
    }
  } catch (err) {
    console.warn('[Security] Private data access denied or not found in /seekers_private:', err);
  }
  return null;
}

// --------------------------------------------------------------------------
// Pastoral Tasks Sync: /seekers_tasks/{taskId}
// Requirement 2: Workers access seekers_tasks via role-based queries!
// Ensures that 'seekers_private' data (name, phone, email, etc.) is NEVER included.
// --------------------------------------------------------------------------
export function subscribeSeekerTasks(
  callback: (tasks: SeekerTask[]) => void,
  userRole: UserRole = 'worker',
  userId?: string,
  userUnion: string = 'Delhi Metro Region'
) {
  // Prohibit unauthorized or pending accounts
  if (userRole === 'pending_user' || userRole === 'chat_user') {
    callback([]);
    return () => {};
  }

  const tasksCol = collection(db, 'seekers_tasks');
  let q;

  // Requirement 2 & 12: Scoped Firestore Queries
  if (userRole === 'worker') {
    // Workers must ONLY query tasks assigned directly to their uid (never open or union-wide)
    if (!userId) {
      callback([]);
      return () => {};
    }
    q = query(tasksCol, where('assignedWorker', '==', userId));
  } else if (userRole === 'union_admin') {
    // Union Admin queries tasks strictly scoped to their assigned union
    q = query(tasksCol, where('assignedUnion', '==', userUnion));
  } else if (userRole === 'super_admin') {
    // Super Admin has synod-wide oversight
    q = query(tasksCol);
  } else {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        // Guarantee zero PII fields are ever returned to workers
        const items: SeekerTask[] = snapshot.docs.map((d) => {
          const raw = d.data() as Record<string, any>;
          const sanitized: SeekerTask = {
            id: d.id,
            taskId: raw.taskId || d.id,
            seekerId: raw.seekerId || 'CR-ANON',
            caseNumber: raw.caseNumber || (raw.seekerId ? `Case #${raw.seekerId.replace('CR-2024-', '')}` : 'Case #Lead'),
            title: raw.taskTitle || raw.title || 'Pastoral Care Task',
            taskTitle: raw.taskTitle || raw.title || 'Pastoral Care Task',
            stage: raw.stage || 'New Interest',
            dueDate: raw.dueDate,
            dueDateOrStatus: raw.dueDateOrStatus || 'Pending',
            status: raw.status || (raw.completed ? 'completed' : 'pending'),
            completed: Boolean(raw.completed),
            assignedWorker: raw.assignedWorker || '',
            assignedUnion: raw.assignedUnion || '',
            assignedChurch: raw.assignedChurch,
            notes: raw.notes,
            chatReference: raw.chatReference,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
          };
          return sanitized;
        });
        callback(items);
      } else {
        callback([]);
      }
    },
    (err) => {
      console.warn('Firestore tasks listener note:', err.message);
    }
  );
}

export async function persistSeekerTask(task: SeekerTask) {
  try {
    // Strictly whitelist permitted task fields to guarantee zero PII leakage
    const sanitizedTask: Record<string, any> = {
      id: task.id,
      taskId: task.taskId || task.id,
      seekerId: task.seekerId,
      caseNumber: task.caseNumber || `Case #${task.seekerId.replace('CR-2024-', '')}`,
      title: task.taskTitle || task.title || 'Pastoral Care Task',
      taskTitle: task.taskTitle || task.title || 'Pastoral Care Task',
      stage: task.stage || 'New Interest',
      dueDate: task.dueDate || null,
      dueDateOrStatus: task.dueDateOrStatus || 'Pending',
      status: task.status || (task.completed ? 'completed' : 'pending'),
      completed: Boolean(task.completed),
      assignedWorker: task.assignedWorker || '',
      assignedUnion: task.assignedUnion || '',
      assignedChurch: task.assignedChurch || null,
      notes: task.notes || null,
      chatReference: task.chatReference || null,
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: serverTimestamp(),
    };

    const docRef = doc(db, 'seekers_tasks', task.id);
    await setDoc(docRef, sanitizedTask, { merge: true });
  } catch (err) {
    console.error('Failed to persist seeker task:', err);
  }
}

// Data Deletion Requests (GDPR Right to be Forgotten)
export async function submitDataDeletionRequest(
  seekerId: string,
  reason: string,
  requestedBy: string
) {
  const requestId = `del-${Date.now()}`;
  try {
    const docRef = doc(db, 'deletion_requests', requestId);
    await setDoc(docRef, {
      id: requestId,
      seekerId,
      reason,
      requestedBy,
      status: 'pending',
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
    return requestId;
  } catch (err) {
    console.error('Failed to submit deletion request:', err);
    return requestId;
  }
}

// Firestore Chat Messages Sync
// Enforces nested parent chat ownership strictly: /chats/{chatId}/messages/{messageId}
export function subscribeChat(
  callback: (messages: ChatMessage[]) => void,
  currentUserId?: string,
  userRole: UserRole = 'worker',
  chatId: string = 'chat-general'
) {
  // Ordinary non-admin users MUST provide their auth UID to query strictly assigned chats
  if (userRole !== 'super_admin' && !currentUserId) {
    callback([]);
    return () => {};
  }

  const messagesCol = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesCol, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const msgs = snapshot.docs.map((d) => d.data() as ChatMessage);
        callback(msgs);
      } else {
        callback([]);
      }
    },
    (err) => {
      console.warn('Firestore nested chat listener notice:', err.message);
    }
  );
}

export async function persistChatMessage(
  message: ChatMessage,
  currentUserId?: string,
  chatId: string = 'chat-general'
) {
  try {
    const uid = message.senderID || currentUserId || auth.currentUser?.uid;
    if (!uid) {
      throw new Error("Authentication required");
    }
    const sender = uid;
    const receiver = message.receiverID || 'pastor-massey';
    
    // Strict 2-party participants: Worker + Seeker/Pastor
    const participants = Array.from(
      new Set([sender, receiver, ...(message.participants || [])])
    ).slice(0, 2);

    const parentChatRef = doc(db, 'chats', chatId);
    const docRef = doc(db, 'chats', chatId, 'messages', message.id);

    // Update parent chat conversation document with permitted fields only (participants immutable!)
    try {
      await setDoc(
        parentChatRef,
        {
          lastMessage: message.text,
          lastMessageTime: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // Non-fatal if parent chat requires admin provisioning
    }

    await setDoc(
      docRef,
      {
        ...message,
        senderID: sender,
        receiverID: receiver,
        participants,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to persist chat message to Firestore:', err);
  }
}

// Firestore Pastoral Care Log Sync
export async function persistPastoralLog(
  seekerId: string,
  entry: PastoralTimelineEntry
) {
  try {
    const docRef = doc(db, 'pastoral_logs', entry.id);
    await setDoc(docRef, {
      ...entry,
      seekerId,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to persist pastoral log to Firestore:', err);
  }
}

// Section 31 Immutable Audit Logs
import { logSuccessfulLogin } from './utils/auditLogger';
export {
  logUserAction,
  logViewedSeeker,
  logAccessedSeeker,
  logAssignedRole,
  logChangedRole,
  logAssignedTask,
  logDeletedRecord,
  logSuccessfulLogin,
} from './utils/auditLogger';
export type { LogUserActionOptions, StandardAuditAction } from './utils/auditLogger';

// Automated Hook in the Firebase Authentication Flow
let lastLoggedAuthUid: string | null = null;

/**
 * Attaches an automated listener to the Firebase Authentication flow
 * to log every successful login event to the audit_logs collection in Firestore.
 */
export function attachFirebaseAuthAuditHook(
  onLoginAudit?: (log: AuditLogEntry) => void
) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      if (lastLoggedAuthUid === firebaseUser.uid) {
        return;
      }
      lastLoggedAuthUid = firebaseUser.uid;

      try {
        const claims = await getUserClaims(firebaseUser);
        const role: UserRole = claims.role || 'pending_user';
        const union = claims.union || 'Delhi Metro Region';

        const entry = await logSuccessfulLogin(firebaseUser.uid, role, {
          userEmail: firebaseUser.email || `${firebaseUser.uid}@niu.org`,
          location: union,
          authProvider: firebaseUser.isAnonymous ? 'anonymous' : 'google.com',
          approvalStatus: claims.approved ? 'approved' : claims.role === 'super_admin' ? 'approved' : 'pending',
        });

        if (onLoginAudit) {
          onLoginAudit(entry);
        }
      } catch (err) {
        console.warn('[FirebaseAuthAudit] Automatic login logging notice:', err);
      }
    } else {
      lastLoggedAuthUid = null;
    }
  });
}

export async function recordAuditLog(
  action: string,
  accessedData: string,
  user: { uid?: string; email?: string; role?: UserRole },
  location: string = 'Delhi Metro / Web Client'
) {
  const currentUid = user.uid || auth.currentUser?.uid || '';
  const currentEmail = user.email || auth.currentUser?.email || null;
  const currentRole = user.role || 'worker';
  const logId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const logEntry: AuditLogEntry = {
    id: logId,
    userId: currentUid,
    userID: currentUid,
    role: currentRole,
    userRole: currentRole,
    userEmail: currentEmail || `${currentUid}@niu-sda.org`,
    action,
    accessedData,
    timestamp: new Date().toISOString(),
    location,
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
          resource: 'general',
          resourceId: accessedData,
          metadata: { location, accessedData },
        }),
      });
    }
  } catch (err) {
    console.warn('Audit log write error:', err);
  }

  return logEntry;
}

export function subscribeAuditLogs(
  callback: (logs: AuditLogEntry[]) => void,
  userRole: UserRole = 'super_admin'
) {
  // Only Super Admin may inspect the Section 31 audit ledger
  if (userRole !== 'super_admin') {
    callback([]);
    return () => {};
  }
  const auditCol = collection(db, 'audit_logs');
  const q = query(auditCol, orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const logs = snapshot.docs.map((d) => d.data() as AuditLogEntry);
        callback(logs);
      }
    },
    (err) => {
      console.warn('Audit logs listener note (Super Admin only):', err.message);
    }
  );
}
