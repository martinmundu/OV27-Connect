import type { Request, Response } from 'express';
import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let FIRESTORE_DATABASE_ID = 'ai-studio-onevoice27connec-9d03ce44-5d2f-443e-9f03-29b63b5c9101';
try {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const rawCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (rawCfg.firestoreDatabaseId) FIRESTORE_DATABASE_ID = rawCfg.firestoreDatabaseId;
  }
} catch (e) {
  // ignore
}

const getAuthoritativeFirestore = () => {
  const currentApp = getApps()[0];
  try {
    return FIRESTORE_DATABASE_ID ? getFirestore(currentApp, FIRESTORE_DATABASE_ID) : getFirestore(currentApp);
  } catch (e) {
    return getFirestore(currentApp);
  }
};

// =============================================================================
// INPUT VALIDATION HELPERS
// =============================================================================

export function isValidName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length >= 1 &&
    value.trim().length <= 150
  );
}

export function isValidPhone(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length >= 7 &&
    value.trim().length <= 20
  );
}

export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  if (value.length > 254) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidAddress(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length >= 1 &&
    value.trim().length <= 500
  );
}

export function isValidPinCode(value: unknown): boolean {
  if (typeof value === 'number') {
    return /^[0-9]{5,6}$/.test(String(value));
  }
  return (
    typeof value === 'string' &&
    /^[0-9]{5,6}$/.test(value.trim())
  );
}

// =============================================================================
// ASSIGNED TERRITORIAL UNIONS (NIU CONSTITUTION)
// =============================================================================

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

// =============================================================================
// TRUSTED SERVER-SIDE TERRITORY UNION ROUTING
// =============================================================================

export function determineUnionFromRegistration(input: {
  pinCode?: string;
  address?: string;
  location?: string;
}): AssignedTerritorialUnion | 'Northern India Union' {
  // 1. Check explicit PIN code or extract 5-6 digit postal code from address/location
  let pin = (input.pinCode || '').trim();

  if (!/^[0-9]{5,6}$/.test(pin)) {
    const rawSearch = `${input.address || ''} ${input.location || ''}`;
    const embeddedMatch = rawSearch.match(/\b([1-9][0-9]{4,5})\b/);
    if (embeddedMatch) {
      pin = embeddedMatch[1];
    }
  }

  // -------------------------------------------------------------
  // Postal Code Routing (Zone/Circle Prefix Mapping)
  // -------------------------------------------------------------

  // 1. Delhi Metro Region (11xxxx)
  if (/^11/.test(pin)) {
    return 'Delhi Metro Region';
  }

  // 2. Haryana Region (12xxxx, 13xxxx)
  if (/^12|^13/.test(pin)) {
    return 'Haryana Region';
  }

  // 3. North India Section (14xxxx, 15xxxx, 16xxxx - Punjab & Chandigarh)
  if (/^14|^15|^16/.test(pin)) {
    return 'North India Section';
  }

  // 4. Himachal Pradesh Region (17xxxx)
  if (/^17/.test(pin)) {
    return 'Himachal Pradesh Region';
  }

  // 5. Uttarakhand Region (246xxx, 248xxx, 249xxx, 263xxx)
  if (/^24[689]|^263/.test(pin)) {
    return 'Uttarakhand Region';
  }

  // 6. Central Uttar Pradesh Region (Lucknow 226, Kanpur 208-209, Sitapur 261, Lakhimpur 262, Hardoi 241, Rae Bareli 229, Barabanki 225)
  if (/^20[89]|^22[5679]|^241|^26[12]/.test(pin)) {
    return 'Central Uttar Pradesh Region';
  }

  // 7. Eastern Uttar Pradesh Section (Varanasi 221, Jaunpur 222, Mirzapur/Sonbhadra 23, Prayagraj 21, Gorakhpur/Azamgarh/Basti 27)
  if (/^21|^22[1238]|^23|^27/.test(pin)) {
    return 'Eastern Uttar Pradesh Section';
  }

  // 8. Upper Ganges Section (Western UP: Noida/Ghaziabad 201, Aligarh 202, Mathura/Agra 28, Meerut/Moradabad/Bareilly 242-245, 25xxxx)
  if (/^20[1-5]|^24[2345]|^25|^28/.test(pin)) {
    return 'Upper Ganges Section';
  }

  // 9. Rajasthan Section (30xxxx - 34xxxx)
  if (/^3[0-4]/.test(pin)) {
    return 'Rajasthan Section';
  }

  // 10. Madhya Pradesh Region (45xxxx - 48xxxx)
  if (/^4[5-8]/.test(pin)) {
    return 'Madhya Pradesh Region';
  }

  // 11. Chhattisgarh Region (49xxxx)
  if (/^49/.test(pin)) {
    return 'Chhattisgarh Region';
  }

  // 12. Kolkata Metro Region (70xxxx)
  if (/^70/.test(pin)) {
    return 'Kolkata Metro Region';
  }

  // 13. South Bengal Section (71xxxx, 72xxxx, 74xxxx)
  if (/^7[124]/.test(pin)) {
    return 'South Bengal Section';
  }

  // 14. North Bengal Section (73xxxx - North Bengal & Sikkim)
  if (/^73/.test(pin)) {
    return 'North Bengal Section';
  }

  // 15. Bihar Region (80xxxx, 84xxxx, 85xxxx)
  if (/^80|^84|^85/.test(pin)) {
    return 'Bihar Region';
  }

  // 16. Eastern Jharkhand Section (81xxxx, 826xxx - 829xxx - Dhanbad, Bokaro, Deoghar, Dumka, Giridih)
  if (/^81|^82[6-9]/.test(pin)) {
    return 'Eastern Jharkhand Section';
  }

  // 17. Western Jharkhand Section (83xxxx - Ranchi, Jamshedpur, Palamu 822xxx, etc.)
  if (/^83|^82[1-5]/.test(pin)) {
    return 'Western Jharkhand Section';
  }

  // -------------------------------------------------------------
  // Address & Location Keyword Fallback
  // -------------------------------------------------------------
  const text = `${input.address || ''} ${input.location || ''}`.toLowerCase();

  // NCR satellite cities
  if (/\b(noida|greater noida|ghaziabad)\b/.test(text)) {
    return 'Upper Ganges Section';
  }
  if (/\b(gurgaon|gurugram|faridabad)\b/.test(text)) {
    return 'Haryana Region';
  }

  // 1. Delhi Metro Region
  if (/\b(delhi|new delhi|central delhi|south delhi|north delhi|west delhi|east delhi|dwarka|rohini|saket|connaught|karol bagh|lajpat|chandni chowk|ncr)\b/.test(text)) {
    return 'Delhi Metro Region';
  }

  // 2. North India Section (Punjab & Chandigarh)
  if (/\b(north india|punjab|amritsar|ludhiana|jalandhar|patiala|bathinda|mohali|chandigarh|hoshiarpur|pathankot|firozpur|moga|batala|khanna|kapurthala|gurdaspur)\b/.test(text)) {
    return 'North India Section';
  }

  // 3. Haryana Region
  if (/\b(haryana|panipat|ambala|karnal|rohtak|hisar|sonipat|panchkula|yamunanagar|sirsa|rewari|bhiwani|kurukshetra|fatehabad|jind|jhajjar)\b/.test(text)) {
    return 'Haryana Region';
  }

  // 4. Himachal Pradesh Region
  if (/\b(himachal pradesh|himachal|shimla|manali|kullu|dharamshala|solan|mandi|kangra|una|chamba|hamirpur|bilaspur hp|kinnaur|spiti)\b/.test(text)) {
    return 'Himachal Pradesh Region';
  }

  // 5. Uttarakhand Region
  if (/\b(uttarakhand|dehradun|haridwar|roorkee|rishikesh|nainital|haldwani|mussoorie|almora|chamoli|pauri|tehri|rudraprayag|pithoragarh|uttarkashi|bageshwar)\b/.test(text)) {
    return 'Uttarakhand Region';
  }

  // 6. Central Uttar Pradesh Region
  if (/\b(central uttar pradesh|central up|lucknow|kanpur|ayodhya|faizabad|rae bareli|sitapur|hardoi|lakhimpur|barabanki|unnao|kheri)\b/.test(text)) {
    return 'Central Uttar Pradesh Region';
  }

  // 7. Eastern Uttar Pradesh Section
  if (/\b(eastern uttar pradesh|eastern up|varanasi|kashi|banaras|prayagraj|allahabad|gorakhpur|mirzapur|jaunpur|ghazipur|azamgarh|ballia|basti|deoria|mau|chandauli|sonbhadra|kushinagar|sultanpur|fatehpur)\b/.test(text)) {
    return 'Eastern Uttar Pradesh Section';
  }

  // 8. Upper Ganges Section (Western UP)
  if (/\b(upper ganges|western uttar pradesh|western up|meerut|agra|aligarh|mathura|moradabad|bareilly|saharanpur|muzaffarnagar|bijnor|bulandshahr|firozabad|hapur|rampur|sambhal|amroha|etah|mainpuri)\b/.test(text)) {
    return 'Upper Ganges Section';
  }

  // 9. Rajasthan Section
  if (/\b(rajasthan|jaipur|jodhpur|udaipur|kota|bikaner|ajmer|alwar|bharatpur|bhilwara|sikar|jaisalmer|chittorgarh|pali|sri ganganagar|barmer|hanumangarh|dholpur|jhunjhunu)\b/.test(text)) {
    return 'Rajasthan Section';
  }

  // 10. Madhya Pradesh Region
  if (/\b(madhya pradesh|bhopal|indore|gwalior|jabalpur|ujjain|sagar|dewas|satna|ratlam|rewa|chhindwara|morena|vidisha|khargone|khandwa|singrauli)\b/.test(text)) {
    return 'Madhya Pradesh Region';
  }

  // 11. Chhattisgarh Region
  if (/\b(chhattisgarh|raipur|bilaspur|durg|bhilai|korba|rajnandgaon|jagdalpur|ambikapur|raigarh|dhamtari)\b/.test(text)) {
    return 'Chhattisgarh Region';
  }

  // 12. Kolkata Metro Region
  if (/\b(kolkata metro|kolkata|calcutta|salt lake|new town|alipore|ballygunge|park street|dum dum|behala)\b/.test(text)) {
    return 'Kolkata Metro Region';
  }

  // 13. South Bengal Section
  if (/\b(south bengal|howrah|hooghly|burdwan|bardhaman|medinipur|midnapore|bankura|purulia|nadia|murshidabad|birbhum|asansol|durgapur|kharagpur|shantiniketan)\b/.test(text)) {
    return 'South Bengal Section';
  }

  // 14. North Bengal Section
  if (/\b(north bengal|siliguri|darjeeling|jalpaiguri|cooch behar|kalimpong|alipurduar|malda|dinajpur|sikkim|gangtok)\b/.test(text)) {
    return 'North Bengal Section';
  }

  // 15. Bihar Region
  if (/\b(bihar|patna|gaya|bhagalpur|muzaffarpur|darbhanga|purnia|begusarai|nalanda|bihar sharif|ara|chhapra|munger|katihar|motihari|samastipur|saharsa)\b/.test(text)) {
    return 'Bihar Region';
  }

  // 16. Eastern Jharkhand Section
  if (/\b(eastern jharkhand|dhanbad|bokaro|deoghar|dumka|giridih|jamtara|godda|sahibganj|pakur)\b/.test(text)) {
    return 'Eastern Jharkhand Section';
  }

  // 17. Western Jharkhand Section
  if (/\b(western jharkhand|jharkhand|ranchi|jamshedpur|tatanagar|hazaribagh|palamu|daltonganj|singhbhum|chaibasa|ramgarh|garhwa|chatra|latehar|gumla|simdega|lohardaga)\b/.test(text)) {
    return 'Western Jharkhand Section';
  }

  // General state catch-all:
  if (/\b(uttar pradesh|up)\b/.test(text)) {
    return 'Upper Ganges Section';
  }
  if (/\b(bengal|west bengal)\b/.test(text)) {
    return 'South Bengal Section';
  }

  // Do not invent a false Union assignment.
  // Controlled Northern India Union review queue when specific section is unmapped.
  return 'Northern India Union';
}

// =============================================================================
// RATE LIMITING & REQUEST SIZE LIMITS
// =============================================================================

// Explicit request body size limit for public intake endpoint (max 50kb)
export const registrationBodyLimit = express.json({ limit: '50kb' });

export const publicRegistrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again later.'
  }
});

// =============================================================================
// ATOMIC PUBLIC SEEKER REGISTRATION HANDLER
// =============================================================================

export async function handleSeekerRegistration(req: Request, res: Response) {
  try {
    const {
      fullName,
      phone,
      email,
      address,
      pinCode,
      age,
      gender,
      language,
      interests,
      location
    } = req.body;

    // -----------------------------------------
    // 1. INPUT VALIDATION
    // -----------------------------------------

    if (!isValidName(fullName)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid name.'
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number.'
      });
    }

    if (
      email !== undefined &&
      email !== null &&
      !isValidEmail(email)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address.'
      });
    }

    if (!isValidAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address.'
      });
    }

    if (
      pinCode !== undefined &&
      pinCode !== null &&
      !isValidPinCode(pinCode)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PIN code.'
      });
    }

    if (
      age !== undefined &&
      age !== null &&
      (
        typeof age !== 'number' ||
        !Number.isInteger(age) ||
        age < 1 ||
        age > 120
      )
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid age.'
      });
    }

    if (
      interests !== undefined &&
      (
        !Array.isArray(interests) ||
        interests.length > 20
      )
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid interests.'
      });
    }

    // -----------------------------------------
    // 2. NORMALIZE INPUT
    // Never trust client security fields (role, approved, assignedWorker, etc.)
    // -----------------------------------------

    const cleanFullName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanEmail =
      typeof email === 'string'
        ? email.trim().toLowerCase()
        : '';

    const cleanAddress = address.trim();

    const cleanPinCode =
      typeof pinCode === 'string'
        ? pinCode.trim()
        : typeof pinCode === 'number'
        ? String(pinCode).trim()
        : '';

    const cleanLocation =
      typeof location === 'string'
        ? location.trim()
        : '';

    const cleanLanguage =
      typeof language === 'string'
        ? language.trim().slice(0, 100)
        : '';

    const cleanGender =
      typeof gender === 'string'
        ? gender.trim().slice(0, 50)
        : '';

    const cleanInterests = Array.isArray(interests)
      ? interests
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim().slice(0, 100))
          .filter(Boolean)
          .slice(0, 20)
      : [];

    // -----------------------------------------
    // 3. DUPLICATE SUBMISSION / IDEMPOTENCY CHECK
    // -----------------------------------------

    const db = getAuthoritativeFirestore();
    const idempotencyKey = req.header('Idempotency-Key')?.trim();

    if (idempotencyKey) {
      const existingRef =
        db.collection('public_registration_requests').doc(idempotencyKey);

      const existing = await existingRef.get();

      if (existing.exists) {
        return res.status(200).json({
          success: true,
          seekerId: existing.data()?.seekerId,
          caseNumber: existing.data()?.caseNumber,
          message: 'Registration already received.'
        });
      }
    }

    // -----------------------------------------
    // 4. GENERATE CRYPTOGRAPHICALLY UNIQUE IDS
    // -----------------------------------------

    const uniqueId = crypto.randomUUID();

    const seekerId = `CR-${uniqueId}`;
    const caseNumber = `CASE-${uniqueId}`;
    const taskId = `TASK-${uniqueId}`;

    // -----------------------------------------
    // 5. FIRESTORE DOCUMENT REFERENCES & TERRITORY ASSIGNMENT
    // -----------------------------------------

    const assignedUnion = determineUnionFromRegistration({
      pinCode: cleanPinCode,
      address: cleanAddress,
      location: cleanLocation
    });

    const seekerRef = db.collection('seekers').doc(seekerId);
    const privateRef = db.collection('seekers_private').doc(seekerId);
    const taskRef = db.collection('seekers_tasks').doc(taskId);

    // -----------------------------------------
    // 6. NON-PII SEEKER RECORD (/seekers/{seekerId})
    // -----------------------------------------

    const seekerRecord = {
      seekerId,
      caseNumber,

      age: age ?? null,
      gender: cleanGender,
      language: cleanLanguage,
      interests: cleanInterests,

      status: 'new',
      stage: 'new',

      assignedUnion,
      assignedWorker: null,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    // -----------------------------------------
    // 7. PRIVATE PII RECORD (/seekers_private/{seekerId})
    // Strictly segregated from workflow records
    // -----------------------------------------

    const seekerPrivateDataRecord = {
      seekerId,

      fullName: cleanFullName,
      phone: cleanPhone,
      email: cleanEmail || null,
      address: cleanAddress,
      pinCode: cleanPinCode || null,

      assignedUnion,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    // -----------------------------------------
    // 8. WORKER-SAFE TASK (/seekers_tasks/{taskId})
    // Zero seeker contact PII exposed to field workers
    // -----------------------------------------

    const workerTask = {
      taskId,
      seekerId,
      caseNumber,

      assignedWorker: null,
      assignedUnion,

      status: 'unassigned',

      title: 'New seeker follow-up',

      chatReference: null,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    // -----------------------------------------
    // 9. ATOMIC FIRESTORE BATCH WRITE
    // All 3 records (plus idempotency ledger) committed atomically
    // -----------------------------------------

    const batch = db.batch();

    batch.set(seekerRef, seekerRecord);
    batch.set(privateRef, seekerPrivateDataRecord);
    batch.set(taskRef, workerTask);

    if (idempotencyKey) {
      const idempotencyRef =
        db.collection('public_registration_requests').doc(idempotencyKey);

      batch.create(idempotencyRef, {
        seekerId,
        caseNumber,
        createdAt: FieldValue.serverTimestamp()
      });
    }

    try {
      await batch.commit();
    } catch (batchErr: any) {
      // If error was caused by concurrent duplicate submission (ALREADY_EXISTS: code 6)
      if (idempotencyKey && batchErr.code === 6) {
        const existingRef =
          db.collection('public_registration_requests').doc(idempotencyKey);
        const existing = await existingRef.get();
        if (existing.exists) {
          return res.status(200).json({
            success: true,
            seekerId: existing.data()?.seekerId,
            caseNumber: existing.data()?.caseNumber,
            message: 'Registration already received.'
          });
        }
      }
      throw batchErr;
    }

    // -----------------------------------------
    // 10. SUCCESS CONFIRMATION
    // STRICTLY NEVER return private PII (name, phone, email, address, dossier)
    // -----------------------------------------

    return res.status(201).json({
      success: true,
      seekerId,
      caseNumber,
      message: 'Registration received successfully.'
    });

  } catch (error) {
    console.error('[Public Intake] Registration failed:', error);

    // Any database failure must return HTTP 500
    return res.status(500).json({
      success: false,
      error: 'Registration could not be completed. Please try again.'
    });
  }
}

// =============================================================================
// EXPRESS ROUTER EXPORT
// =============================================================================

export const registrationRouter = express.Router();

registrationRouter.post(
  '/api/seekers/register',
  registrationBodyLimit,
  publicRegistrationLimiter,
  handleSeekerRegistration
);

registrationRouter.post(
  '/register',
  registrationBodyLimit,
  publicRegistrationLimiter,
  handleSeekerRegistration
);

export default registrationRouter;
