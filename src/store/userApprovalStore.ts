import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { useAuthStore } from './authStore';

export interface AuditRecord {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | 'SUSPENDED';
  date: string;
  reason?: string;
  adminName?: string;
}

export interface ManagedUser extends User {
  familyName?: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  nativePlace?: string;
  currentLocation?: string;
  company?: string;
  profession?: string;
  education?: string;
  skills?: string;
  phoneVerified?: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | 'SUSPENDED';
  rejectionReason?: string;
  approvalHistory?: AuditRecord[];
  isBanned?: boolean;
  deletionReason?: string;
}

const INITIAL_MANAGED_USERS: ManagedUser[] = [
  {
    id: 'u-pending-1',
    displayName: 'Praveen Kumar Gowda',
    familyName: 'Mundodi',
    username: 'praveen_mundodi',
    email: 'praveen.mundodi@gmail.com',
    phone: '+91 9845112233',
    phoneVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    dob: '1994-06-15',
    gender: 'Male',
    country: 'India',
    state: 'Karnataka',
    district: 'Dakshina Kannada',
    city: 'Sullia',
    nativePlace: 'Mundodi, Sullia',
    currentLocation: 'Bengaluru',
    occupation: 'Lead Agricultural Technologist',
    profession: 'Agritech / IoT',
    company: 'Krushi Smart Solutions',
    education: 'B.E. Computer Science, NITK Surathkal',
    skills: 'Precision Agriculture, Organic Farming, Community Mentorship',
    role: 'USER',
    isActive: true,
    isVerified: false,
    approvalStatus: 'PENDING',
    createdAt: '2026-08-30T10:15:00Z',
    approvalHistory: [
      {
        status: 'PENDING',
        date: '2026-08-30T10:15:00Z',
      },
    ],
  },
  {
    id: 'u-pending-2',
    displayName: 'Deepika Somanna',
    familyName: 'Kodendera',
    username: 'deepika_kodendera',
    email: 'deepika.k@outlook.com',
    phone: '+91 9900334455',
    phoneVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300',
    dob: '1996-03-22',
    gender: 'Female',
    country: 'India',
    state: 'Karnataka',
    district: 'Kodagu',
    city: 'Madikeri',
    nativePlace: 'Napoklu, Madikeri',
    currentLocation: 'Madikeri',
    occupation: 'Coffee Estate Manager',
    profession: 'Agriculture & Horticulture',
    company: 'Kodendera Plantations',
    education: 'B.Sc. Horticulture, UAS Bangalore',
    skills: 'Robusta Coffee Cultivation, Post-Harvest Processing, Women Entrepreneurship',
    role: 'USER',
    isActive: true,
    isVerified: false,
    approvalStatus: 'PENDING',
    createdAt: '2026-08-31T14:40:00Z',
    approvalHistory: [
      {
        status: 'PENDING',
        date: '2026-08-31T14:40:00Z',
      },
    ],
  },
  {
    id: 'u-pending-3',
    displayName: 'Harish Nanjappa',
    familyName: 'Bettadapura',
    username: 'harish_bettada',
    email: 'harish.n@yahoo.com',
    phone: '+91 9740556677',
    phoneVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
    dob: '1992-11-08',
    gender: 'Male',
    country: 'India',
    state: 'Karnataka',
    district: 'Mysuru',
    city: 'Periyapatna',
    nativePlace: 'Bettadapura',
    currentLocation: 'Mysuru',
    occupation: 'Secondary School Principal',
    profession: 'Education',
    company: 'Vidyodaya Rural High School',
    education: 'M.Sc. Mathematics, B.Ed',
    skills: 'Youth Education, Kannada Literature, Sports Coaching',
    role: 'USER',
    isActive: true,
    isVerified: false,
    approvalStatus: 'RESUBMITTED',
    createdAt: '2026-08-25T09:00:00Z',
    approvalHistory: [
      {
        status: 'PENDING',
        date: '2026-08-25T09:00:00Z',
      },
      {
        status: 'REJECTED',
        date: '2026-08-27T11:00:00Z',
        reason: 'Please provide full legal name and clear school affiliation.',
        adminName: 'Admin Team',
      },
      {
        status: 'RESUBMITTED',
        date: '2026-08-29T16:20:00Z',
      },
    ],
  },
  {
    id: 'u-approved-1',
    displayName: 'Chethan Gowda',
    familyName: 'Mandya Gowda',
    username: 'chethan_gowda',
    email: 'chethan.g@gmail.com',
    phone: '+91 9845012345',
    phoneVerified: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Chethan+Gowda&background=DCFCE7&color=166534',
    dob: '1990-01-10',
    gender: 'Male',
    country: 'India',
    state: 'Karnataka',
    district: 'Mandya',
    city: 'Pandavapura',
    nativePlace: 'Pandavapura',
    currentLocation: 'Bengaluru',
    occupation: 'Senior Staff Engineer',
    profession: 'Software Engineering',
    company: 'Tech India Solutions',
    education: 'B.Tech, IIT Madras',
    skills: 'React Native, Node.js, Community Welfare',
    role: 'ADMIN',
    isActive: true,
    isVerified: true,
    approvalStatus: 'APPROVED',
    createdAt: '2026-01-10T08:00:00Z',
    approvalHistory: [
      { status: 'APPROVED', date: '2026-01-10T08:30:00Z', adminName: 'Super Admin' },
    ],
  },
  {
    id: 'u-approved-2',
    displayName: 'Sunitha Ramesh Gowda',
    familyName: 'Hunsur Gowda',
    username: 'sunitha_gowda',
    email: 'sunitha.r@yahoo.com',
    phone: '+91 9900223344',
    phoneVerified: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Sunitha+Gowda&background=E0F2FE&color=0369A1',
    dob: '1988-05-14',
    gender: 'Female',
    country: 'India',
    state: 'Karnataka',
    district: 'Mysuru',
    city: 'Hunsur',
    nativePlace: 'Hunsur',
    currentLocation: 'Mysuru',
    occupation: 'Education Consultant',
    profession: 'Education & Social Work',
    company: 'Gramodaya Trust',
    education: 'M.A., M.Ed',
    skills: 'Rural Education, Scholarships, Cultural Preservation',
    role: 'USER',
    isActive: true,
    isVerified: true,
    approvalStatus: 'APPROVED',
    createdAt: '2026-02-14T10:30:00Z',
    approvalHistory: [
      { status: 'APPROVED', date: '2026-02-14T11:00:00Z', adminName: 'Admin Team' },
    ],
  },
];

interface UserApprovalState {
  users: ManagedUser[];
  registerPendingUser: (data: Partial<ManagedUser>) => ManagedUser;
  approveUser: (userId: string, adminName?: string) => void;
  rejectUser: (userId: string, reason: string, adminName?: string) => void;
  resubmitUser: (userId: string, updates: Partial<ManagedUser>) => void;
  suspendUser: (userId: string, reason?: string) => void;
  reactivateUser: (userId: string) => void;
  getUserById: (userId: string) => ManagedUser | undefined;
  getApprovalStats: () => {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
  };
}

export const useUserApprovalStore = create<UserApprovalState>()(
  persist(
    (set, get) => ({
      users: INITIAL_MANAGED_USERS,

      registerPendingUser: (data) => {
        const newUser: ManagedUser = {
          id: `u-${Date.now()}`,
          username: data.username || data.email?.split('@')[0] || `user_${Date.now().toString().slice(-4)}`,
          displayName: data.displayName || 'New Member',
          familyName: data.familyName || '',
          email: data.email || '',
          phone: data.phone || '',
          phoneVerified: true,
          avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300',
          dob: data.dob || '',
          gender: data.gender || 'Male',
          country: data.country || 'India',
          state: data.state || 'Karnataka',
          district: data.district || '',
          city: data.city || '',
          nativePlace: data.nativePlace || '',
          currentLocation: data.currentLocation || '',
          occupation: data.occupation || '',
          profession: data.profession || '',
          company: data.company || '',
          education: data.education || '',
          skills: data.skills || '',
          role: 'USER',
          isActive: true,
          isVerified: false,
          approvalStatus: 'PENDING',
          createdAt: new Date().toISOString(),
          approvalHistory: [
            {
              status: 'PENDING',
              date: new Date().toISOString(),
            },
          ],
          ...data,
        };

        set((state) => ({
          users: [newUser, ...state.users.filter((u) => u.email !== newUser.email && u.phone !== newUser.phone)],
        }));

        return newUser;
      },

      approveUser: (userId, adminName = 'Administrator') => {
        const date = new Date().toISOString();
        set((state) => {
          const updatedUsers = state.users.map((u) => {
            if (u.id === userId) {
              const history = u.approvalHistory || [];
              return {
                ...u,
                approvalStatus: 'APPROVED' as const,
                isVerified: true,
                isActive: true,
                approvalHistory: [
                  ...history,
                  { status: 'APPROVED' as const, date, adminName },
                ],
              };
            }
            return u;
          });
          return { users: updatedUsers };
        });

        // Sync with active user if currently logged in
        const currentAuthUser = useAuthStore.getState().user;
        if (currentAuthUser && currentAuthUser.id === userId) {
          useAuthStore.getState().updateProfile({
            approvalStatus: 'APPROVED',
            isVerified: true,
            isActive: true,
          });
        }
      },

      rejectUser: (userId, reason, adminName = 'Administrator') => {
        const date = new Date().toISOString();
        set((state) => {
          const updatedUsers = state.users.map((u) => {
            if (u.id === userId) {
              const history = u.approvalHistory || [];
              return {
                ...u,
                approvalStatus: 'REJECTED' as const,
                rejectionReason: reason,
                approvalHistory: [
                  ...history,
                  { status: 'REJECTED' as const, date, reason, adminName },
                ],
              };
            }
            return u;
          });
          return { users: updatedUsers };
        });

        // Sync with active user if currently logged in
        const currentAuthUser = useAuthStore.getState().user;
        if (currentAuthUser && currentAuthUser.id === userId) {
          useAuthStore.getState().updateProfile({
            approvalStatus: 'REJECTED',
            rejectionReason: reason,
          });
        }
      },

      resubmitUser: (userId, updates) => {
        const date = new Date().toISOString();
        set((state) => {
          const updatedUsers = state.users.map((u) => {
            if (u.id === userId) {
              const history = u.approvalHistory || [];
              return {
                ...u,
                ...updates,
                approvalStatus: 'RESUBMITTED' as const,
                approvalHistory: [
                  ...history,
                  { status: 'RESUBMITTED' as const, date },
                ],
              };
            }
            return u;
          });
          return { users: updatedUsers };
        });

        // Sync with active user if currently logged in
        const currentAuthUser = useAuthStore.getState().user;
        if (currentAuthUser && currentAuthUser.id === userId) {
          useAuthStore.getState().updateProfile({
            ...updates,
            approvalStatus: 'RESUBMITTED',
          });
        }
      },

      suspendUser: (userId, reason = 'Administrative suspension') => {
        const date = new Date().toISOString();
        set((state) => {
          const updatedUsers = state.users.map((u) => {
            if (u.id === userId) {
              const history = u.approvalHistory || [];
              return {
                ...u,
                approvalStatus: 'SUSPENDED' as const,
                isActive: false,
                approvalHistory: [
                  ...history,
                  { status: 'SUSPENDED' as const, date, reason },
                ],
              };
            }
            return u;
          });
          return { users: updatedUsers };
        });

        const currentAuthUser = useAuthStore.getState().user;
        if (currentAuthUser && currentAuthUser.id === userId) {
          useAuthStore.getState().updateProfile({
            approvalStatus: 'SUSPENDED',
            isActive: false,
          });
        }
      },

      reactivateUser: (userId) => {
        const date = new Date().toISOString();
        set((state) => {
          const updatedUsers = state.users.map((u) => {
            if (u.id === userId) {
              const history = u.approvalHistory || [];
              return {
                ...u,
                approvalStatus: 'APPROVED' as const,
                isActive: true,
                approvalHistory: [
                  ...history,
                  { status: 'APPROVED' as const, date, reason: 'Reactivated by Admin' },
                ],
              };
            }
            return u;
          });
          return { users: updatedUsers };
        });

        const currentAuthUser = useAuthStore.getState().user;
        if (currentAuthUser && currentAuthUser.id === userId) {
          useAuthStore.getState().updateProfile({
            approvalStatus: 'APPROVED',
            isActive: true,
          });
        }
      },

      getUserById: (userId) => {
        if (!userId) return undefined;
        const target = userId.toLowerCase();
        return get().users.find(
          (u) =>
            u.id === userId ||
            (u.email && u.email.toLowerCase() === target) ||
            (u.username && u.username.toLowerCase() === target)
        );
      },

      getApprovalStats: () => {
        const users = get().users;
        const total = users.length;
        const pending = users.filter((u) => u.approvalStatus === 'PENDING' || u.approvalStatus === 'RESUBMITTED').length;
        const approved = users.filter((u) => u.approvalStatus === 'APPROVED').length;
        const rejected = users.filter((u) => u.approvalStatus === 'REJECTED').length;
        const suspended = users.filter((u) => u.approvalStatus === 'SUSPENDED').length;
        return { total, pending, approved, rejected, suspended };
      },
    }),
    {
      name: 'gowda_user_approval_store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/**
 * Accurately determines user approval status across local store and server auth session:
 * - Admin/moderator roles are always approved.
 * - Checks local approval store (matching by ID, email, or username).
 * - If found in local store, returns its explicitly set status.
 * - If user has an explicit status in auth session, returns that.
 * - If user is banned or isActive === false, returns 'SUSPENDED'.
 * - Default for active community members in database: 'APPROVED' (matching Admin Dashboard logic where active members are Approved).
 */
export function resolveUserApproval(user?: Partial<User> | null): {
  isApproved: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | 'SUSPENDED';
  managedUser?: ManagedUser;
} {
  if (!user) {
    return { isApproved: false, status: 'PENDING' };
  }

  // Admins and moderators always have platform access
  if (user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'MODERATOR') {
    return { isApproved: true, status: 'APPROVED' };
  }

  // 1. Prefer server-provided approval state when present.
  if (user.approvalStatus) {
    const isApproved = user.approvalStatus === 'APPROVED' && user.isActive !== false && !(user as any).isBanned;
    return { isApproved, status: user.approvalStatus };
  }

  // 2. Fall back to local approval store for offline/demo data.
  const storeUsers = useUserApprovalStore.getState().users;
  const userEmail = user.email?.toLowerCase().trim();
  const userUsername = user.username?.toLowerCase().trim();
  const userId = user.id;

  const managed = storeUsers.find(
    (u) =>
      (userId && u.id === userId) ||
      (userEmail && u.email && u.email.toLowerCase().trim() === userEmail) ||
      (userUsername && u.username && u.username.toLowerCase().trim() === userUsername)
  );

  if (managed?.approvalStatus) {
    const isApproved =
      managed.approvalStatus === 'APPROVED' && !managed.isBanned && managed.isActive !== false;
    return { isApproved, status: managed.approvalStatus, managedUser: managed };
  }

  // 3. Check for ban or suspension
  if (user.isActive === false || (user as any).isBanned) {
    return { isApproved: false, status: 'SUSPENDED', managedUser: managed };
  }

  // 4. Default for active community members:
  // In the admin dashboard, active registered members are Approved.
  return { isApproved: true, status: 'APPROVED', managedUser: managed };
}

