import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type MaritalStatus = 'NEVER_MARRIED' | 'DIVORCED' | 'WIDOWED' | 'SEPARATED';
export type EducationLevel = 'HIGH_SCHOOL' | 'DIPLOMA' | 'BACHELORS' | 'MASTERS' | 'PHD' | 'OTHER';
export type InterestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MatrimonyProfile {
  id: string;
  userId: string;
  displayName: string;
  gender: Gender;
  dateOfBirth: string;
  age: number;
  height: string;
  maritalStatus: MaritalStatus;
  religion: string;
  caste?: string;
  motherTongue: string;
  education: EducationLevel;
  educationDetails?: string;
  occupation: string;
  annualIncome?: string;
  city: string;
  state: string;
  aboutMe?: string;
  hobbies?: string[];
  diet?: string;
  familyType?: string;
  fatherOccupation?: string;
  motherOccupation?: string;
  siblings?: number;
  photos: string[];
  avatarUrl?: string;
  isVerified: boolean;
  partnerMinAge?: number;
  partnerMaxAge?: number;
  partnerReligion?: string;
  partnerCaste?: string;
  partnerEducation?: string;
  partnerCity?: string;
  matchScore?: number;
  hasExpressedInterest?: boolean;
  interestStatus?: InterestStatus;
  hasLiked?: boolean;
  approvalStatus?: ApprovalStatus;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface MatrimonyFilters {
  gender?: Gender;
  minAge?: number;
  maxAge?: number;
  religion?: string;
  caste?: string;
  maritalStatus?: MaritalStatus;
  education?: EducationLevel;
  city?: string;
  search?: string;
}

export interface ProfileInterest {
  id: string;
  fromProfileId: string;
  toProfileId: string;
  status: InterestStatus;
  message?: string;
  conversationId?: string | null;
  createdAt: string;
  fromProfile?: Partial<MatrimonyProfile>;
  toProfile?: Partial<MatrimonyProfile>;
}

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  NEVER_MARRIED: 'Never Married',
  DIVORCED: 'Divorced',
  WIDOWED: 'Widowed',
  SEPARATED: 'Separated',
};

export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  HIGH_SCHOOL: 'High School',
  DIPLOMA: 'Diploma',
  BACHELORS: "Bachelor's",
  MASTERS: "Master's",
  PHD: 'PhD',
  OTHER: 'Other',
};

export function useMatrimonyProfilesQuery(filters?: MatrimonyFilters, enabled = true) {
  return useQuery({
    queryKey: ['matrimony-profiles', filters],
    enabled,
    queryFn: async () => {
      const res = await apiClient.get('/matrimony/profiles', { params: filters });
      return (res.data?.data ?? res.data) as MatrimonyProfile[];
    },
  });
}

export function useMatrimonyProfileQuery(id: string) {
  return useQuery({
    queryKey: ['matrimony-profile', id],
    queryFn: async () => {
      const res = await apiClient.get(`/matrimony/profiles/${id}`);
      return (res.data?.data ?? res.data) as MatrimonyProfile;
    },
    enabled: !!id,
  });
}

export type ProfileStatus = 'NO_PROFILE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export function useMyMatrimonyProfileQuery() {
  return useQuery({
    queryKey: ['my-matrimony-profile'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/matrimony/my-profile');
        const profile = (res.data?.data ?? res.data) as MatrimonyProfile | null;
        // Treat empty/null/missing-id responses as no profile
        if (!profile || !profile.id) return null;
        return profile;
      } catch (e: any) {
        // 404 means no profile exists yet — not an error
        if (e?.response?.status === 404) return null;
        throw e;
      }
    },
    retry: false,
  });
}

export function useMatrimonyMatchesQuery(enabled = true) {
  return useQuery({
    queryKey: ['matrimony-matches'],
    queryFn: async () => {
      const res = await apiClient.get('/matrimony/matches');
      return (res.data?.data ?? res.data) as MatrimonyProfile[];
    },
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}

export function useMatrimonyInterestsQuery(enabled = true) {
  return useQuery({
    queryKey: ['matrimony-interests'],
    queryFn: async () => {
      const res = await apiClient.get('/matrimony/interests');
      return (res.data?.data ?? res.data) as ProfileInterest[];
    },
    enabled,
    retry: false,
  });
}

export function useMatrimonyLikeMatchesQuery(enabled = true) {
  return useQuery({
    queryKey: ['matrimony-like-matches'],
    queryFn: async () => {
      const res = await apiClient.get('/matrimony/like-matches');
      return (res.data?.data ?? res.data) as MatrimonyLikeMatch[];
    },
    enabled,
    retry: false,
  });
}

export function useCreateMatrimonyProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<MatrimonyProfile>) => {
      const res = await apiClient.post('/matrimony/profiles', data);
      return (res.data?.data ?? res.data) as MatrimonyProfile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-matrimony-profile'] });
      qc.invalidateQueries({ queryKey: ['matrimony-profiles'] });
    },
  });
}

export function useUpdateMatrimonyProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MatrimonyProfile> }) => {
      const res = await apiClient.put(`/matrimony/profiles/${id}`, data);
      return (res.data?.data ?? res.data) as MatrimonyProfile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-matrimony-profile'] });
      qc.invalidateQueries({ queryKey: ['matrimony-profiles'] });
    },
  });
}

export function useExpressInterestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ toProfileId, message }: { toProfileId: string; message?: string }) => {
      try {
        const res = await apiClient.post('/matrimony/interests', { toProfileId, message });
        return (res.data?.data ?? res.data) as ProfileInterest;
      } catch (e: any) {
        if (e?.response?.status === 409) {
          return e.response.data?.data as ProfileInterest;
        }
        throw e;
      }
    },
    onSuccess: (_data, { toProfileId }) => {
      qc.invalidateQueries({ queryKey: ['matrimony-profiles'] });
      qc.invalidateQueries({ queryKey: ['matrimony-interests'] });
      qc.invalidateQueries({ queryKey: ['matrimony-profile', toProfileId] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}

export async function uploadMatrimonyPhoto(localUri: string, filename: string, mimeType: string): Promise<string | null> {
  const formData = new FormData();
  if (typeof window !== 'undefined' && localUri.startsWith('blob:')) {
    const res = await fetch(localUri);
    const blob = await res.blob();
    formData.append('file', new File([blob], filename, { type: mimeType }));
  } else {
    formData.append('file', { uri: localUri, name: filename, type: mimeType } as any);
  }
  const res = await apiClient.post('/matrimony/upload-photo', formData);
  return res.data?.data?.url ?? null;
}

export function useRespondInterestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ interestId, status }: { interestId: string; status: 'ACCEPTED' | 'REJECTED' }) => {
      const res = await apiClient.patch(`/matrimony/interests/${interestId}`, { status });
      return res.data?.data as { conversationId: string | null } & Record<string, any>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matrimony-interests'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}

export interface MatrimonyLikeResult {
  matched: boolean;
  conversationId?: string;
}

export interface MatrimonyLikeMatch {
  matchId: string;
  conversationId: string | null;
  profile: Partial<MatrimonyProfile>;
}

export function useLikeProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (toProfileId: string) => {
      try {
        const res = await apiClient.post('/matrimony/like', { toProfileId });
        return (res.data?.data ?? res.data) as MatrimonyLikeResult;
      } catch (e: any) {
        if (e?.response?.status === 409) {
          return (e.response.data?.data ?? { matched: false }) as MatrimonyLikeResult;
        }
        throw e;
      }
    },
    onSuccess: (_data, toProfileId) => {
      qc.invalidateQueries({ queryKey: ['matrimony-like-matches'] });
      qc.invalidateQueries({ queryKey: ['matrimony-profiles'] });
      qc.invalidateQueries({ queryKey: ['matrimony-matches'] });
      qc.invalidateQueries({ queryKey: ['matrimony-profile', toProfileId] });
    },
  });
}

export function useMatrimonyMatchChatQuery(matchId: string) {
  return useQuery({
    queryKey: ['matrimony-match-chat', matchId],
    queryFn: async () => {
      const res = await apiClient.get(`/matrimony/matches/${matchId}/chat`);
      return (res.data?.data ?? res.data) as { conversationId: string };
    },
    enabled: !!matchId,
    retry: false,
  });
}
