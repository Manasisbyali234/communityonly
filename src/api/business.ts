import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Types ──────────────────────────────────────────────────────────────────────

export type BusinessStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT' | 'WITHDRAWN';

export const BUSINESS_CATEGORIES = [
  'Agriculture & Farming',
  'Construction & Real Estate',
  'Education & Coaching',
  'Food & Beverages',
  'Healthcare & Wellness',
  'IT & Technology',
  'Retail & Shopping',
  'Services',
  'Transport & Logistics',
  'Manufacturing',
  'Other',
] as const;

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];

export interface Business {
  id: string;
  userId: string;
  ownerName: string;
  ownerAvatarUrl?: string;
  businessName: string;
  category: BusinessCategory | string;
  description: string;
  productsServices: string;
  location: string;
  address?: string;
  website?: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  coverUrl?: string;
  photos: string[];
  offers?: string;
  status: BusinessStatus;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  submittedAt: string;
  createdAt: string;
  reviewCount?: number;
  averageRating?: number;
  isVerified: boolean;
}

export interface BusinessReview {
  id: string;
  businessId: string;
  userId: string;
  reviewerName: string;
  reviewerAvatarUrl?: string;
  rating: number; // 1–5
  comment: string;
  createdAt: string;
}

export interface BusinessFilters {
  category?: string;
  location?: string;
  search?: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

export const MOCK_BUSINESSES: Business[] = [
  {
    id: 'biz-1',
    userId: 'u1',
    ownerName: 'Ravi Kumar Gowda',
    ownerAvatarUrl: 'https://ui-avatars.com/api/?name=Ravi+Gowda&background=C8E6C9&color=1B5E20',
    businessName: 'Gowda Organic Farms',
    category: 'Agriculture & Farming',
    description: 'We grow premium organic vegetables, millets, and pulses using traditional farming methods handed down across generations. Our produce is free of chemicals and directly sourced from our family farm in Mandya.',
    productsServices: 'Organic vegetables, Millets, Ragi, Pulses, Coconuts, Farm-fresh produce delivery',
    location: 'Mandya, Karnataka',
    address: 'Survey No. 45, Pandavapura Road, Mandya, Karnataka - 571401',
    website: 'https://gowdaorganicfarms.com',
    whatsapp: '+91 9876543210',
    phone: '+91 9876543210',
    email: 'ravi@gowdaorganicfarms.com',
    logoUrl: 'https://ui-avatars.com/api/?name=Gowda+Farms&background=2D6A2D&color=ffffff&size=200',
    coverUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600&q=80',
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&q=80',
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=80',
    ],
    offers: 'Free home delivery for orders above ₹500 within Mandya city. Weekly subscription boxes available.',
    status: 'APPROVED',
    submittedAt: '2026-07-01T10:00:00Z',
    createdAt: '2026-07-01T10:00:00Z',
    reviewCount: 12,
    averageRating: 4.7,
    isVerified: true,
  },
  {
    id: 'biz-2',
    userId: 'u2',
    ownerName: 'Suresh Veerappa Gowda',
    ownerAvatarUrl: 'https://ui-avatars.com/api/?name=Suresh+Gowda&background=C8E6C9&color=1B5E20',
    businessName: 'Sri Veerappa Construction',
    category: 'Construction & Real Estate',
    description: 'Licensed civil contractor with 15+ years of experience in residential and commercial construction. We specialize in traditional and modern architecture with quality materials.',
    productsServices: 'House construction, Interior design, Renovation, Commercial buildings, Site supervision',
    location: 'Mysuru, Karnataka',
    address: '12th Cross, Vijayanagar, Mysuru - 570017',
    website: 'https://veerappaconstruction.in',
    whatsapp: '+91 9845123456',
    phone: '+91 9845123456',
    email: 'suresh@veerappaconstruction.in',
    logoUrl: 'https://ui-avatars.com/api/?name=Veerappa+Const&background=1565C0&color=ffffff&size=200',
    coverUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    ],
    offers: 'Free site consultation and estimate. Offer valid for first 3 months of 2026.',
    status: 'APPROVED',
    submittedAt: '2026-07-10T08:00:00Z',
    createdAt: '2026-07-10T08:00:00Z',
    reviewCount: 8,
    averageRating: 4.5,
    isVerified: true,
  },
  {
    id: 'biz-3',
    userId: 'u3',
    ownerName: 'Kavitha Nagappa Gowda',
    ownerAvatarUrl: 'https://ui-avatars.com/api/?name=Kavitha+Gowda&background=FFF9C4&color=F57F17',
    businessName: 'KNG Tutorials – NEET & JEE Coaching',
    category: 'Education & Coaching',
    description: 'Specialized coaching for NEET and JEE aspirants. Small batch sizes (max 15 students) ensure personalized attention. 95% of our students qualify in their first attempt.',
    productsServices: 'NEET Coaching, JEE Coaching, PUC Science tuition, Online Classes, Study materials',
    location: 'Hassan, Karnataka',
    address: 'Near Government Hospital, BM Road, Hassan - 573201',
    whatsapp: '+91 9741234567',
    phone: '+91 9741234567',
    email: 'kavitha@kngtutorials.com',
    logoUrl: 'https://ui-avatars.com/api/?name=KNG+Tutorials&background=F9A825&color=ffffff&size=200',
    coverUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1588072432836-e10032774350?w=600&q=80',
    ],
    offers: '20% discount on annual coaching packages for Gowda community students.',
    status: 'APPROVED',
    submittedAt: '2026-07-15T09:00:00Z',
    createdAt: '2026-07-15T09:00:00Z',
    reviewCount: 22,
    averageRating: 4.9,
    isVerified: true,
  },
  {
    id: 'biz-4',
    userId: 'u4',
    ownerName: 'Prakash Siddaiah Gowda',
    ownerAvatarUrl: 'https://ui-avatars.com/api/?name=Prakash+Gowda&background=FFCCBC&color=BF360C',
    businessName: 'Gowda Darshini & Catering',
    category: 'Food & Beverages',
    description: 'Authentic South Indian tiffin center and catering service. We serve traditional Karnataka cuisine for weddings, functions, and corporate events. Pure veg kitchen with hygiene certified staff.',
    productsServices: 'South Indian breakfast, Lunch catering, Wedding catering, Event catering, Home delivery',
    location: 'Bengaluru, Karnataka',
    address: '4th Main, Rajajinagar 1st Block, Bengaluru - 560010',
    whatsapp: '+91 9632145678',
    phone: '+91 9632145678',
    email: 'gowdadarshini@gmail.com',
    logoUrl: 'https://ui-avatars.com/api/?name=Gowda+Darshini&background=E65100&color=ffffff&size=200',
    coverUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
      'https://images.unsplash.com/photo-1574126154517-d1e0d89ef734?w=600&q=80',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
    ],
    offers: 'Special 10% discount for community members. Minimum order ₹2000 for catering.',
    status: 'APPROVED',
    submittedAt: '2026-07-20T11:00:00Z',
    createdAt: '2026-07-20T11:00:00Z',
    reviewCount: 35,
    averageRating: 4.6,
    isVerified: true,
  },
  {
    id: 'biz-5',
    userId: 'u5',
    ownerName: 'Manjunath Devaraju Gowda',
    ownerAvatarUrl: 'https://ui-avatars.com/api/?name=Manju+Gowda&background=C8E6C9&color=1B5E20',
    businessName: 'PixelCraft IT Solutions',
    category: 'IT & Technology',
    description: 'We build modern websites, mobile apps, and enterprise software. Trusted by 50+ businesses across Karnataka. Affordable pricing with premium quality delivery.',
    productsServices: 'Website design, Mobile app development, E-commerce solutions, Digital marketing, Cloud hosting',
    location: 'Bengaluru, Karnataka',
    address: 'Koramangala 5th Block, Bengaluru - 560095',
    website: 'https://pixelcraftit.in',
    whatsapp: '+91 9901234567',
    phone: '+91 9901234567',
    email: 'hello@pixelcraftit.in',
    logoUrl: 'https://ui-avatars.com/api/?name=PixelCraft+IT&background=9333EA&color=ffffff&size=200',
    coverUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80',
    ],
    offers: 'Free website audit and 15% discount for Gowda community businesses.',
    status: 'APPROVED',
    submittedAt: '2026-07-25T10:00:00Z',
    createdAt: '2026-07-25T10:00:00Z',
    reviewCount: 18,
    averageRating: 4.8,
    isVerified: true,
  },
  {
    id: 'biz-6',
    userId: 'u6',
    ownerName: 'Anitha Rangappa Gowda',
    ownerAvatarUrl: 'https://ui-avatars.com/api/?name=Anitha+Gowda&background=C8E6C9&color=1B5E20',
    businessName: 'Gowda Clinic – Family Healthcare',
    category: 'Healthcare & Wellness',
    description: 'General physician and family medicine clinic. Dr. Anitha Gowda (MBBS, MD) provides affordable and quality healthcare for all. Evening and weekend appointments available.',
    productsServices: 'General medicine, Preventive health checkups, Child healthcare, Women\'s health, Minor surgery',
    location: 'Tumkur, Karnataka',
    address: '7th Cross, Siddaganga Layout, Tumkur - 572101',
    whatsapp: '+91 9886543210',
    phone: '+91 9886543210',
    email: 'anitha.gowdaclinic@gmail.com',
    logoUrl: 'https://ui-avatars.com/api/?name=Gowda+Clinic&background=059669&color=ffffff&size=200',
    coverUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1631563019676-dade0b7a5759?w=600&q=80',
    ],
    status: 'APPROVED',
    submittedAt: '2026-08-01T08:00:00Z',
    createdAt: '2026-08-01T08:00:00Z',
    reviewCount: 41,
    averageRating: 4.7,
    isVerified: true,
  },
];

export const MOCK_MY_BUSINESSES: Business[] = [
  MOCK_BUSINESSES[4], // approved
  {
    id: 'biz-mine-1',
    userId: 'current-user',
    ownerName: 'You',
    businessName: 'My Silk Saree Store',
    category: 'Retail & Shopping',
    description: 'Premium Mysuru silk sarees directly from weavers.',
    productsServices: 'Mysuru silk sarees, Handloom sarees, Dress materials',
    location: 'Mysuru, Karnataka',
    status: 'PENDING',
    submittedAt: '2026-08-18T10:00:00Z',
    createdAt: '2026-08-18T10:00:00Z',
    photos: [],
    isVerified: false,
  },
  {
    id: 'biz-mine-2',
    userId: 'current-user',
    ownerName: 'You',
    businessName: 'Gowda Transport Services',
    category: 'Transport & Logistics',
    description: 'Truck and mini-truck rental for goods transport across Karnataka.',
    productsServices: 'Goods transport, Mini truck rental, Packers & movers',
    location: 'Bengaluru, Karnataka',
    status: 'REJECTED',
    rejectionReason: 'Please provide a valid business registration number and at least one clear photo of your vehicle fleet.',
    submittedAt: '2026-08-10T09:00:00Z',
    createdAt: '2026-08-10T09:00:00Z',
    photos: [],
    isVerified: false,
  },
];

export const MOCK_ADMIN_BUSINESSES: Business[] = [
  ...MOCK_BUSINESSES,
  {
    id: 'biz-pending-1',
    userId: 'u7',
    ownerName: 'Gopal Srinivas Gowda',
    businessName: 'Gowda Nursery & Garden Center',
    category: 'Agriculture & Farming',
    description: 'Wide range of plants, seeds, fertilizers and gardening tools.',
    productsServices: 'Ornamental plants, Fruit trees, Seeds, Fertilizers, Garden tools',
    location: 'Shivamogga, Karnataka',
    phone: '+91 9845678901',
    email: 'gopal.nursery@gmail.com',
    whatsapp: '+91 9845678901',
    status: 'PENDING',
    submittedAt: '2026-08-19T08:00:00Z',
    createdAt: '2026-08-19T08:00:00Z',
    photos: [],
    isVerified: false,
  },
  {
    id: 'biz-pending-2',
    userId: 'u8',
    ownerName: 'Vidya Ramesh Gowda',
    businessName: 'Gowda Jewellery Works',
    category: 'Retail & Shopping',
    description: 'Traditional gold and silver jewellery crafted by skilled artisans.',
    productsServices: 'Gold jewellery, Silver ornaments, Custom jewellery design, Repair services',
    location: 'Hassan, Karnataka',
    phone: '+91 9632578901',
    whatsapp: '+91 9632578901',
    status: 'PENDING',
    submittedAt: '2026-08-20T14:00:00Z',
    createdAt: '2026-08-20T14:00:00Z',
    photos: [],
    isVerified: false,
  },
];

export const MOCK_REVIEWS: Record<string, BusinessReview[]> = {
  'biz-1': [
    {
      id: 'r1',
      businessId: 'biz-1',
      userId: 'ru1',
      reviewerName: 'Kiran Swamy',
      reviewerAvatarUrl: 'https://ui-avatars.com/api/?name=Kiran+Swamy&background=E8F5E9&color=2D6A2D',
      rating: 5,
      comment: 'Excellent quality vegetables! Fresh, organic, and delivered on time. Highly recommend to all community members.',
      createdAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'r2',
      businessId: 'biz-1',
      userId: 'ru2',
      reviewerName: 'Meena Kumari',
      reviewerAvatarUrl: 'https://ui-avatars.com/api/?name=Meena+Kumari&background=FFF9C4&color=F57F17',
      rating: 4,
      comment: 'Good quality produce. Ragi flour is especially good. Would love more variety in the subscription box.',
      createdAt: '2026-08-05T12:00:00Z',
    },
    {
      id: 'r3',
      businessId: 'biz-1',
      userId: 'ru3',
      reviewerName: 'Nandini Prasad',
      rating: 5,
      comment: 'Been ordering for 3 months now. Quality is consistently great! Ravi anna is very responsive.',
      createdAt: '2026-07-28T09:00:00Z',
    },
  ],
  'biz-3': [
    {
      id: 'r4',
      businessId: 'biz-3',
      userId: 'ru4',
      reviewerName: 'Sanjay Hegde',
      rating: 5,
      comment: 'My son cracked NEET in first attempt. Kavitha madam\'s teaching style is exceptional. Highly recommend!',
      createdAt: '2026-08-12T14:00:00Z',
    },
  ],
  'biz-4': [
    {
      id: 'r5',
      businessId: 'biz-4',
      userId: 'ru5',
      reviewerName: 'Rahul Anand',
      rating: 5,
      comment: 'Catered for our wedding. 500 guests, everything was perfect. Food was delicious and served hot.',
      createdAt: '2026-08-08T18:00:00Z',
    },
    {
      id: 'r6',
      businessId: 'biz-4',
      userId: 'ru6',
      reviewerName: 'Priya Mahesh',
      rating: 4,
      comment: 'Tasty and authentic food. Masala dosa is the best in area. Sometimes a bit crowded during morning hours.',
      createdAt: '2026-08-02T09:00:00Z',
    },
  ],
};

// ── Local State for Mock CRUD ──────────────────────────────────────────────────

let _myBusinesses: Business[] = [...MOCK_MY_BUSINESSES];
let _adminBusinesses: Business[] = [...MOCK_ADMIN_BUSINESSES];

// ── User Hooks ─────────────────────────────────────────────────────────────────

export function usePublicBusinessesQuery(filters?: BusinessFilters) {
  return useQuery({
    queryKey: ['businesses', 'public', filters],
    queryFn: async (): Promise<Business[]> => {
      await new Promise((r) => setTimeout(r, 600));
      let result = MOCK_BUSINESSES.filter((b) => b.status === 'APPROVED');
      if (filters?.category && filters.category !== 'All') {
        result = result.filter((b) => b.category === filters.category);
      }
      if (filters?.location) {
        const q = filters.location.toLowerCase();
        result = result.filter((b) => b.location.toLowerCase().includes(q));
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (b) =>
            b.businessName.toLowerCase().includes(q) ||
            b.ownerName.toLowerCase().includes(q) ||
            b.category.toLowerCase().includes(q) ||
            b.location.toLowerCase().includes(q) ||
            b.productsServices.toLowerCase().includes(q) ||
            b.description.toLowerCase().includes(q)
        );
      }
      return result;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useBusinessQuery(id: string) {
  return useQuery({
    queryKey: ['business', id],
    queryFn: async (): Promise<Business | null> => {
      await new Promise((r) => setTimeout(r, 400));
      return (
        [...MOCK_BUSINESSES, ..._myBusinesses, ..._adminBusinesses].find((b) => b.id === id) ?? null
      );
    },
    enabled: !!id,
  });
}

export function useMyBusinessesQuery() {
  return useQuery({
    queryKey: ['businesses', 'mine'],
    queryFn: async (): Promise<Business[]> => {
      await new Promise((r) => setTimeout(r, 400));
      return [..._myBusinesses];
    },
  });
}

export function useBusinessReviewsQuery(businessId: string) {
  return useQuery({
    queryKey: ['business-reviews', businessId],
    queryFn: async (): Promise<BusinessReview[]> => {
      await new Promise((r) => setTimeout(r, 300));
      return MOCK_REVIEWS[businessId] ?? [];
    },
    enabled: !!businessId,
  });
}

export function useSubmitBusinessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Business, 'id' | 'status' | 'createdAt' | 'isVerified' | 'reviewCount' | 'averageRating'>): Promise<Business> => {
      await new Promise((r) => setTimeout(r, 800));
      const newBiz: Business = {
        ...data,
        id: `biz-mine-${Date.now()}`,
        status: 'PENDING',
        isVerified: false,
        reviewCount: 0,
        averageRating: 0,
        createdAt: new Date().toISOString(),
      };
      _myBusinesses = [newBiz, ..._myBusinesses];
      _adminBusinesses = [newBiz, ..._adminBusinesses];
      return newBiz;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses', 'mine'] });
    },
  });
}

export function useUpdateBusinessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Business> }): Promise<Business> => {
      await new Promise((r) => setTimeout(r, 600));
      _myBusinesses = _myBusinesses.map((b) =>
        b.id === id ? { ...b, ...data, status: 'PENDING', rejectionReason: null } : b
      );
      _adminBusinesses = _adminBusinesses.map((b) =>
        b.id === id ? { ...b, ...data, status: 'PENDING', rejectionReason: null } : b
      );
      return _myBusinesses.find((b) => b.id === id)!;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['businesses', 'mine'] });
      qc.invalidateQueries({ queryKey: ['business', id] });
    },
  });
}

export function useDeleteBusinessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await new Promise((r) => setTimeout(r, 400));
      _myBusinesses = _myBusinesses.filter((b) => b.id !== id);
      _adminBusinesses = _adminBusinesses.filter((b) => b.id !== id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses', 'mine'] });
    },
  });
}

export function useSubmitReviewMutation(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { rating: number; comment: string; reviewerName: string }): Promise<BusinessReview> => {
      await new Promise((r) => setTimeout(r, 500));
      const review: BusinessReview = {
        id: `r-${Date.now()}`,
        businessId,
        userId: 'current-user',
        reviewerName: data.reviewerName,
        rating: data.rating,
        comment: data.comment,
        createdAt: new Date().toISOString(),
      };
      MOCK_REVIEWS[businessId] = [review, ...(MOCK_REVIEWS[businessId] ?? [])];
      return review;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-reviews', businessId] });
    },
  });
}

// ── Admin Hooks ────────────────────────────────────────────────────────────────

export function useAdminBusinessesQuery(status?: BusinessStatus | 'ALL') {
  return useQuery({
    queryKey: ['admin-businesses', status],
    queryFn: async (): Promise<Business[]> => {
      await new Promise((r) => setTimeout(r, 500));
      if (!status || status === 'ALL') return [..._adminBusinesses];
      return _adminBusinesses.filter((b) => b.status === status);
    },
  });
}

export function useAdminApproveBusinessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await new Promise((r) => setTimeout(r, 500));
      _adminBusinesses = _adminBusinesses.map((b) =>
        b.id === id ? { ...b, status: 'APPROVED' as BusinessStatus, approvedAt: new Date().toISOString(), isVerified: true } : b
      );
      _myBusinesses = _myBusinesses.map((b) =>
        b.id === id ? { ...b, status: 'APPROVED' as BusinessStatus, approvedAt: new Date().toISOString(), isVerified: true } : b
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-businesses'] });
      qc.invalidateQueries({ queryKey: ['businesses'] });
    },
  });
}

export function useAdminRejectBusinessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }): Promise<void> => {
      await new Promise((r) => setTimeout(r, 500));
      _adminBusinesses = _adminBusinesses.map((b) =>
        b.id === id
          ? { ...b, status: 'REJECTED' as BusinessStatus, rejectionReason: reason, rejectedAt: new Date().toISOString() }
          : b
      );
      _myBusinesses = _myBusinesses.map((b) =>
        b.id === id
          ? { ...b, status: 'REJECTED' as BusinessStatus, rejectionReason: reason, rejectedAt: new Date().toISOString() }
          : b
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-businesses'] });
    },
  });
}

export function useAdminDeleteBusinessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await new Promise((r) => setTimeout(r, 400));
      _adminBusinesses = _adminBusinesses.filter((b) => b.id !== id);
      _myBusinesses = _myBusinesses.filter((b) => b.id !== id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-businesses'] });
    },
  });
}
