import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, Image, Switch, ActivityIndicator, Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C, SearchBar, EmptyState, LoadingOverlay, useIsMobile } from '../../components/admin/AdminUI';
import { fmtDate, fmtDateTime } from '../../utils/adminUtils';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import {
  useAdminStoriesQuery,
  useAdminCreateStoryMutation,
  useAdminUpdateStoryMutation,
  useAdminTogglePublishMutation,
  useAdminToggleFeaturedMutation,
  useAdminDeleteStoryMutation,
  STORY_CATEGORIES,
  CommunityStory,
  StoryCategory,
  StoryStatus,
} from '../../api/ourPeople';

type StatusTab = 'ALL' | 'PUBLISHED' | 'DRAFT' | 'UNPUBLISHED';

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'ALL',         label: 'All Stories' },
  { id: 'PUBLISHED',   label: 'Published & Live ✅' },
  { id: 'DRAFT',       label: 'Drafts 📝' },
  { id: 'UNPUBLISHED', label: 'Archived' },
];

export default function AdminCommunityStories() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [search, setSearch] = useState('');
  const [editingStory, setEditingStory] = useState<CommunityStory | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    personName: '',
    profession: '',
    location: '',
    category: 'Achievements' as StoryCategory,
    shortDescription: '',
    fullStory: '',
    featuredImage: '',
    additionalImages: '',
    isFeatured: false,
    status: 'PUBLISHED' as StoryStatus,
  });

  const showToast = useToastStore.getState().showToast;

  const { data: stories = [], isLoading, refetch } = useAdminStoriesQuery(
    activeTab === 'ALL' ? undefined : activeTab
  );
  const createMutation = useAdminCreateStoryMutation();
  const updateMutation = useAdminUpdateStoryMutation();
  const togglePublishMutation = useAdminTogglePublishMutation();
  const toggleFeaturedMutation = useAdminToggleFeaturedMutation();
  const deleteMutation = useAdminDeleteStoryMutation();

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // Metrics
  const statsOverview = useMemo(() => {
    const totalCount = stories.length || 5;
    const publishedCount = stories.filter((s) => s.status === 'PUBLISHED').length;
    const featuredCount = stories.filter((s) => s.isFeatured).length;
    const draftCount = stories.filter((s) => s.status === 'DRAFT' || s.status === 'UNPUBLISHED').length;
    return { totalCount, publishedCount, featuredCount, draftCount };
  }, [stories]);

  const filtered = useMemo(() => {
    return stories.filter((s) => {
      if (activeTab !== 'ALL' && s.status !== activeTab) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.personName.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q)
      );
    });
  }, [stories, activeTab, search]);

  const openCreateModal = () => {
    setEditingStory(null);
    setForm({
      title: '',
      personName: '',
      profession: '',
      location: '',
      category: 'Achievements',
      shortDescription: '',
      fullStory: '',
      featuredImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1000&q=80',
      additionalImages: '',
      isFeatured: false,
      status: 'PUBLISHED',
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (story: CommunityStory) => {
    setEditingStory(story);
    setForm({
      title: story.title,
      personName: story.personName,
      profession: story.profession,
      location: story.location,
      category: story.category,
      shortDescription: story.shortDescription,
      fullStory: story.fullStory,
      featuredImage: story.featuredImage,
      additionalImages: (story.additionalImages || []).join(', '),
      isFeatured: story.isFeatured,
      status: story.status,
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveStory = async () => {
    if (!form.title.trim()) { showToast('Please enter a story title.', 'error'); return; }
    if (!form.personName.trim()) { showToast('Please enter the person’s name.', 'error'); return; }
    if (!form.shortDescription.trim()) { showToast('Please enter a short description.', 'error'); return; }
    if (!form.fullStory.trim()) { showToast('Please write the full story.', 'error'); return; }
    if (!form.featuredImage.trim()) { showToast('Please provide a featured image URL.', 'error'); return; }

    const additionalArr = form.additionalImages
      ? form.additionalImages.split(',').map((u) => u.trim()).filter(Boolean)
      : [];

    try {
      if (editingStory) {
        await updateMutation.mutateAsync({
          id: editingStory.id,
          data: {
            ...form,
            additionalImages: additionalArr,
          },
        });
        showToast('Story updated successfully.', 'success');
      } else {
        await createMutation.mutateAsync({
          ...form,
          additionalImages: additionalArr,
          publishedAt: new Date().toISOString(),
        });
        showToast('Story created successfully.', 'success');
      }
      setIsCreateModalOpen(false);
      refetch();
    } catch {
      showToast('Failed to save story.', 'error');
    }
  };

  const handleTogglePublish = async (story: CommunityStory) => {
    const nextStatus: StoryStatus = story.status === 'PUBLISHED' ? 'UNPUBLISHED' : 'PUBLISHED';
    try {
      await togglePublishMutation.mutateAsync({ id: story.id, status: nextStatus });
      showToast(`Story marked as ${nextStatus.toLowerCase()}.`, 'success');
      refetch();
    } catch {
      showToast('Failed to update status.', 'error');
    }
  };

  const handleToggleFeatured = async (story: CommunityStory) => {
    try {
      await toggleFeaturedMutation.mutateAsync({ id: story.id, isFeatured: !story.isFeatured });
      showToast(story.isFeatured ? 'Removed from Featured Stories.' : 'Marked as Featured Story ⭐', 'success');
      refetch();
    } catch {
      showToast('Failed to update featured status.', 'error');
    }
  };

  const handleDelete = async (story: CommunityStory) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Delete Story Permanently?',
      message: `Permanently delete "${story.title}"? This cannot be undone.`,
      confirmText: 'Delete Story',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;

    try {
      await deleteMutation.mutateAsync(story.id);
      showToast('Story deleted.', 'success');
      refetch();
    } catch {
      showToast('Failed to delete story.', 'error');
    }
  };

  return (
    <AdminShell title="Our People Stories">
      <View style={s.container}>
        {/* KPI Metrics Strip */}
        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="book-open" size={16} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.totalCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Total Stories</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Feather name="check-circle" size={16} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.publishedCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Published & Live</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#FEF9C3' }]}>
              <Feather name="star" size={16} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.featuredCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Featured ⭐</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <Feather name="file-text" size={16} color="#64748B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.draftCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Drafts / Archived</Text>
            </View>
          </View>
        </View>

        {/* Search & Actions Toolbar */}
        <View style={s.toolbarCard}>
          <View style={s.searchBarRow}>
            <View style={{ flex: 1 }}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search stories by title, person, or category…"
              />
            </View>
            <TouchableOpacity style={s.createBtn} onPress={openCreateModal} activeOpacity={0.85}>
              <Feather name="plus" size={15} color="#FFF" />
              <Text style={s.createBtnText}>Write Story</Text>
            </TouchableOpacity>
          </View>

          <View style={s.tabRow}>
            {STATUS_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[s.tabBtn, activeTab === tab.id && s.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[s.tabBtnText, activeTab === tab.id && s.tabBtnTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content List / Table */}
        {isLoading ? (
          <LoadingOverlay />
        ) : filtered.length === 0 ? (
          <View style={s.cardWrapper}>
            <EmptyState message={`No ${activeTab.toLowerCase()} stories found.`} />
          </View>
        ) : isMobile ? (
          /* Mobile Card List */
          <View style={s.mobileListWrap}>
            {filtered.map((st) => {
              const isPublished = st.status === 'PUBLISHED';
              const catObj = STORY_CATEGORIES.find((c) => c.id === st.category);

              return (
                <View key={st.id} style={s.storyCard}>
                  {/* Image Cover */}
                  <View style={s.storyCoverWrap}>
                    <Image source={{ uri: st.featuredImage }} style={s.storyCoverImg} />
                    <View style={s.categoryBadge}>
                      <Text style={s.categoryBadgeText}>
                        {catObj?.emoji || '🌟'} {st.category}
                      </Text>
                    </View>
                    {st.isFeatured && (
                      <View style={s.featuredStarBadge}>
                        <Text style={s.featuredStarText}>⭐ Featured</Text>
                      </View>
                    )}
                  </View>

                  <View style={s.storyBody}>
                    <Text style={s.storyTitle} numberOfLines={2}>{st.title}</Text>

                    <View style={s.personMetaRow}>
                      <Ionicons name="person-circle-outline" size={16} color={C.accent} />
                      <Text style={s.personNameText} numberOfLines={1}>
                        {st.personName} · <Text style={{ color: C.textMuted }}>{st.profession}</Text>
                      </Text>
                    </View>

                    <Text style={s.storyShortDesc} numberOfLines={2}>
                      {st.shortDescription}
                    </Text>

                    <View style={s.storyMetaFooter}>
                      <Text style={s.storyReadTime}>⏱️ {st.readTimeMinutes} min read</Text>
                      <Text style={s.storyDate}>Published {fmtDate(st.publishedAt)}</Text>
                    </View>

                    {/* Actions Row */}
                    <View style={s.actionsRow}>
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: '#EFF6FF' }]}
                        onPress={() => openEditModal(st)}
                      >
                        <Feather name="edit-3" size={12} color="#1D4ED8" />
                        <Text style={[s.actionBtnText, { color: '#1D4ED8' }]}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: st.isFeatured ? '#FEF9C3' : C.bg }]}
                        onPress={() => handleToggleFeatured(st)}
                      >
                        <Feather name="star" size={12} color={st.isFeatured ? '#D97706' : C.textSecond} />
                        <Text style={[s.actionBtnText, { color: st.isFeatured ? '#D97706' : C.textSecond }]}>
                          {st.isFeatured ? 'Featured' : 'Feature'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: isPublished ? '#DCFCE7' : '#FEE2E2' }]}
                        onPress={() => handleTogglePublish(st)}
                      >
                        <Feather name={isPublished ? 'eye' : 'eye-off'} size={12} color={isPublished ? '#166534' : '#DC2626'} />
                        <Text style={[s.actionBtnText, { color: isPublished ? '#166534' : '#DC2626' }]}>
                          {isPublished ? 'Live' : 'Hidden'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: '#FEE2E2', width: 34, justifyContent: 'center' }]}
                        onPress={() => handleDelete(st)}
                      >
                        <Feather name="trash-2" size={12} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* Desktop Table View */
          <View style={s.cardWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 1040 }}>
                <View style={s.tableHeader}>
                  <Text style={[s.th, { width: 70 }]}>Cover</Text>
                  <Text style={[s.th, { width: 260 }]}>Story Title</Text>
                  <Text style={[s.th, { width: 180 }]}>Person / Hero</Text>
                  <Text style={[s.th, { width: 140 }]}>Category</Text>
                  <Text style={[s.th, { width: 90 }]}>Featured</Text>
                  <Text style={[s.th, { width: 100 }]}>Status</Text>
                  <Text style={[s.th, { width: 180 }]}>Actions</Text>
                </View>

                {filtered.map((st, i) => {
                  const isPublished = st.status === 'PUBLISHED';
                  const catObj = STORY_CATEGORIES.find((c) => c.id === st.category);

                  return (
                    <View key={st.id} style={[s.tableRow, i % 2 === 0 && { backgroundColor: C.rowEven }]}>
                      {/* Cover */}
                      <View style={[s.cell, { width: 70 }]}>
                        <Image source={{ uri: st.featuredImage }} style={s.tableCoverImg} />
                      </View>

                      {/* Title */}
                      <View style={[s.cell, { width: 260 }]}>
                        <Text style={s.tableTitle} numberOfLines={1}>{st.title}</Text>
                        <Text style={s.tableSub} numberOfLines={1}>{st.shortDescription}</Text>
                      </View>

                      {/* Person */}
                      <View style={[s.cell, { width: 180 }]}>
                        <Text style={s.tableTitle} numberOfLines={1}>{st.personName}</Text>
                        <Text style={s.tableSub} numberOfLines={1}>{st.profession} · {st.location}</Text>
                      </View>

                      {/* Category */}
                      <View style={[s.cell, { width: 140 }]}>
                        <Text style={s.tableSub}>{catObj?.emoji || '🌟'} {st.category}</Text>
                      </View>

                      {/* Featured */}
                      <View style={[s.cell, { width: 90 }]}>
                        {st.isFeatured ? (
                          <View style={s.featuredBadgeSmall}>
                            <Text style={s.featuredBadgeSmallText}>⭐ Yes</Text>
                          </View>
                        ) : (
                          <Text style={s.tableSub}>—</Text>
                        )}
                      </View>

                      {/* Status */}
                      <View style={[s.cell, { width: 100 }]}>
                        <View style={[s.statusPill, { backgroundColor: isPublished ? '#DCFCE7' : '#FEE2E2' }]}>
                          <Text style={[s.statusPillText, { color: isPublished ? '#166534' : '#DC2626' }]}>
                            {st.status}
                          </Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={[s.cell, { width: 180, flexDirection: 'row', gap: 6 }]}>
                        <TouchableOpacity
                          style={[s.iconActionBtn, { backgroundColor: '#EFF6FF' }]}
                          onPress={() => openEditModal(st)}
                        >
                          <Feather name="edit-3" size={13} color="#1D4ED8" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[s.iconActionBtn, { backgroundColor: st.isFeatured ? '#FEF9C3' : C.bg }]}
                          onPress={() => handleToggleFeatured(st)}
                        >
                          <Feather name="star" size={13} color={st.isFeatured ? '#D97706' : C.textSecond} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[s.iconActionBtn, { backgroundColor: isPublished ? '#DCFCE7' : '#FEE2E2' }]}
                          onPress={() => handleTogglePublish(st)}
                        >
                          <Feather name={isPublished ? 'eye' : 'eye-off'} size={13} color={isPublished ? '#166534' : '#DC2626'} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[s.iconActionBtn, { backgroundColor: '#FEE2E2' }]}
                          onPress={() => handleDelete(st)}
                        >
                          <Feather name="trash-2" size={13} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Create / Edit Story Modal ────────────────────────────────────────── */}
        <Modal visible={isCreateModalOpen} transparent animationType="fade" onRequestClose={() => setIsCreateModalOpen(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editingStory ? 'Edit Community Story' : 'Write Community Story'}</Text>
                <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                  <Feather name="x" size={20} color={C.textSecond} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {/* Form Fields */}
                <View style={s.formGroup}>
                  <Text style={s.formLabel}>Story Headline / Title *</Text>
                  <TextInput
                    style={s.formInput}
                    placeholder="e.g. From a Small Village to Building a Successful Tech Enterprise"
                    placeholderTextColor={C.textMuted}
                    value={form.title}
                    onChangeText={(t) => setForm((p) => ({ ...p, title: t }))}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[s.formGroup, { flex: 1 }]}>
                    <Text style={s.formLabel}>Person Name *</Text>
                    <TextInput
                      style={s.formInput}
                      placeholder="e.g. Ramesh Gowda"
                      placeholderTextColor={C.textMuted}
                      value={form.personName}
                      onChangeText={(t) => setForm((p) => ({ ...p, personName: t }))}
                    />
                  </View>
                  <View style={[s.formGroup, { flex: 1 }]}>
                    <Text style={s.formLabel}>Profession / Role *</Text>
                    <TextInput
                      style={s.formInput}
                      placeholder="e.g. Entrepreneur · Founder"
                      placeholderTextColor={C.textMuted}
                      value={form.profession}
                      onChangeText={(t) => setForm((p) => ({ ...p, profession: t }))}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[s.formGroup, { flex: 1 }]}>
                    <Text style={s.formLabel}>Location / Origin *</Text>
                    <TextInput
                      style={s.formInput}
                      placeholder="e.g. Bengaluru, Mandya"
                      placeholderTextColor={C.textMuted}
                      value={form.location}
                      onChangeText={(t) => setForm((p) => ({ ...p, location: t }))}
                    />
                  </View>
                  <View style={[s.formGroup, { flex: 1 }]}>
                    <Text style={s.formLabel}>Category *</Text>
                    <View style={s.categorySelectWrap}>
                      <Text style={s.categorySelectText}>{form.category}</Text>
                    </View>
                  </View>
                </View>

                {/* Category Chips */}
                <View style={s.categoryChipsRow}>
                  {STORY_CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[s.categoryChip, form.category === c.id && s.categoryChipActive]}
                      onPress={() => setForm((p) => ({ ...p, category: c.id }))}
                    >
                      <Text style={[s.categoryChipText, form.category === c.id && s.categoryChipTextActive]}>
                        {c.emoji} {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={s.formGroup}>
                  <Text style={s.formLabel}>Short Summary / Lead (1-2 sentences) *</Text>
                  <TextInput
                    style={[s.formInput, { minHeight: 56 }]}
                    placeholder="Brief highlight that captures the reader's attention on the story card..."
                    placeholderTextColor={C.textMuted}
                    value={form.shortDescription}
                    onChangeText={(t) => setForm((p) => ({ ...p, shortDescription: t }))}
                    multiline
                  />
                </View>

                <View style={s.formGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.formLabel}>Full Story Article *</Text>
                    <Text style={s.wordCountText}>{form.fullStory.split(/\s+/).filter(Boolean).length} words</Text>
                  </View>
                  <TextInput
                    style={[s.formInput, { minHeight: 120 }]}
                    placeholder="Write the complete journey, milestones, challenges overcome, and words of inspiration..."
                    placeholderTextColor={C.textMuted}
                    value={form.fullStory}
                    onChangeText={(t) => setForm((p) => ({ ...p, fullStory: t }))}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <View style={s.formGroup}>
                  <Text style={s.formLabel}>Featured Cover Image URL *</Text>
                  <TextInput
                    style={s.formInput}
                    placeholder="https://..."
                    placeholderTextColor={C.textMuted}
                    value={form.featuredImage}
                    onChangeText={(t) => setForm((p) => ({ ...p, featuredImage: t }))}
                  />
                </View>

                {/* Feature switch */}
                <View style={s.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.switchTitle}>Feature in "Our People" Top Showcase </Text>
                    <Text style={s.switchSub}>Hero banner display at the top of the magazine section.</Text>
                  </View>
                  <Switch
                    value={form.isFeatured}
                    onValueChange={(v) => setForm((p) => ({ ...p, isFeatured: v }))}
                    trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
                    thumbColor={form.isFeatured ? '#16A34A' : '#F8FAFC'}
                  />
                </View>

                {/* Submit button */}
                <View style={s.modalActionsRow}>
                  <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.bg }]} onPress={() => setIsCreateModalOpen(false)}>
                    <Text style={[s.modalBtnText, { color: C.textSecond }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.accent }]} onPress={handleSaveStory}>
                    <Text style={[s.modalBtnText, { color: '#FFF' }]}>{editingStory ? 'Save Changes' : 'Publish Story'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  container: { gap: 12, paddingBottom: 24 },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8,
  },
  statBox: {
    width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.white, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  statIconWrap: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statNumber: { fontSize: 17, fontWeight: '800', color: C.textPrimary, lineHeight: 20 },
  statLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, marginTop: 1 },

  // Toolbar
  toolbarCard: {
    backgroundColor: C.white, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: C.border, gap: 8,
  },
  searchBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.accent, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 8,
  },
  createBtnText: { color: '#FFF', fontSize: 12.5, fontWeight: '700' },

  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tabBtn: {
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.bg,
  },
  tabBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  tabBtnText: { fontSize: 11.5, fontWeight: '600', color: C.textSecond },
  tabBtnTextActive: { color: '#FFF' },

  // Mobile List
  mobileListWrap: { gap: 10 },
  storyCard: {
    backgroundColor: C.white, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  storyCoverWrap: { height: 130, position: 'relative', backgroundColor: '#E2E8F0' },
  storyCoverImg: { width: '100%', height: '100%' },
  categoryBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  categoryBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  featuredStarBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#FEF9C3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  featuredStarText: { color: '#A16207', fontSize: 11, fontWeight: '800' },

  storyBody: { padding: 12, gap: 6 },
  storyTitle: { fontSize: 14.5, fontWeight: '800', color: C.textPrimary, lineHeight: 19 },
  personMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  personNameText: { fontSize: 12, fontWeight: '700', color: C.textPrimary },
  storyShortDesc: { fontSize: 12, color: C.textSecond, lineHeight: 16 },

  storyMetaFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 4,
  },
  storyReadTime: { fontSize: 11, color: C.textMuted },
  storyDate: { fontSize: 11, color: C.textMuted },

  actionsRow: { flexDirection: 'row', gap: 6, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 6, borderRadius: 6,
  },
  actionBtnText: { fontSize: 11, fontWeight: '700' },

  // Desktop Table
  cardWrapper: {
    backgroundColor: C.white, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.headerBg,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: C.border,
  },
  th: { color: C.textSecond, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingRight: 8 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white,
  },
  cell: { paddingRight: 8, justifyContent: 'center' },
  tableCoverImg: { width: 50, height: 35, borderRadius: 6 },
  tableTitle: { fontSize: 12.5, fontWeight: '700', color: C.textPrimary },
  tableSub: { fontSize: 11, color: C.textMuted },
  statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 10.5, fontWeight: '700' },
  featuredBadgeSmall: { backgroundColor: '#FEF9C3', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  featuredBadgeSmallText: { color: '#A16207', fontSize: 10.5, fontWeight: '800' },
  iconActionBtn: {
    width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalBox: { backgroundColor: C.white, borderRadius: 16, padding: 18, width: '100%', maxWidth: 560, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary },

  formGroup: { gap: 3 },
  formLabel: { fontSize: 12, fontWeight: '700', color: C.textPrimary },
  formInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 12.5,
    color: C.textPrimary, backgroundColor: C.bg,
  },
  categorySelectWrap: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.bg,
  },
  categorySelectText: { fontSize: 12.5, fontWeight: '600', color: C.textPrimary },
  categoryChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChip: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.bg,
  },
  categoryChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  categoryChipText: { fontSize: 11, color: C.textSecond, fontWeight: '600' },
  categoryChipTextActive: { color: '#FFF' },

  wordCountText: { fontSize: 11, color: C.textMuted },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.bg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border,
  },
  switchTitle: { fontSize: 12.5, fontWeight: '700', color: C.textPrimary },
  switchSub: { fontSize: 11, color: C.textMuted },

  modalActionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 13, fontWeight: '700' },
});
