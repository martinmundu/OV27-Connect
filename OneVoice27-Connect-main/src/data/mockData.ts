import { Seeker, SeekerTask, Church, ChatMessage, WorkerPersonnel } from '../types';

// PRODUCTION SECURITY COMPLIANCE (Requirement 1):
// ZERO Seeker records or personal identity data in frontend bundle.
// All seeker workflows, tasks, and private records load dynamically from authenticated Firestore.
export const initialSeekers: Seeker[] = [];

// Dedicated Pastoral Tasks loaded from authenticated Firestore (/seekers_tasks/{taskId})
export const initialSeekersTasks: SeekerTask[] = [];

// Default Northern India Union church reference data for territory direction & grounding
export const defaultChurch: Church = {
  id: 'church-central-delhi',
  name: 'Central Seventh-day Adventist Church',
  locality: 'Connaught Place, New Delhi',
  address: '11, Hailey Road, Connaught Place, New Delhi – 110001',
  distanceKm: 3.2,
  isVerified: true,
  mapCoordinates: { lat: 28.627, lng: 77.228 },
  pastor: {
    name: 'Pastor P. Massey',
    role: 'Senior Minister, Delhi Section',
    phone: '+91 11 2334 0000',
    whatsapp: '+91 98100 12345',
    languages: ['हिंदी', 'English', 'ਪੰਜਾਬੀ'],
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB_eKZCs2PvvT8G-OyalztIvHY7_FUBRVkTqMHvSFgzWLKP2oDOznZbpaL41LaQP46K03bIej4cREb798-wcgR_53P-TpnyWtpMilCxwWejX1YZcWm_hcbNQcCoIOTKGoArtn5oOS3-HBnwXuRUJGVT4EMwWwQeUTD-04QdNL7t2pP3ZTAlkzaKKCCFryFU_dVZBrO9AWLcqphLGzak5WO0BRLQx4y9_6wVvkwNxbvxWP96m7Z-YvXwmA',
    availableToday: true,
    quote: '“We look forward to welcoming you this Saturday. Let us know if you require transport assistance.”'
  },
  sabbathSchedule: [
    {
      time: '09:30 AM',
      event: 'Sabbath School & Bible Study',
      accentColor: '#904d00'
    },
    {
      time: '11:00 AM',
      event: 'Divine Worship Service',
      accentColor: '#fe932c'
    },
    {
      time: '01:00 PM',
      event: 'Fellowship Vegetarian Potluck',
      accentColor: '#c4c6cf'
    }
  ],
  alternateChurches: [
    {
      name: 'Rohini Adventist Fellowship',
      locality: 'Sector 9, Rohini, North Delhi',
      distanceKm: 8.4,
      worshipTimes: 'Worship: 10:00 AM • Youth Fellowship: 3:00 PM',
      contact: 'Elder S. Kumar'
    },
    {
      name: 'Noida SDA Church',
      locality: 'Sector 27, Noida, Gautam Buddha Nagar',
      distanceKm: 12.1,
      worshipTimes: 'Worship: 09:30 AM • Sabbath School: 11:00 AM',
      contact: 'Pastor D. Nathaniel'
    }
  ]
};

// Personnel list loads from Firestore /users or live roster
export const samplePersonnel: WorkerPersonnel[] = [];

// Chat messages load dynamically from authenticated Firestore
export const initialChatMessages: ChatMessage[] = [];
