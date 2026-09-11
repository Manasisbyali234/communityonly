import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type MaritalStatus = 'NEVER_MARRIED' | 'DIVORCED' | 'WIDOWED' | 'SEPARATED';
export type EducationLevel = 'HIGH_SCHOOL' | 'DIPLOMA' | 'BACHELORS' | 'MASTERS' | 'PHD' | 'OTHER';
export type InterestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const HEIGHT_OPTIONS = [
  "4'6\"","4'7\"","4'8\"","4'9\"","4'10\"","4'11\"",
  "5'0\"","5'1\"","5'2\"","5'3\"","5'4\"","5'5\"","5'6\"","5'7\"","5'8\"","5'9\"","5'10\"","5'11\"",
  "6'0\"","6'1\"","6'2\"","6'3\"","6'4\"+",
];

export const BLOOD_GROUP_OPTIONS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
export const EATING_HABITS_OPTIONS = ['Vegetarian','Non-Vegetarian','Eggetarian'];
export const DISABILITY_OPTIONS = ['None','Physical Disability'];

export const RAASHI_OPTIONS = [
  'Mesha (Aries)','Vrishabha (Taurus)','Mithuna (Gemini)','Karkataka (Cancer)',
  'Simha (Leo)','Kanya (Virgo)','Tula (Libra)','Vrischika (Scorpio)',
  'Dhanu (Sagittarius)','Makara (Capricorn)','Kumbha (Aquarius)','Meena (Pisces)',
];

export const NAKSHATHRA_OPTIONS = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya',
  'Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati',
  'Vishakha','Anuradha','Jyeshtha','Moola','Purva Ashada','Uttarashada','Shravana',
  'Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati',
];

export const GANA_OPTIONS = ['Deva','Manushya','Rakshasa'];
export const DOSHAM_OPTIONS = ['None','Manglik / Kuja Dosha','Naga Dosha','Other',"Don't Know"];
export const BALI_OPTIONS = [
  'Hemana Bali',
  'Nandara Bali',
  'Bangara Bali',
  'Kabar Bali',
  'Setti Bali / Halu Gundar',
  'Moolyara Bali / Moolar',
  'Gowda Bali',
  'Saale Bali',
  'Goli Bali',
  'Nayar Bali',
  'Balasanna Bali',
  'Karbanna Bali',
  'Oudanna Bali',
  'Chalyara Bali',
  'Kamber / Karmber Bali',
  'Chittera Bali',
  'Gundera Bali',
  'Lingaita Bali',
  "Don't Know",
];

export const EDUCATION_FIELD_OPTIONS = [
  'Arts','Science','Commerce','Engineering / Technology','Medicine / Healthcare',
  'Law','Management / Business','Information Technology','Agriculture','Other',
];

export const WORKING_WITH_OPTIONS = [
  'Government / Public Sector','Private Sector','Business / Self-Employed','Defense','Not Working',
];

export const ANNUAL_INCOME_OPTIONS = [
  'Below ₹3 Lakhs','₹3–5 Lakhs','₹5–8 Lakhs','₹8–10 Lakhs','₹10–15 Lakhs',
  '₹15–20 Lakhs','₹20–30 Lakhs','₹30–50 Lakhs','₹50 Lakhs+','Not Disclosed',
];

export const FAMILY_TYPE_OPTIONS = ['Joint Family','Nuclear Family','Other'];
export const FAMILY_VALUE_OPTIONS = ['Orthodox','Traditional','Moderate','Liberal'];
export const FATHER_STATUS_OPTIONS = ['Employed','Business / Self-Employed','Retired','Passed Away'];
export const MOTHER_STATUS_OPTIONS = ['Homemaker','Employed','Business / Self-Employed','Retired','Passed Away'];
export const SIBLING_COUNT_OPTIONS = ['0','1','2','3','4+'];
export const PHOTO_VISIBILITY_OPTIONS = ['Registered Matrimony Members','Private'];

export const GOTRA_LIST = [
  'Agastya','Atri','Bharadwaja','Bhrigu','Gautama','Garga','Harita','Jamadagni',
  'Kashyapa','Kaushika','Koundinya','Kratu','Kutsa','Maudgalya','Parasara',
  'Pulaha','Pulastya','Sandilya','Shandilya','Shaunaka','Srivatsa','Upamanyu',
  'Vashishtha','Vatsa','Vishwamitra','Other',
];

export interface MatrimonyProfile {
  id: string;
  userId: string;
  displayName: string;
  gender: Gender;
  dateOfBirth: string;
  age: number;
  height: string;
  maritalStatus: MaritalStatus;
  bloodGroup?: string;
  eatingHabits?: string;
  disability?: string;
  religion: string;
  caste?: string;
  motherTongue: string;
  // Astrology
  birthTime?: string;
  placeOfBirth?: string;
  raashi?: string;
  nakshathra?: string;
  gana?: string;
  gotra?: string;
  dosham?: string;
  bali?: string;
  // Career
  education: EducationLevel;
  educationDetails?: string;
  educationField?: string;
  workingWith?: string;
  designation?: string;
  occupation: string;
  workLocation?: string;
  annualIncome?: string;
  // Location
  city: string;
  state: string;
  // Family
  familyType?: string;
  familyValue?: string;
  familyLocation?: string;
  fatherName?: string;
  fatherStatus?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherStatus?: string;
  motherOccupation?: string;
  brothers?: number;
  brothersMarried?: number;
  sisters?: number;
  sistersMarried?: number;
  ancestralOrigin?: string;
  siblings?: number;
  // Photos
  photos: string[];
  photoVisibility?: string;
  avatarUrl?: string;
  aboutMe?: string;
  hobbies?: string[];
  diet?: string;
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
  raashi?: string;
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

export const MARITAL_STATUS_OPTIONS: MaritalStatus[] = ['NEVER_MARRIED','DIVORCED','WIDOWED'];
export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  NEVER_MARRIED: 'Never Married',
  DIVORCED: 'Divorced',
  WIDOWED: 'Widowed',
  SEPARATED: 'Separated',
};

export const EDUCATION_OPTIONS: EducationLevel[] = ['HIGH_SCHOOL','DIPLOMA','BACHELORS','MASTERS','PHD','OTHER'];
export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  HIGH_SCHOOL: '10th / 12th Pass',
  DIPLOMA: 'Diploma / ITI',
  BACHELORS: 'Graduate',
  MASTERS: 'Post Graduate',
  PHD: 'PhD / Doctorate',
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
      try {
        const res = await apiClient.get(`/matrimony/profiles/${id}`);
        return (res.data?.data ?? res.data) as MatrimonyProfile;
      } catch (e: any) {
        if (e?.response?.status === 404 || e?.response?.status === 403) return null;
        throw e;
      }
    },
    enabled: !!id,
    retry: false,
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

export function useMatrimonyMatchesQuery(filters?: MatrimonyFilters, enabled = true) {
  return useQuery({
    queryKey: ['matrimony-matches', filters],
    queryFn: async () => {
      const res = await apiClient.get('/matrimony/matches', { params: filters });
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
