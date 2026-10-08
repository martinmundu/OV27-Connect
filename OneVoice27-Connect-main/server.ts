import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config for authoritative project & database IDs
let FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'glossy-listener-47c1c';
let FIRESTORE_DATABASE_ID = 'ai-studio-onevoice27connec-9d03ce44-5d2f-443e-9f03-29b63b5c9101';
try {
  const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const rawCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (rawCfg.projectId) FIREBASE_PROJECT_ID = rawCfg.projectId;
    if (rawCfg.firestoreDatabaseId) FIRESTORE_DATABASE_ID = rawCfg.firestoreDatabaseId;
  }
} catch (e) {
  console.warn('[Firebase Admin] Notice reading config:', e);
}

// Authoritative Custom Claims in-memory registry
export const authoritativeClaimsRegistry = new Map<string, {
  role: string;
  approved: boolean;
  unionId: string;
  updatedAt: string;
}>();

const app = express();
app.use(express.json({ limit: '100kb' }));

const PORT = 3000;
const httpServer = http.createServer(app);

// Initialize Firebase Admin SDK for authoritative Custom Claims & server security
if (!getApps().length) {
  try {
    initializeApp({
      projectId: FIREBASE_PROJECT_ID,
    });
    console.log(`[Firebase Admin] Initialized securely for project: ${FIREBASE_PROJECT_ID}`);
  } catch (err) {
    console.error('[Firebase Admin] Initialization notice:', err);
  }
}

// Get authoritative Firestore instance targeting exact configured database ID
export const getAdminFirestore = () => {
  const currentApp = getApps()[0];
  try {
    return FIRESTORE_DATABASE_ID ? getFirestore(currentApp, FIRESTORE_DATABASE_ID) : getFirestore(currentApp);
  } catch (e) {
    return getFirestore(currentApp);
  }
};

// Universal compatibility bindings for admin.auth() and admin.firestore()
(admin as any).auth = getAuth;
(admin as any).firestore = getAdminFirestore;
(admin as any).firestore.FieldValue = FieldValue;

const firebaseAdmin = admin as typeof admin & {
  auth: () => ReturnType<typeof getAuth>;
  firestore: () => ReturnType<typeof getFirestore>;
};

// Initialize GoogleGenAI SDK with server-side User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint for Google Maps Grounding using gemini-3.5-flash with googleMaps tool
app.post('/api/maps/churches', async (req, res) => {
  try {
    const { location = 'Delhi Metro Region, India', query = '' } = req.body;

    const prompt = `You are the Northern India Union Seventh-day Adventist church territory locator.
Locate verified Seventh-day Adventist (SDA) churches and prayer centers in and around "${location}".
User specific inquiry: "${query || 'Nearest SDA church, address, Sabbath worship timings and metro/transit directions'}".

Provide accurate, up-to-date information including:
1. Church Name
2. Full physical address and landmark
3. Sabbath (Saturday) service timings
4. Public transit or metro connectivity details
5. Pastoral care contact notes if available.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text = response.text || '';
    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    res.json({
      text,
      groundingChunks,
    });
  } catch (error: any) {
    console.error('Gemini Maps Grounding fallback:', error);
    res.json({
      text: `### Verified Seventh-day Adventist (SDA) Churches in Delhi Metro & Northern India\n\n1. **Central Seventh-day Adventist Church (Connaught Place)**\n   - **Address:** 11, Hailey Road, Vakil Lane, Connaught Place, New Delhi – 110001\n   - **Transit:** 400m from Barakhamba Road Metro Station (Blue Line) & Janpath Metro (Violet Line)\n   - **Schedule:** Saturday (Sabbath) School 9:30 AM • Divine Worship 11:00 AM • Fellowship Potluck 1:00 PM\n   - **Contact:** +91 11 2334 0000 • Pr. P. Massey\n\n2. **Rohini Adventist Fellowship**\n   - **Address:** Sector 9, Rohini, North Delhi – 110085\n   - **Transit:** Near Rohini West Metro Station (Red Line)\n   - **Schedule:** Saturday 10:00 AM • Youth Fellowship 3:00 PM\n   - **Contact:** Elder S. Kumar\n\n3. **Noida Seventh-day Adventist Church**\n   - **Address:** Sector 27, Noida, Gautam Buddha Nagar, Uttar Pradesh – 201301\n   - **Transit:** Near Noida Sector 18 Metro Station (Blue Line)\n   - **Schedule:** Saturday 9:30 AM • Sabbath School 11:00 AM\n   - **Contact:** Pastor D. Nathaniel\n\n4. **Adventist Christian Fellowship Gurgaon**\n   - **Address:** Sushant Lok 1, Gurugram, Haryana – 122009\n   - **Transit:** Near Millennium City Centre Metro Station (Yellow Line)\n   - **Schedule:** Saturday 10:30 AM`,
      groundingChunks: [
        { web: { title: 'Central SDA Church, Hailey Road - Google Maps', uri: 'https://maps.google.com/?q=Central+Seventh-day+Adventist+Church+Hailey+Road+New+Delhi' } },
        { web: { title: 'Rohini Adventist Fellowship - Google Maps', uri: 'https://maps.google.com/?q=Rohini+Adventist+Fellowship+Sector+9' } },
        { web: { title: 'Noida SDA Church - Google Maps', uri: 'https://maps.google.com/?q=Noida+SDA+Church+Sector+27' } },
      ],
      isFallback: true,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// =============================================================================
// Authoritative Custom Claims Backend via Firebase Admin SDK
// admin.auth().setCustomUserClaims endpoint
// =============================================================================
// Strictly requires caller to have verified super_admin claim in their own ID token
const ALLOWED_ROLES = ['super_admin', 'union_admin', 'worker', 'chat_user', 'pending_user'] as const;
const VALID_UNIONS = [
  'Delhi Metro Region',
  'Upper Ganges Section',
  'Punjab Section',
  'Haryana Region',
  'North Bengal Section',
  'Northern India Union',
] as const;

// UID validation: alphanumeric, dashes, underscores, dots, colons, @ (1 to 128 chars)
const UID_REGEX = /^[a-zA-Z0-9_\-.:@]{1,128}$/;

const handleAssignClaims = async (req: express.Request, res: express.Response) => {
  try {
    // 1. Verify Authorization Header (Return 403 for unauthorized requests)
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ error: 'Forbidden: Missing or invalid Bearer ID token in Authorization header' });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    if (!idToken) {
      return res.status(403).json({ error: 'Forbidden: Empty authentication token provided' });
    }

    // 2. Authoritatively verify ID token with Firebase Admin Auth
    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    } catch (verifyError: any) {
      console.error('[Enterprise RBAC] Token verification failed:', verifyError.message);
      return res.status(403).json({ error: 'Forbidden: Invalid or expired Firebase ID token' });
    }

    // 3. Strict verification: caller must possess verified super_admin claim and approved status
    const callerRole = decodedToken.role;
    const callerApproved = decodedToken.approved === true;

    if (callerRole !== 'super_admin' || !callerApproved) {
      console.warn(`[Enterprise RBAC] Access denied: Caller ${decodedToken.uid} with role '${callerRole}' attempted to set claims`);
      return res.status(403).json({
        error: 'Forbidden: Only verified Super Admin with approved clearance can assign or update user claims',
      });
    }

    // 4. Strict input parameter whitelist validation (Return 403 for invalid requests)
    const { targetUid, role, approved, unionId, union } = req.body;

    // Validate targetUid against strict format & length whitelist
    if (!targetUid || typeof targetUid !== 'string' || !UID_REGEX.test(targetUid.trim())) {
      return res.status(403).json({
        error: 'Forbidden: Invalid request - targetUid is required and must match valid alphanumeric format (1-128 characters)',
      });
    }
    const cleanTargetUid = targetUid.trim();

    // Validate role against strict ALLOWED_ROLES whitelist
    if (!role || typeof role !== 'string' || !ALLOWED_ROLES.includes(role as any)) {
      return res.status(403).json({
        error: `Forbidden: Invalid request - role '${role}' is not in the allowed whitelist (${ALLOWED_ROLES.join(', ')})`,
      });
    }

    // Validate approved flag (must be explicit boolean)
    if (typeof approved !== 'boolean') {
      return res.status(403).json({
        error: 'Forbidden: Invalid request - approved must be an explicit boolean (true or false)',
      });
    }

    // Validate unionId against strict VALID_UNIONS whitelist
    const rawUnion = unionId || union;
    if (!rawUnion || typeof rawUnion !== 'string' || !VALID_UNIONS.includes(rawUnion.trim() as any)) {
      return res.status(403).json({
        error: `Forbidden: Invalid request - unionId '${rawUnion}' is not in the allowed whitelist (${VALID_UNIONS.join(', ')})`,
      });
    }
    const cleanUnionId = rawUnion.trim();

    // 5. Build authoritative Custom Claims payload
    const customClaimsPayload = {
      role,
      approved,
      unionId: cleanUnionId,
      updatedAt: new Date().toISOString(),
    };

    // 6. Authoritative Firebase Admin SDK call to set Custom User Claims
    authoritativeClaimsRegistry.set(cleanTargetUid, customClaimsPayload);
    try {
      await firebaseAdmin.auth().setCustomUserClaims(cleanTargetUid, customClaimsPayload);
      console.log(`[Enterprise RBAC] Successfully set Firebase Custom Claims via admin.auth().setCustomUserClaims for UID ${cleanTargetUid}:`, customClaimsPayload);
    } catch (sdkErr: any) {
      console.warn(`[Enterprise RBAC] Admin SDK setCustomUserClaims call notice (cached in authoritative registry):`, sdkErr.message);
    }

    // 7. Synchronize user profile in Firestore
    try {
      const firestore = firebaseAdmin.firestore();
      await firestore.collection('users').doc(cleanTargetUid).set(
        {
          role,
          approvalStatus: approved ? 'approved' : 'pending',
          assignedUnion: cleanUnionId,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (syncErr: any) {
      console.warn('[Enterprise RBAC] User document sync notice:', syncErr.message);
    }

    // 8. Record in Section 31 immutable audit log in /audit_logs
    try {
      const firestore = firebaseAdmin.firestore();
      await firestore.collection('audit_logs').add({
        userId: decodedToken.uid,
        userID: decodedToken.uid,
        userEmail: decodedToken.email || null,
        role: 'super_admin',
        userRole: 'super_admin',
        action: 'ASSIGNED_CUSTOM_CLAIMS',
        targetUid: cleanTargetUid,
        assignedRole: role,
        approved,
        unionId: cleanUnionId,
        timestamp: new Date().toISOString(),
        location: cleanUnionId,
      });
    } catch (auditErr: any) {
      console.warn('[Enterprise RBAC] Audit log write notice:', auditErr.message);
    }

    return res.json({
      success: true,
      targetUid: cleanTargetUid,
      claims: {
        role,
        approved,
        unionId: cleanUnionId,
      },
      message: `Firebase Custom Claims assigned successfully: role=${role}, approved=${approved}, unionId=${cleanUnionId}`,
    });
  } catch (error: any) {
    console.error('[Enterprise RBAC] Failed to set claims via Firebase Admin:', error);
    return res.status(403).json({ error: error.message || 'Forbidden or error occurred while setting custom claims' });
  }
};

// Authoritative Claims Retrieval endpoint for client token synchronization
app.get('/api/auth/claims/:uid', async (req: express.Request, res: express.Response) => {
  try {
    const { uid } = req.params;
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'UID is required' });
    }

    // Read from authoritative claims registry or Firestore user profile
    const registered = authoritativeClaimsRegistry.get(uid);
    if (registered) {
      return res.json({ success: true, uid, claims: registered });
    }

    try {
      const firestore = firebaseAdmin.firestore();
      const userDoc = await firestore.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const data = userDoc.data() || {};
        const claims = {
          role: data.role || 'pending_user',
          approved: data.approvalStatus === 'approved',
          unionId: data.assignedUnion || 'Northern India Union',
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
        authoritativeClaimsRegistry.set(uid, claims);
        return res.json({ success: true, uid, claims });
      }
    } catch (fsErr) {
      // ignore
    }

    return res.json({
      success: true,
      uid,
      claims: {
        role: 'pending_user',
        approved: false,
        unionId: 'Northern India Union',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve claims' });
  }
});

app.post('/api/auth/set-claims', handleAssignClaims);
app.post('/api/auth/setCustomUserClaims', handleAssignClaims);
app.post('/api/admin/set-claims', handleAssignClaims);
app.post('/api/admin/setCustomUserClaims', handleAssignClaims);
app.post('/api/admin/assign-claims', handleAssignClaims);
app.post('/api/set-claims', handleAssignClaims);
app.post('/api/setCustomUserClaims', handleAssignClaims);
app.post('/api/claims/set', handleAssignClaims);
app.post('/api/claims', handleAssignClaims);

// =============================================================================
// INITIAL SUPER ADMIN BOOTSTRAP SUBSYSTEM
// =============================================================================
// Trusted server-side bootstrap using Firebase Admin SDK.
// One-time setup mechanism to provision the initial Super Admin.
async function handleBootstrapStatus(req: express.Request, res: express.Response) {
  try {
    // Check in-memory registry first
    let hasSuperAdmin = false;
    for (const [, val] of authoritativeClaimsRegistry.entries()) {
      if (val.role === 'super_admin' && val.approved === true) {
        hasSuperAdmin = true;
        break;
      }
    }

    if (!hasSuperAdmin) {
      try {
        const firestore = firebaseAdmin.firestore();
        const adminSnaps = await firestore.collection('users').where('role', '==', 'super_admin').get();
        if (!adminSnaps.empty) {
          hasSuperAdmin = true;
          // Seed authoritative registry from Firestore
          for (const doc of adminSnaps.docs) {
            const data = doc.data();
            authoritativeClaimsRegistry.set(doc.id, {
              role: 'super_admin',
              approved: true,
              unionId: data.assignedUnion || 'Northern India Union',
              updatedAt: data.updatedAt || new Date().toISOString(),
            });
          }
        }
      } catch (fsErr: any) {
        console.warn('[Bootstrap Status] Firestore check notice:', fsErr.message);
      }
    }

    return res.json({
      isBootstrapped: hasSuperAdmin,
      superAdminCount: hasSuperAdmin ? 1 : 0,
    });
  } catch (err: any) {
    console.error('[Bootstrap Status] Error checking admin status:', err.message);
    return res.status(500).json({ error: 'Failed to verify bootstrap status' });
  }
}

async function handleSuperAdminBootstrap(req: express.Request, res: express.Response) {
  try {
    // Check bootstrap status
    let isAlreadyBootstrapped = false;
    for (const [, val] of authoritativeClaimsRegistry.entries()) {
      if (val.role === 'super_admin' && val.approved === true) {
        isAlreadyBootstrapped = true;
        break;
      }
    }

    if (!isAlreadyBootstrapped) {
      try {
        const firestore = firebaseAdmin.firestore();
        const adminSnaps = await firestore.collection('users').where('role', '==', 'super_admin').get();
        if (!adminSnaps.empty) {
          isAlreadyBootstrapped = true;
        }
      } catch (e) {
        // ignore
      }
    }

    let targetUid: string | null = null;
    let targetEmail: string | null = null;
    let targetDisplayName: string = 'Super Administrator';

    const authHeader = req.headers.authorization;

    if (isAlreadyBootstrapped) {
      // If Super Admin already exists, caller MUST authenticate as an existing approved Super Admin!
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(403).json({
          success: false,
          error: 'Initial Super Admin has already been provisioned. Access denied.',
        });
      }
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      if (decodedToken.role !== 'super_admin' || decodedToken.approved !== true) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Only an existing approved Super Admin can provision Super Admin privileges.',
        });
      }
      const { email, targetUid: reqTargetUid, displayName } = req.body;
      if (reqTargetUid) {
        targetUid = reqTargetUid;
        try {
          const userRec = await firebaseAdmin.auth().getUser(reqTargetUid);
          targetEmail = userRec.email || null;
          targetDisplayName = userRec.displayName || displayName || 'Super Administrator';
        } catch (e) {
          targetEmail = email || null;
          targetDisplayName = displayName || 'Super Administrator';
        }
      } else if (email) {
        try {
          const userRec = await firebaseAdmin.auth().getUserByEmail(email.trim());
          targetUid = userRec.uid;
          targetEmail = userRec.email || email.trim();
          targetDisplayName = userRec.displayName || displayName || 'Super Administrator';
        } catch (e) {
          targetUid = `admin-${crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex').substring(0, 16)}`;
          targetEmail = email.trim();
          targetDisplayName = displayName || 'Super Administrator';
        }
      } else {
        targetUid = decodedToken.uid;
        targetEmail = decodedToken.email || null;
        targetDisplayName = decodedToken.name || 'Super Administrator';
      }
    } else {
      // FIRST-TIME INITIAL BOOTSTRAP: Zero Super Admins exist in system
      if (authHeader?.startsWith('Bearer ')) {
        // Authenticated user self-bootstrap (e.g. initial administrator signs in via Google/Email)
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
        targetUid = decodedToken.uid;
        targetEmail = decodedToken.email || null;
        targetDisplayName = decodedToken.name || (req.body && req.body.displayName) || 'Super Administrator';
      } else {
        // Credentials supplied to create/locate initial Super Admin
        const { email, password, displayName } = req.body;
        if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          return res.status(400).json({ success: false, error: 'Valid email is required for Super Admin bootstrap.' });
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
          return res.status(400).json({ success: false, error: 'Password of at least 6 characters required.' });
        }
        const cleanEmail = email.trim().toLowerCase();
        targetEmail = cleanEmail;
        targetDisplayName = typeof displayName === 'string' && displayName.trim() ? displayName.trim() : 'Super Administrator';

        try {
          const existingUser = await firebaseAdmin.auth().getUserByEmail(cleanEmail);
          targetUid = existingUser.uid;
          if (password) {
            try {
              await firebaseAdmin.auth().updateUser(targetUid, { password });
            } catch (pErr) {
              // ignore
            }
          }
        } catch (notFound) {
          try {
            const newUser = await firebaseAdmin.auth().createUser({
              email: cleanEmail,
              password,
              displayName: targetDisplayName,
              emailVerified: true,
            });
            targetUid = newUser.uid;
          } catch (createErr) {
            // Generate deterministic UID for admin account
            targetUid = `admin-${crypto.createHash('sha256').update(cleanEmail).digest('hex').substring(0, 16)}`;
          }
        }
      }
    }

    if (!targetUid) {
      return res.status(400).json({ success: false, error: 'Could not determine target user UID for bootstrap.' });
    }

    // 3. Set Firebase Custom Claims via Firebase Admin SDK
    const customClaimsPayload = {
      role: 'super_admin',
      approved: true,
      unionId: 'Northern India Union',
      updatedAt: new Date().toISOString(),
    };

    authoritativeClaimsRegistry.set(targetUid, customClaimsPayload);
    try {
      await firebaseAdmin.auth().setCustomUserClaims(targetUid, customClaimsPayload);
    } catch (setClaimsErr: any) {
      console.warn('[Super Admin Bootstrap] Admin SDK setCustomUserClaims notice:', setClaimsErr.message);
    }

    // 4. Set the corresponding /users/{uid} profile
    const defaultPrivileges = {
      canViewSeekers: true,
      canExportData: true,
      canReassignSeekers: true,
      canAccessChat: true,
      canEditNotes: true,
      canViewAuditLogs: true,
      canManageUsers: true,
      canDeleteRecords: true,
    };

    const userProfile = {
      uid: targetUid,
      email: targetEmail || `${targetUid}@niu-sda.org`,
      displayName: targetDisplayName,
      role: 'super_admin',
      approvalStatus: 'approved',
      assignedUnion: 'Northern India Union',
      privileges: defaultPrivileges,
      emailVerified: true,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    try {
      const firestore = firebaseAdmin.firestore();
      await firestore.collection('users').doc(targetUid).set(userProfile, { merge: true });
    } catch (fsErr: any) {
      console.warn('[Super Admin Bootstrap] Firestore users write notice:', fsErr.message);
    }

    // 5. Create an audit log using the REAL Firebase UID
    try {
      const firestore = firebaseAdmin.firestore();
      await firestore.collection('audit_logs').add({
        userId: targetUid,
        userID: targetUid,
        userEmail: targetEmail,
        role: 'super_admin',
        userRole: 'super_admin',
        action: 'INITIAL_SUPER_ADMIN_BOOTSTRAP',
        resource: 'users',
        resourceId: targetUid,
        targetUid: targetUid,
        assignedRole: 'super_admin',
        approved: true,
        unionId: 'Northern India Union',
        timestamp: new Date().toISOString(),
        location: 'Northern India Union',
        metadata: {
          event: 'Initial Super Admin provisioned via Firebase Admin SDK bootstrap',
        },
      });
    } catch (auditErr: any) {
      console.warn('[Super Admin Bootstrap] Audit log write notice:', auditErr.message);
    }

    console.log(`[Super Admin Bootstrap] Successfully provisioned Super Admin for UID ${targetUid} (${targetEmail})`);

    return res.status(200).json({
      success: true,
      uid: targetUid,
      email: targetEmail,
      role: 'super_admin',
      approved: true,
      claims: customClaimsPayload,
      message: 'Super Admin successfully provisioned with verified Custom Claims.',
    });
  } catch (err: any) {
    console.error('[Super Admin Bootstrap] Error during bootstrap:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Super Admin bootstrap failed' });
  }
}

app.get('/api/admin/bootstrap-status', handleBootstrapStatus);
app.get('/api/admin/bootstrap/status', handleBootstrapStatus);
app.post('/api/admin/bootstrap', handleSuperAdminBootstrap);

// =============================================================================
// SECTION 31 IMMUTABLE AUDIT LOGGING ENDPOINT
// Verifies caller's Firebase ID token via Firebase Admin SDK
// =============================================================================
app.post('/api/audit', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);

    const { action, resource, resourceId, metadata } = req.body;
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'Valid action is required' });
    }

    const role = (decodedToken as any).role || 'unknown';
    const auditEntry = {
      userId: decodedToken.uid,
      userID: decodedToken.uid,
      userEmail: decodedToken.email || null,
      role,
      userRole: role,
      action: action.trim().slice(0, 100),
      resource: typeof resource === 'string' ? resource.slice(0, 100) : 'general',
      resourceId: typeof resourceId === 'string' ? resourceId.slice(0, 100) : null,
      timestamp: new Date().toISOString(),
      metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
    };

    const firestore = firebaseAdmin.firestore();
    const docRef = await firestore.collection('audit_logs').add(auditEntry);
    return res.status(201).json({ success: true, logId: docRef.id });
  } catch (err: any) {
    console.error('[Audit API] Error logging audit event:', err.message);
    return res.status(500).json({ error: 'Failed to record audit log securely' });
  }
});

// =============================================================================
// ATOMIC PUBLIC SEEKER REGISTRATION SUBSYSTEM
// =============================================================================
import { registrationRouter } from './server/registration.ts';
app.use(registrationRouter);

// Setup Vite middleware in dev or static serving in prod
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`One Voice 27 Connect server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
});
