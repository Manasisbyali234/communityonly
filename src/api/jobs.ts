import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface Job {
  id: string;
  employerId?: string;
  companyLogo?: string;
  companyName: string;
  jobTitle: string;
  description: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'INTERNSHIP' | 'CONTRACT';
  workMode: 'WORK_FROM_OFFICE' | 'HYBRID' | 'REMOTE';
  salaryLPA: string;
  address?: string;
  location: string;
  experience: string;
  education?: string;
  requiredSkills: string[];
  vacancyCount: number;
  applyCount: number;
  lastDate?: string;
  hrContact?: string;
  hrEmail?: string;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  hasApplied?: boolean;
  applicationStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  userId: string;
  status: 'APPLIED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'REJECTED' | 'SELECTED';
  appliedAt: string;
  job?: Partial<Job>;
}

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  INTERNSHIP: 'Internship',
  CONTRACT: 'Contract',
};

export const WORK_MODE_LABELS: Record<string, string> = {
  WORK_FROM_OFFICE: 'Work From Office',
  HYBRID: 'Hybrid',
  REMOTE: 'Remote',
};

export interface Employer {
  id: string;
  name: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  description?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  jobCount: number;
}

export function usePublicEmployersQuery() {
  return useQuery({
    queryKey: ['employers-public'],
    queryFn: async () => {
      const res = await apiClient.get('/jobs/employers/public');
      return (res.data?.data ?? res.data) as Employer[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompanyJobsQuery(companyName: string) {
  return useQuery({
    queryKey: ['jobs-by-company', companyName],
    queryFn: async () => {
      const res = await apiClient.get('/jobs', { params: { search: companyName } });
      const all = (res.data?.data ?? res.data) as Job[];
      return all.filter(j => j.companyName.toLowerCase() === companyName.toLowerCase());
    },
    enabled: !!companyName,
  });
}

export function useJobsQuery(params?: { search?: string; location?: string; employmentType?: string; workMode?: string }) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: async () => {
      const res = await apiClient.get('/jobs', { params });
      return (res.data?.data ?? res.data) as Job[];
    },
  });
}

export function useJobQuery(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const res = await apiClient.get(`/jobs/${id}`);
      return (res.data?.data ?? res.data) as Job;
    },
    enabled: !!id,
  });
}

export function useCheckAppliedQuery(jobId: string) {
  return useQuery({
    queryKey: ['job-applied', jobId],
    queryFn: async () => {
      const res = await apiClient.get(`/jobs/${jobId}/applied`);
      return res.data?.data as { applied: boolean; application?: JobApplication };
    },
    enabled: !!jobId,
  });
}

export function useUserJobApplicationsQuery(userId: string) {
  return useQuery({
    queryKey: ['job-applications', userId],
    queryFn: async () => {
      const res = await apiClient.get(`/jobs/user/${userId}/applications`);
      return (res.data?.data ?? res.data) as JobApplication[];
    },
    enabled: !!userId,
  });
}

export function useMyJobApplicationsQuery() {
  return useQuery({
    queryKey: ['my-job-applications'],
    queryFn: async () => {
      const res = await apiClient.get('/jobs/my-applications');
      return (res.data?.data ?? res.data) as JobApplication[];
    },
  });
}

export async function uploadResume(localUri: string, filename: string, mimeType: string): Promise<string> {
  const formData = new FormData();
  if (typeof window !== 'undefined' && localUri.startsWith('blob:')) {
    const res = await fetch(localUri);
    const blob = await res.blob();
    formData.append('file', new File([blob], filename, { type: mimeType }));
  } else {
    formData.append('file', { uri: localUri, name: filename, type: mimeType } as any);
  }
  const res = await apiClient.post('/jobs/upload-resume', formData);
  return res.data?.data?.url as string;
}

export function useApplyJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, resumeUrl }: { jobId: string; resumeUrl: string }) => {
      const res = await apiClient.post(`/jobs/${jobId}/apply`, { resumeUrl });
      return res.data?.data as JobApplication;
    },
    onSuccess: (_data, { jobId }) => {
      qc.invalidateQueries({ queryKey: ['job-applied', jobId] });
      qc.invalidateQueries({ queryKey: ['job-applications'] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}
