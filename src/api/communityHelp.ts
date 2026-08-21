import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Types ──────────────────────────────────────────────────────────────────────

export type HelpCategory =
  | 'Blood Donation'
  | 'Medical Assistance'
  | 'Education'
  | 'Job Referral'
  | 'Other Community Help';

export const HELP_CATEGORIES: { id: HelpCategory; label: string; icon: string; emoji: string; color: string }[] = [
  { id: 'Blood Donation', label: 'Blood Donation', icon: 'water', emoji: '🩸', color: '#DC2626' },
  { id: 'Medical Assistance', label: 'Medical Assistance', icon: 'medkit', emoji: '🏥', color: '#059669' },
  { id: 'Education', label: 'Education', icon: 'school', emoji: '🎓', color: '#2563EB' },
  { id: 'Job Referral', label: 'Job Referral', icon: 'briefcase', emoji: '💼', color: '#9333EA' },
  { id: 'Other Community Help', label: 'Other Help', icon: 'heart', emoji: '🤝', color: '#D97706' },
];

export type HelpUrgency = 'NORMAL' | 'URGENT';
export type HelpStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
export type ContactPreference = 'IN_APP' | 'WHATSAPP' | 'PHONE';

export interface HelperOffer {
  id: string;
  requestId: string;
  helperId: string;
  helperName: string;
  helperAvatarUrl?: string;
  helperPhone?: string;
  message?: string;
  offeredAt: string;
}

export interface HelpReport {
  id: string;
  requestId: string;
  reportedBy: string;
  reason: 'Fake / Suspicious' | 'Incorrect Information' | 'Inappropriate Content' | 'Other';
  details?: string;
  reportedAt: string;
}

export interface HelpRequest {
  id: string;
  userId: string;
  requesterName: string;
  requesterAvatarUrl?: string;
  requesterLocation: string;
  requesterPhone?: string;
  category: HelpCategory;
  title: string;
  description: string;
  location: string;
  urgency: HelpUrgency;
  contactPreference: ContactPreference;
  status: HelpStatus;
  rejectionReason?: string | null;
  helpers: HelperOffer[];
  reports: HelpReport[];
  createdAt: string;
  resolvedAt?: string | null;
}

export interface HelpFilters {
  category?: string;
  urgency?: HelpUrgency;
  search?: string;
}

// ── Mock Initial Data ──────────────────────────────────────────────────────────

export const INITIAL_HELP_REQUESTS: HelpRequest[] = [
  {
    id: 'help-1',
    userId: 'u101',
    requesterName: 'Chethan Gowda',
    requesterAvatarUrl: 'https://ui-avatars.com/api/?name=Chethan+Gowda&background=FEE2E2&color=DC2626',
    requesterLocation: 'Bangalore, Karnataka',
    requesterPhone: '+91 9845012345',
    category: 'Blood Donation',
    title: 'Urgent O+ Blood Requirement for Heart Surgery',
    description: 'Require 2 units of O+ blood for my uncle undergoing cardiac surgery at Jayadeva Hospital, Bannerghatta Road, Bangalore. Any donor available in Bangalore please connect.',
    location: 'Bangalore (Jayadeva Hospital)',
    urgency: 'URGENT',
    contactPreference: 'PHONE',
    status: 'APPROVED',
    helpers: [
      {
        id: 'off-1',
        requestId: 'help-1',
        helperId: 'u201',
        helperName: 'Praveen Kumar Gowda',
        helperAvatarUrl: 'https://ui-avatars.com/api/?name=Praveen+Gowda&background=DCFCE7&color=166534',
        helperPhone: '+91 9740112233',
        message: 'I am O+ and ready to donate today at Jayadeva.',
        offeredAt: '2026-08-20T14:30:00Z',
      },
    ],
    reports: [],
    createdAt: '2026-08-20T09:00:00Z',
  },
  {
    id: 'help-2',
    userId: 'u102',
    requesterName: 'Sunitha Ramesh Gowda',
    requesterAvatarUrl: 'https://ui-avatars.com/api/?name=Sunitha+Gowda&background=E0F2FE&color=0369A1',
    requesterLocation: 'Mysuru, Karnataka',
    requesterPhone: '+91 9900223344',
    category: 'Medical Assistance',
    title: 'Guidance needed for Pediatric Oncology Specialist',
    description: 'Looking for recommendations and guidance for best pediatric doctors/hospitals in Bangalore or Mysuru for my 7-year-old child. Need advice from members who have experience.',
    location: 'Mysuru / Bangalore',
    urgency: 'URGENT',
    contactPreference: 'WHATSAPP',
    status: 'APPROVED',
    helpers: [],
    reports: [],
    createdAt: '2026-08-19T11:20:00Z',
  },
  {
    id: 'help-3',
    userId: 'u103',
    requesterName: 'Darshan Gowda',
    requesterAvatarUrl: 'https://ui-avatars.com/api/?name=Darshan+Gowda&background=F3E8FF&color=7E22CE',
    requesterLocation: 'Hassan, Karnataka',
    requesterPhone: '+91 9632445566',
    category: 'Education',
    title: 'Engineering Books & Guidance for 1st Year CSE',
    description: 'My younger brother just joined engineering (CSE branch) in Hassan. Looking for second-hand textbooks (Maths, Data Structures) or mentorship from seniors in the community.',
    location: 'Hassan, Karnataka',
    urgency: 'NORMAL',
    contactPreference: 'IN_APP',
    status: 'APPROVED',
    helpers: [
      {
        id: 'off-2',
        requestId: 'help-3',
        helperId: 'u202',
        helperName: 'Kavya Chandrashekar',
        helperAvatarUrl: 'https://ui-avatars.com/api/?name=Kavya+C&background=FEF9C3&color=A16207',
        helperPhone: '+91 9448119988',
        message: 'I have standard CSE 1st year books in Hassan. Happy to pass them on.',
        offeredAt: '2026-08-20T16:00:00Z',
      },
    ],
    reports: [],
    createdAt: '2026-08-18T15:00:00Z',
  },
  {
    id: 'help-4',
    userId: 'u104',
    requesterName: 'Abhishek Gowda',
    requesterAvatarUrl: 'https://ui-avatars.com/api/?name=Abhishek+Gowda&background=DCFCE7&color=166534',
    requesterLocation: 'Bengaluru, Karnataka',
    requesterPhone: '+91 9880556677',
    category: 'Job Referral',
    title: 'Referral for Java / React Fullstack Role (3 yrs exp)',
    description: 'Looking for job referral opportunities in Bangalore IT companies. Have 3 years hands-on experience in Java, Spring Boot, React, and AWS.',
    location: 'Bengaluru, Karnataka',
    urgency: 'NORMAL',
    contactPreference: 'IN_APP',
    status: 'APPROVED',
    helpers: [],
    reports: [],
    createdAt: '2026-08-17T10:00:00Z',
  },
  {
    id: 'help-5',
    userId: 'current-user',
    requesterName: 'You',
    requesterLocation: 'Mandya, Karnataka',
    requesterPhone: '+91 9988776655',
    category: 'Other Community Help',
    title: 'Volunteers needed for Community Tree Plantation Drive',
    description: 'Organizing a weekend tree plantation drive in Pandavapura taluk. Looking for 5-10 community youth volunteers to assist with sapling distribution.',
    location: 'Mandya (Pandavapura)',
    urgency: 'NORMAL',
    contactPreference: 'WHATSAPP',
    status: 'PENDING',
    helpers: [],
    reports: [],
    createdAt: '2026-08-20T18:00:00Z',
  },
  {
    id: 'help-6',
    userId: 'current-user',
    requesterName: 'You',
    requesterLocation: 'Mysuru, Karnataka',
    requesterPhone: '+91 9988776655',
    category: 'Blood Donation',
    title: 'B+ Blood Required for Dialysis Patient',
    description: 'Needed 1 unit of B+ blood at Apollo Hospital Mysuru.',
    location: 'Mysuru',
    urgency: 'URGENT',
    contactPreference: 'PHONE',
    status: 'RESOLVED',
    resolvedAt: '2026-08-15T12:00:00Z',
    helpers: [
      {
        id: 'off-3',
        requestId: 'help-6',
        helperId: 'u203',
        helperName: 'Mahesh Gowda',
        helperPhone: '+91 9123456789',
        offeredAt: '2026-08-14T10:00:00Z',
      },
    ],
    reports: [],
    createdAt: '2026-08-14T08:00:00Z',
  },
];

// ── In-Memory State for Mock CRUD ──────────────────────────────────────────────

let _helpRequests: HelpRequest[] = [...INITIAL_HELP_REQUESTS];

// ── User Hooks ─────────────────────────────────────────────────────────────────

export function usePublicHelpRequestsQuery(filters?: HelpFilters) {
  return useQuery({
    queryKey: ['help-requests', 'public', filters],
    queryFn: async (): Promise<HelpRequest[]> => {
      await new Promise((r) => setTimeout(r, 400));
      let res = _helpRequests.filter((r) => r.status === 'APPROVED');
      if (filters?.category && filters.category !== 'All') {
        res = res.filter((r) => r.category === filters.category);
      }
      if (filters?.urgency) {
        res = res.filter((r) => r.urgency === filters.urgency);
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        res = res.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            r.location.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q)
        );
      }
      // Sort urgent first, then newest
      return res.sort((a, b) => {
        if (a.urgency === 'URGENT' && b.urgency !== 'URGENT') return -1;
        if (b.urgency === 'URGENT' && a.urgency !== 'URGENT') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    },
    staleTime: 60 * 1000,
  });
}

export function useHelpRequestQuery(id: string) {
  return useQuery({
    queryKey: ['help-request', id],
    queryFn: async (): Promise<HelpRequest | null> => {
      await new Promise((r) => setTimeout(r, 300));
      return _helpRequests.find((r) => r.id === id) ?? null;
    },
    enabled: !!id,
  });
}

export function useMyHelpRequestsQuery() {
  return useQuery({
    queryKey: ['help-requests', 'mine'],
    queryFn: async (): Promise<HelpRequest[]> => {
      await new Promise((r) => setTimeout(r, 300));
      return _helpRequests.filter((r) => r.userId === 'current-user');
    },
  });
}

export function useCreateHelpRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      category: HelpCategory;
      title: string;
      description: string;
      location: string;
      urgency: HelpUrgency;
      contactPreference: ContactPreference;
      userName: string;
      userLocation: string;
      userPhone?: string;
    }): Promise<HelpRequest> => {
      await new Promise((r) => setTimeout(r, 600));
      const newReq: HelpRequest = {
        id: `help-${Date.now()}`,
        userId: 'current-user',
        requesterName: data.userName || 'Community Member',
        requesterAvatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.userName || 'User')}&background=DCFCE7&color=166534`,
        requesterLocation: data.userLocation || data.location,
        requesterPhone: data.userPhone,
        category: data.category,
        title: data.title,
        description: data.description,
        location: data.location,
        urgency: data.urgency,
        contactPreference: data.contactPreference,
        status: 'PENDING',
        helpers: [],
        reports: [],
        createdAt: new Date().toISOString(),
      };
      _helpRequests = [newReq, ..._helpRequests];
      return newReq;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['help-requests'] });
    },
  });
}

export function useOfferHelpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      helperName,
      helperAvatarUrl,
      helperPhone,
      message,
    }: {
      requestId: string;
      helperName: string;
      helperAvatarUrl?: string;
      helperPhone?: string;
      message?: string;
    }): Promise<HelperOffer> => {
      await new Promise((r) => setTimeout(r, 500));
      const offer: HelperOffer = {
        id: `off-${Date.now()}`,
        requestId,
        helperId: 'current-user',
        helperName,
        helperAvatarUrl,
        helperPhone,
        message,
        offeredAt: new Date().toISOString(),
      };
      _helpRequests = _helpRequests.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            helpers: [offer, ...r.helpers.filter((h) => h.helperId !== 'current-user')],
          };
        }
        return r;
      });
      return offer;
    },
    onSuccess: (_, { requestId }) => {
      qc.invalidateQueries({ queryKey: ['help-requests'] });
      qc.invalidateQueries({ queryKey: ['help-request', requestId] });
    },
  });
}

export function useResolveHelpRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string): Promise<void> => {
      await new Promise((r) => setTimeout(r, 400));
      _helpRequests = _helpRequests.map((r) =>
        r.id === requestId ? { ...r, status: 'RESOLVED', resolvedAt: new Date().toISOString() } : r
      );
    },
    onSuccess: (_, requestId) => {
      qc.invalidateQueries({ queryKey: ['help-requests'] });
      qc.invalidateQueries({ queryKey: ['help-request', requestId] });
    },
  });
}

export function useReportHelpRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      reason,
      details,
    }: {
      requestId: string;
      reason: HelpReport['reason'];
      details?: string;
    }): Promise<HelpReport> => {
      await new Promise((r) => setTimeout(r, 400));
      const rep: HelpReport = {
        id: `rep-${Date.now()}`,
        requestId,
        reportedBy: 'current-user',
        reason,
        details,
        reportedAt: new Date().toISOString(),
      };
      _helpRequests = _helpRequests.map((r) =>
        r.id === requestId ? { ...r, reports: [rep, ...r.reports] } : r
      );
      return rep;
    },
    onSuccess: (_, { requestId }) => {
      qc.invalidateQueries({ queryKey: ['help-requests'] });
      qc.invalidateQueries({ queryKey: ['help-request', requestId] });
    },
  });
}

// ── Admin Hooks ────────────────────────────────────────────────────────────────

export function useAdminHelpRequestsQuery(statusTab?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REPORTED' | 'RESOLVED') {
  return useQuery({
    queryKey: ['admin-help-requests', statusTab],
    queryFn: async (): Promise<HelpRequest[]> => {
      await new Promise((r) => setTimeout(r, 400));
      if (statusTab === 'REPORTED') {
        return _helpRequests.filter((r) => r.reports && r.reports.length > 0);
      }
      if (statusTab) {
        return _helpRequests.filter((r) => r.status === statusTab);
      }
      return [..._helpRequests];
    },
  });
}

export function useAdminApproveHelpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await new Promise((r) => setTimeout(r, 400));
      _helpRequests = _helpRequests.map((r) =>
        r.id === id ? { ...r, status: 'APPROVED', rejectionReason: null } : r
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-help-requests'] });
      qc.invalidateQueries({ queryKey: ['help-requests'] });
    },
  });
}

export function useAdminRejectHelpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }): Promise<void> => {
      await new Promise((r) => setTimeout(r, 400));
      _helpRequests = _helpRequests.map((r) =>
        r.id === id ? { ...r, status: 'REJECTED', rejectionReason: reason } : r
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-help-requests'] });
      qc.invalidateQueries({ queryKey: ['help-requests'] });
    },
  });
}

export function useAdminDismissReportsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string): Promise<void> => {
      await new Promise((r) => setTimeout(r, 300));
      _helpRequests = _helpRequests.map((r) =>
        r.id === requestId ? { ...r, reports: [] } : r
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-help-requests'] });
      qc.invalidateQueries({ queryKey: ['help-requests'] });
    },
  });
}

export function useAdminDeleteHelpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await new Promise((r) => setTimeout(r, 400));
      _helpRequests = _helpRequests.filter((r) => r.id !== id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-help-requests'] });
      qc.invalidateQueries({ queryKey: ['help-requests'] });
    },
  });
}
