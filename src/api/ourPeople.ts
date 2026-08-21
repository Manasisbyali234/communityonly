import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Types ──────────────────────────────────────────────────────────────────────

export type StoryCategory =
  | 'Achievements'
  | 'Business & Entrepreneurship'
  | 'Education'
  | 'Sports'
  | 'Community Service'
  | 'Inspiring Journeys';

export const STORY_CATEGORIES: { id: StoryCategory; label: string; emoji: string; color: string }[] = [
  { id: 'Achievements', label: 'Achievements', emoji: '🏆', color: '#D97706' },
  { id: 'Business & Entrepreneurship', label: 'Business', emoji: '💼', color: '#059669' },
  { id: 'Education', label: 'Education', emoji: '🎓', color: '#2563EB' },
  { id: 'Sports', label: 'Sports', emoji: '🏅', color: '#DC2626' },
  { id: 'Community Service', label: 'Community Service', emoji: '🌱', color: '#16A34A' },
  { id: 'Inspiring Journeys', label: 'Inspiring Journeys', emoji: '🌟', color: '#9333EA' },
];

export type StoryStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';

export interface CommunityStory {
  id: string;
  title: string;
  personName: string;
  personAvatarUrl?: string;
  profession: string;
  location: string;
  category: StoryCategory;
  shortDescription: string;
  fullStory: string;
  featuredImage: string;
  additionalImages?: string[];
  isFeatured: boolean;
  status: StoryStatus;
  publishedAt: string;
  createdAt: string;
  readTimeMinutes: number;
}

export interface StoryFilters {
  category?: string;
  search?: string;
  featuredOnly?: boolean;
}

// ── Mock Initial Stories ───────────────────────────────────────────────────────

export const INITIAL_STORIES: CommunityStory[] = [
  {
    id: 'story-1',
    title: 'From a Small Village in Mandya to Building a Global AgriTech Pioneer',
    personName: 'Ramesh Veerappa Gowda',
    personAvatarUrl: 'https://ui-avatars.com/api/?name=Ramesh+Gowda&background=C8E6C9&color=1B5E20',
    profession: 'Founder & CEO, AgroNext Solutions',
    location: 'Mandya / Bengaluru, Karnataka',
    category: 'Business & Entrepreneurship',
    shortDescription: 'How a farmer’s son combined traditional agrarian wisdom with smart IoT technologies to empower over 50,000 farmers across South India.',
    fullStory: `Born in a small farming village in Pandavapura taluk, Mandya district, Ramesh Gowda grew up witnessing firsthand the uncertainties and struggles of seasonal agriculture. Despite financial hardships, his dedication to studies led him to earn a degree in computer engineering from Mysore University.\n\nAfter working in the software industry for over a decade, Ramesh decided to return to his roots. In 2018, he founded AgroNext Solutions, an AgriTech enterprise that provides low-cost solar automated irrigation sensors and precision crop guidance to smallholder farmers.\n\n"Our community has always been the backbone of agriculture. My mission is to ensure that the next generation of farmers uses modern science to turn agriculture into a profitable, dignified profession," says Ramesh.\n\nToday, AgroNext employs over 120 rural youth and has helped conserve millions of liters of water while increasing farm yields by 35%. Ramesh regularly conducts free weekend skill-building workshops for youth in Mandya and Hassan.`,
    featuredImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1000&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80',
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80',
    ],
    isFeatured: true,
    status: 'PUBLISHED',
    publishedAt: '2026-08-15T08:00:00Z',
    createdAt: '2026-08-15T08:00:00Z',
    readTimeMinutes: 4,
  },
  {
    id: 'story-2',
    title: 'Securing All-India Rank 24 in UPSC: The Story of Resilience & Hard Work',
    personName: 'Ananya S. Gowda',
    personAvatarUrl: 'https://ui-avatars.com/api/?name=Ananya+Gowda&background=FEF9C3&color=A16207',
    profession: 'IAS Officer (2025 Batch)',
    location: 'Hassan, Karnataka',
    category: 'Achievements',
    shortDescription: 'Balancing her job while preparing for the Civil Services, Ananya cracked one of the toughest examinations in her first attempt.',
    fullStory: `Hailing from a family of teachers in Hassan, Ananya Gowda set her heart on civil services at a very young age. She completed her schooling in Kannada medium government schools before studying political science at Bangalore University.\n\nWhile working full-time as an educational research associate, Ananya dedicated 6 hours daily to disciplined self-study without joining expensive coaching institutes.\n\n"Perseverance matters far more than privilege," Ananya reflects. "Whenever I felt tired, I reminded myself of the countless rural families in our state who need honest administrators to champion their rights."\n\nHer achievement has inspired dozens of students across Hassan and surrounding districts, where she regularly visits community study centers to mentor civil service aspirants.`,
    featuredImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1000&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80',
    ],
    isFeatured: true,
    status: 'PUBLISHED',
    publishedAt: '2026-08-10T10:00:00Z',
    createdAt: '2026-08-10T10:00:00Z',
    readTimeMinutes: 3,
  },
  {
    id: 'story-3',
    title: 'Reviving 14 Ancient Water Lakes: A Community Hero’s 10-Year Crusade',
    personName: 'Shivarame Gowda',
    personAvatarUrl: 'https://ui-avatars.com/api/?name=Shivarame+Gowda&background=E0F2FE&color=0369A1',
    profession: 'Environmentalist & Social Worker',
    location: 'Tumakuru, Karnataka',
    category: 'Community Service',
    shortDescription: 'Without government funding, this community elder mobilised local youth and farmers to rejuvenate dried village lakes, restoring the local groundwater table.',
    fullStory: `When consecutive droughts dried up the village borewells in Sira taluk, 62-year-old farmer Shivarame Gowda knew waiting for external aid wouldn't save their crops. In 2015, he picked up a shovel and began de-silting the neglected century-old Kalyani near his village.\n\nWitnessing his singular commitment, hundreds of youth and fellow farmers joined his weekend shramadana (voluntary community labor). Over the past decade, Shivarame Gowda has spearheaded the revival of 14 key water bodies, planting over 25,000 native neem and banyan trees along their banks.\n\nToday, the region boasts a healthy water table even in dry summers, and Shivarame Gowda has been honored with state-level conservation awards.`,
    featuredImage: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1000&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
    ],
    isFeatured: false,
    status: 'PUBLISHED',
    publishedAt: '2026-08-01T09:00:00Z',
    createdAt: '2026-08-01T09:00:00Z',
    readTimeMinutes: 4,
  },
  {
    id: 'story-4',
    title: 'National Athletics Gold Medalist: Running Toward Olympic Glory',
    personName: 'Chetan M. Gowda',
    personAvatarUrl: 'https://ui-avatars.com/api/?name=Chetan+Gowda&background=FEE2E2&color=DC2626',
    profession: 'National 800m Sprinter & Athlete',
    location: 'Mysuru, Karnataka',
    category: 'Sports',
    shortDescription: 'Overcoming sports injuries and humble beginnings, Chetan set a new national junior record in the 800m track event.',
    fullStory: `Trained initially on bare mud grounds in Channapatna by his physical education teacher, Chetan demonstrated an innate talent for middle-distance running.\n\nWith community sports sponsors stepping in to support his nutritional and training requirements at the Sports Authority of India (SAI) center in Bengaluru, Chetan clinched the Gold medal in the National Open Athletics Championship in 2025.\n\n"Every step on the track carries the pride of my community and country. I dream of seeing the tricolor fly at the Asian Games and Olympics," says the 21-year-old champion.`,
    featuredImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1000&q=80',
    additionalImages: [],
    isFeatured: false,
    status: 'PUBLISHED',
    publishedAt: '2026-07-28T14:00:00Z',
    createdAt: '2026-07-28T14:00:00Z',
    readTimeMinutes: 3,
  },
  {
    id: 'story-5',
    title: 'Free Digital Literacy & Coding for 3,000 Rural Girls',
    personName: 'Dr. Rekha Manjunath Gowda',
    personAvatarUrl: 'https://ui-avatars.com/api/?name=Rekha+Gowda&background=F3E8FF&color=7E22CE',
    profession: 'Professor of AI & Founder, VidyaShree Foundation',
    location: 'Bengaluru / Ramanagara, Karnataka',
    category: 'Education',
    shortDescription: 'Bridging the rural digital divide by setting up free computer labs and robotics kits in rural high schools across Karnataka.',
    fullStory: `A doctorate in Artificial Intelligence from IISc Bangalore, Dr. Rekha established the VidyaShree Foundation to ensure girls from rural agrarian families are equipped for modern technology careers.\n\nHer foundation has equipped 25 government schools in Ramanagara and Mandya with solar-powered computer labs and trained over 3,000 girl students in basic programming, cybersecurity, and digital communication.\n\n"Empowering our daughters with digital skills transforms the entire community's future," she affirms.`,
    featuredImage: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1000&q=80',
    additionalImages: [],
    isFeatured: false,
    status: 'PUBLISHED',
    publishedAt: '2026-07-20T11:00:00Z',
    createdAt: '2026-07-20T11:00:00Z',
    readTimeMinutes: 4,
  },
];

// ── In-Memory State for Mock CRUD ──────────────────────────────────────────────

let _communityStories: CommunityStory[] = [...INITIAL_STORIES];

// ── User / Public Hooks ────────────────────────────────────────────────────────

export function usePublicStoriesQuery(filters?: StoryFilters) {
  return useQuery({
    queryKey: ['community-stories', 'public', filters],
    queryFn: async (): Promise<CommunityStory[]> => {
      await new Promise((r) => setTimeout(r, 400));
      let res = _communityStories.filter((s) => s.status === 'PUBLISHED');
      if (filters?.category && filters.category !== 'All') {
        res = res.filter((s) => s.category === filters.category);
      }
      if (filters?.featuredOnly) {
        res = res.filter((s) => s.isFeatured);
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        res = res.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.personName.toLowerCase().includes(q) ||
            s.profession.toLowerCase().includes(q) ||
            s.location.toLowerCase().includes(q) ||
            s.shortDescription.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q)
        );
      }
      return res.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    },
    staleTime: 60 * 1000,
  });
}

export function useFeaturedStoriesQuery() {
  return useQuery({
    queryKey: ['community-stories', 'featured'],
    queryFn: async (): Promise<CommunityStory[]> => {
      await new Promise((r) => setTimeout(r, 300));
      return _communityStories
        .filter((s) => s.status === 'PUBLISHED' && s.isFeatured)
        .slice(0, 3);
    },
  });
}

export function useStoryQuery(id: string) {
  return useQuery({
    queryKey: ['community-story', id],
    queryFn: async (): Promise<CommunityStory | null> => {
      await new Promise((r) => setTimeout(r, 300));
      return _communityStories.find((s) => s.id === id) ?? null;
    },
    enabled: !!id,
  });
}

// ── Admin Hooks ────────────────────────────────────────────────────────────────

export function useAdminStoriesQuery(statusTab?: StoryStatus | 'ALL') {
  return useQuery({
    queryKey: ['admin-stories', statusTab],
    queryFn: async (): Promise<CommunityStory[]> => {
      await new Promise((r) => setTimeout(r, 400));
      if (!statusTab || statusTab === 'ALL') {
        return [..._communityStories];
      }
      return _communityStories.filter((s) => s.status === statusTab);
    },
  });
}

export function useAdminCreateStoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<CommunityStory, 'id' | 'createdAt' | 'readTimeMinutes'>): Promise<CommunityStory> => {
      await new Promise((r) => setTimeout(r, 600));
      const words = (data.fullStory || '').split(/\s+/).length;
      const readTime = Math.max(1, Math.round(words / 200));
      const newStory: CommunityStory = {
        ...data,
        id: `story-${Date.now()}`,
        createdAt: new Date().toISOString(),
        readTimeMinutes: readTime,
      };
      _communityStories = [newStory, ..._communityStories];
      return newStory;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-stories'] });
      qc.invalidateQueries({ queryKey: ['admin-stories'] });
    },
  });
}

export function useAdminUpdateStoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CommunityStory> }): Promise<CommunityStory> => {
      await new Promise((r) => setTimeout(r, 500));
      _communityStories = _communityStories.map((s) => {
        if (s.id === id) {
          const updated = { ...s, ...data };
          if (data.fullStory) {
            const words = data.fullStory.split(/\s+/).length;
            updated.readTimeMinutes = Math.max(1, Math.round(words / 200));
          }
          return updated;
        }
        return s;
      });
      return _communityStories.find((s) => s.id === id)!;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['community-stories'] });
      qc.invalidateQueries({ queryKey: ['community-story', id] });
      qc.invalidateQueries({ queryKey: ['admin-stories'] });
    },
  });
}

export function useAdminTogglePublishMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StoryStatus }): Promise<void> => {
      await new Promise((r) => setTimeout(r, 400));
      _communityStories = _communityStories.map((s) =>
        s.id === id ? { ...s, status, publishedAt: status === 'PUBLISHED' ? new Date().toISOString() : s.publishedAt } : s
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-stories'] });
      qc.invalidateQueries({ queryKey: ['admin-stories'] });
    },
  });
}

export function useAdminToggleFeaturedMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }): Promise<void> => {
      await new Promise((r) => setTimeout(r, 300));
      _communityStories = _communityStories.map((s) =>
        s.id === id ? { ...s, isFeatured } : s
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-stories'] });
      qc.invalidateQueries({ queryKey: ['admin-stories'] });
    },
  });
}

export function useAdminDeleteStoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await new Promise((r) => setTimeout(r, 400));
      _communityStories = _communityStories.filter((s) => s.id !== id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-stories'] });
      qc.invalidateQueries({ queryKey: ['admin-stories'] });
    },
  });
}
