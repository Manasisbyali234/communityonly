import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import {
  useJobQuery,
  useCheckAppliedQuery,
  useApplyJobMutation,
  useCompanyJobsQuery,
  uploadResume,
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
  Job,
} from '../../api/jobs';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useConfirmStore } from '../../store/confirmStore';
import { useToastStore } from '../../store/toastStore';
import { shareUrl } from '../../utils/shareUtils';
import Button from '../../components/common/Button';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark, palette } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const showToast = useToastStore((state) => state.showToast);
  const confirm = useConfirmStore((state) => state.confirm);

  const { data: job, isLoading } = useJobQuery(id);
  const { data: appliedData } = useCheckAppliedQuery(id);
  const applyMutation = useApplyJobMutation();
  const hasApplied = appliedData?.applied ?? false;

  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeFile, setResumeFile] = useState<{ uri: string; name: string; mimeType: string; size?: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Other jobs from the same company
  const { data: companyJobs = [] } = useCompanyJobsQuery(job?.companyName || '');
  const otherJobs = useMemo(() => {
    return companyJobs.filter((j) => j.id !== id).slice(0, 3);
  }, [companyJobs, id]);

  const daysLeft = useMemo(() => {
    if (!job?.lastDate) return null;
    const deadline = new Date(job.lastDate);
    deadline.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [job?.lastDate]);

  const pickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setResumeFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/pdf',
        size: asset.size,
      });
    } catch {
      showToast('Failed to pick document. Please try again.', 'error');
    }
  };

  const handleShare = async () => {
    if (!job) return;
    const link = `https://gowdacommunity.com/jobs/${job.id}`;
    const message = `Check out this job opening on GowdaCommunity:\n${job.jobTitle} at ${job.companyName}\nLocation: ${job.location}\nSalary: ${job.salaryLPA}\n\nApply here: ${link}`;
    const ok = await shareUrl(message, link);
    showToast(ok ? 'Job link copied to clipboard!' : 'Could not share job', ok ? 'success' : 'error');
  };

  const handleToggleSave = () => {
    setIsSaved((prev) => !prev);
  };

  const handleApply = () => {
    if (isApplicationClosed) {
      showToast('Applications for this position are closed.', 'error');
      return;
    }
    if (!user) {
      router.push('/(auth)/login' as any);
      return;
    }
    setShowResumeModal(true);
  };

  const submitApplication = async () => {
    if (isApplicationClosed) {
      setShowResumeModal(false);
      showToast('Applications for this position are closed.', 'error');
      return;
    }
    if (!resumeFile) {
      showToast('Please upload your resume to apply.', 'error');
      return;
    }

    const ok = await confirm({
      title: 'Submit application?',
      message: `Your resume and profile will be submitted to ${job?.companyName || 'the employer'}.`,
      confirmText: 'Submit',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'briefcase-outline',
    });
    if (!ok) return;

    try {
      setUploading(true);
      const resumeUrl = await uploadResume(resumeFile.uri, resumeFile.name, resumeFile.mimeType);
      await applyMutation.mutateAsync({ jobId: id, resumeUrl });
      setShowResumeModal(false);
      setResumeFile(null);
    } catch (e: any) {
      showToast(e.response?.data?.message ?? 'Failed to apply. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleEmailHR = (email: string) => {
    Linking.openURL(`mailto:${email}?subject=Application for ${job?.jobTitle || 'Job Opening'}`);
  };

  const handleCallHR = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.navbar, { borderBottomColor: colors.borderSecondary }]}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
            style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceSecondary }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Job Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.navbar, { borderBottomColor: colors.borderSecondary }]}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
            style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceSecondary }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Job Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="briefcase-outline" size={54} color={colors.textMuted} />
          <Text style={[styles.notFoundTitle, { color: colors.text }]}>Job Opening Not Found</Text>
          <Text style={[styles.notFoundSub, { color: colors.textSecondary }]}>
            This position may have been closed or removed by the employer.
          </Text>
          <Button
            title="Browse All Jobs"
            variant="primary"
            size="md"
            onPress={() => router.replace('/jobs' as any)}
            style={{ marginTop: 16 }}
          />
        </View>
      </View>
    );
  }

  const isApplicationClosed = job.status === 'CLOSED' || (daysLeft !== null && daysLeft < 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top Navbar */}
      <View
        style={[
          styles.navbar,
          {
            backgroundColor: colors.cardBg,
            borderBottomColor: colors.borderSecondary,
            paddingTop: insets.top > 0 ? insets.top + 6 : 14,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
          style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: colors.text }]} numberOfLines={1}>
          {job.companyName}
        </Text>

        <View style={styles.navActions}>
          <TouchableOpacity
            onPress={handleToggleSave}
            style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}
            accessibilityLabel={isSaved ? 'Remove from bookmarks' : 'Bookmark job'}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={19}
              color={isSaved ? colors.primary : colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}
            accessibilityLabel="Share job"
          >
            <Ionicons name="share-social-outline" size={19} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.cardBg,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            },
          ]}
        >
          {/* Status badge and Posted date */}
          <View style={styles.heroTopRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isApplicationClosed
                    ? isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2'
                    : isDark ? 'rgba(45, 106, 45, 0.2)' : (colors.primaryContainer || '#E8F5E9'),
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isApplicationClosed ? '#DC2626' : colors.primary },
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isApplicationClosed ? '#DC2626' : colors.primary },
                ]}
              >
                {isApplicationClosed ? 'Applications Closed' : 'Actively Hiring'}
              </Text>
            </View>

            {job.createdAt ? (
              <Text style={[styles.postedTime, { color: colors.textMuted }]}>
                Posted {formatRelativeTime(job.createdAt)}
              </Text>
            ) : null}
          </View>

          {/* Company Logo & Job Title */}
          <View style={styles.companyHeaderRow}>
            {job.companyLogo ? (
              <Image source={{ uri: job.companyLogo }} style={styles.companyLogo} contentFit="contain" />
            ) : (
              <View style={[styles.companyLogoFallback, { backgroundColor: isDark ? 'rgba(45, 106, 45, 0.3)' : (colors.primaryContainer || '#E8F5E9') }]}>
                <Ionicons name="business" size={28} color={colors.primary} />
              </View>
            )}

            <View style={styles.titleWrap}>
              <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={2}>
                {job.jobTitle}
              </Text>
              <View style={styles.companyNameWrap}>
                <Text style={[styles.companyName, { color: colors.textSecondary }]}>
                  {job.companyName}
                </Text>
                <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
              </View>
            </View>
          </View>

          {/* Salary Highlight Banner */}
          <View
            style={[
              styles.salaryBanner,
              {
                backgroundColor: isDark ? 'rgba(45, 106, 45, 0.15)' : '#F4F9F4',
                borderColor: isDark ? 'rgba(76, 175, 80, 0.3)' : '#C8E6C9',
              },
            ]}
          >
            <View style={styles.salaryInfo}>
              <Text style={[styles.salaryLabel, { color: colors.primary }]}>OFFERED SALARY</Text>
              <Text style={[styles.salaryValue, { color: colors.text }]}>{job.salaryLPA}</Text>
            </View>
            <View style={[styles.salaryBadge, { backgroundColor: isDark ? 'rgba(45, 106, 45, 0.3)' : colors.primary }]}>
              <Ionicons name="cash-outline" size={16} color="#FFFFFF" />
              <Text style={styles.salaryBadgeText}>Annual CTC</Text>
            </View>
          </View>
        </View>

        {/* Quick Highlights 4-Grid */}
        <View style={styles.gridSection}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Job Overview</Text>
          <View style={styles.gridContainer}>
            <OverviewCard
              icon="briefcase-outline"
              label="Job Type"
              value={EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType}
              iconColor="#4F46E5"
              iconBg={isDark ? 'rgba(79, 70, 229, 0.18)' : '#EEF2FF'}
              colors={colors}
              isDark={isDark}
            />

            <OverviewCard
              icon="laptop-outline"
              label="Work Mode"
              value={WORK_MODE_LABELS[job.workMode] || job.workMode}
              iconColor="#9333EA"
              iconBg={isDark ? 'rgba(147, 51, 234, 0.18)' : '#FAF5FF'}
              colors={colors}
              isDark={isDark}
            />

            <OverviewCard
              icon="time-outline"
              label="Experience"
              value={job.experience}
              iconColor="#D97706"
              iconBg={isDark ? 'rgba(217, 119, 6, 0.18)' : '#FFFBEB'}
              colors={colors}
              isDark={isDark}
            />

            <OverviewCard
              icon="location-outline"
              label="Location"
              value={job.location}
              iconColor="#059669"
              iconBg={isDark ? 'rgba(5, 150, 105, 0.18)' : '#ECFDF5'}
              colors={colors}
              isDark={isDark}
            />

            {job.education ? (
              <OverviewCard
                icon="school-outline"
                label="Education"
                value={job.education}
                iconColor="#EA580C"
                iconBg={isDark ? 'rgba(234, 88, 12, 0.18)' : '#FFF7ED'}
                colors={colors}
                isDark={isDark}
              />
            ) : null}

            <OverviewCard
              icon="people-outline"
              label="Vacancies"
              value={`${job.vacancyCount} Openings • ${job.applyCount} Applied`}
              iconColor="#0284C7"
              iconBg={isDark ? 'rgba(2, 132, 199, 0.18)' : '#F0F9FF'}
              colors={colors}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Required Skills */}
        {job.requiredSkills && job.requiredSkills.length > 0 ? (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrap, { backgroundColor: isDark ? 'rgba(45, 106, 45, 0.2)' : (colors.primaryContainer || '#E8F5E9') }]}>
                <Ionicons name="code-slash" size={17} color={colors.primary} />
              </View>
              <Text style={[styles.sectionCardTitle, { color: colors.text }]}>Required Skills</Text>
              <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                <Text style={[styles.countBadgeText, { color: colors.textSecondary }]}>
                  {job.requiredSkills.length}
                </Text>
              </View>
            </View>

            <View style={styles.skillsWrap}>
              {job.requiredSkills.map((skill) => (
                <View
                  key={skill}
                  style={[
                    styles.skillPill,
                    {
                      backgroundColor: isDark ? 'rgba(45, 106, 45, 0.15)' : '#F4F9F4',
                      borderColor: isDark ? 'rgba(76, 175, 80, 0.25)' : '#D1E7D1',
                    },
                  ]}
                >
                  <Ionicons name="checkmark-circle-outline" size={13} color={colors.primary} />
                  <Text style={[styles.skillPillText, { color: colors.text }]}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Job Description */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.cardBg,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: isDark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF' }]}>
              <Ionicons name="document-text-outline" size={17} color="#4F46E5" />
            </View>
            <Text style={[styles.sectionCardTitle, { color: colors.text }]}>Job Description</Text>
          </View>

          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
            {job.description}
          </Text>
        </View>

        {/* Office Address */}
        {job.address ? (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrap, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5' }]}>
                <Ionicons name="navigate-outline" size={17} color="#059669" />
              </View>
              <Text style={[styles.sectionCardTitle, { color: colors.text }]}>Office Location</Text>
            </View>

            <View style={styles.addressRow}>
              <Ionicons name="location-sharp" size={18} color="#059669" style={{ marginTop: 2 }} />
              <Text style={[styles.addressText, { color: colors.text }]}>{job.address}</Text>
            </View>
          </View>
        ) : null}

        {/* HR & Recruiter Contact */}
        {job.hrContact || job.hrEmail ? (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrap, { backgroundColor: isDark ? 'rgba(147, 51, 234, 0.2)' : '#FAF5FF' }]}>
                <Ionicons name="person-circle-outline" size={17} color="#9333EA" />
              </View>
              <Text style={[styles.sectionCardTitle, { color: colors.text }]}>Hiring & Recruiter Contact</Text>
            </View>

            <View style={styles.hrContentBox}>
              <View style={styles.hrDetails}>
                {job.hrContact ? (
                  <View style={styles.hrItem}>
                    <Ionicons name="person-outline" size={15} color={colors.textMuted} />
                    <Text style={[styles.hrItemText, { color: colors.text }]}>{job.hrContact}</Text>
                  </View>
                ) : null}

                {job.hrEmail ? (
                  <View style={styles.hrItem}>
                    <Ionicons name="mail-outline" size={15} color={colors.textMuted} />
                    <Text style={[styles.hrItemText, { color: colors.text }]}>{job.hrEmail}</Text>
                  </View>
                ) : null}
              </View>

              {job.hrEmail ? (
                <TouchableOpacity
                  style={[styles.hrContactBtn, { backgroundColor: isDark ? 'rgba(147, 51, 234, 0.25)' : '#F3E8FF' }]}
                  onPress={() => handleEmailHR(job.hrEmail!)}
                >
                  <Ionicons name="mail" size={16} color="#9333EA" />
                  <Text style={[styles.hrContactBtnText, { color: '#9333EA' }]}>Email Recruiter</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Application Deadline */}
        {job.lastDate ? (
          <View
            style={[
              styles.deadlineContainer,
              {
                backgroundColor: daysLeft !== null && daysLeft <= 5
                  ? (isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7')
                  : (isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB'),
                borderColor: daysLeft !== null && daysLeft <= 5
                  ? (isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A')
                  : colors.border,
              },
            ]}
          >
            <View style={styles.deadlineLeft}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={daysLeft !== null && daysLeft <= 5 ? '#D97706' : colors.primary}
              />
              <View>
                <Text style={[styles.deadlineLabel, { color: colors.textSecondary }]}>
                  Last Date to Apply
                </Text>
                <Text style={[styles.deadlineDate, { color: colors.text }]}>
                  {new Date(job.lastDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            {daysLeft !== null ? (
              <View
                style={[
                  styles.daysLeftBadge,
                  {
                    backgroundColor: daysLeft < 0
                      ? '#FEE2E2'
                      : daysLeft <= 5
                      ? '#FEF3C7'
                      : (isDark ? 'rgba(45, 106, 45, 0.2)' : '#DCFCE7'),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.daysLeftText,
                    {
                      color: daysLeft < 0 ? '#DC2626' : daysLeft <= 5 ? '#B45309' : '#15803D',
                    },
                  ]}
                >
                  {daysLeft < 0 ? 'Ended' : daysLeft === 0 ? 'Last day' : `${daysLeft}d left`}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* More Jobs From This Company */}
        {otherJobs.length > 0 ? (
          <View style={styles.otherJobsSection}>
            <View style={styles.otherJobsHeader}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                More from {job.companyName}
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {otherJobs.map((otherJob) => (
                <TouchableOpacity
                  key={otherJob.id}
                  style={[
                    styles.otherJobCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                    },
                  ]}
                  onPress={() => router.push(`/jobs/${otherJob.id}` as any)}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.otherJobTitle, { color: colors.text }]} numberOfLines={1}>
                      {otherJob.jobTitle}
                    </Text>
                    <Text style={[styles.otherJobMeta, { color: colors.textMuted }]}>
                      {otherJob.location} • {EMPLOYMENT_TYPE_LABELS[otherJob.employmentType] || otherJob.employmentType}
                    </Text>
                  </View>
                  <Text style={[styles.otherJobSalary, { color: colors.primary }]}>
                    {otherJob.salaryLPA}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.cardBg,
            borderTopColor: colors.borderSecondary,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 16,
          },
        ]}
      >
        {hasApplied ? (
          <View
            style={[
              styles.appliedBanner,
              {
                backgroundColor: isDark ? 'rgba(45, 106, 45, 0.2)' : '#DCFCE7',
                borderColor: isDark ? 'rgba(76, 175, 80, 0.4)' : '#86EFAC',
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.appliedTitle, { color: '#16A34A' }]}>Application Submitted</Text>
              <Text style={[styles.appliedSub, { color: isDark ? '#A7F3D0' : '#15803D' }]}>
                Under review by {job.companyName}
              </Text>
            </View>
          </View>
        ) : isApplicationClosed ? (
          <View
            style={[
              styles.primaryApplyBtn,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                borderWidth: 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel="Application closed"
          >
            <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
            <Text style={styles.closedBannerText}>Application Closed</Text>
          </View>
        ) : (
          <View style={styles.applyBtnRow}>
            <TouchableOpacity
              style={[
                styles.secondaryShareBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
                  borderColor: colors.border,
                },
              ]}
              onPress={handleShare}
              accessibilityLabel="Share this job"
            >
              <Ionicons name="share-outline" size={20} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryApplyBtn,
                {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={handleApply}
              activeOpacity={0.85}
              accessibilityLabel="Apply for this position"
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
              <Text style={styles.primaryApplyBtnText}>Apply for this Position</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Resume Upload BottomSheet Modal */}
      <Modal
        visible={showResumeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResumeModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowResumeModal(false)}>
          <Pressable
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.cardBg,
                paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: isDark ? 'rgba(45, 106, 45, 0.2)' : (colors.primaryContainer || '#E8F5E9') }]}>
                <Ionicons name="document-attach" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Apply with Resume</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {job.jobTitle} • {job.companyName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowResumeModal(false)}
                style={styles.modalCloseBtn}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* File Upload Box */}
            <TouchableOpacity
              style={[
                styles.filePickerBox,
                {
                  backgroundColor: resumeFile
                    ? isDark ? 'rgba(45, 106, 45, 0.15)' : '#F4F9F4'
                    : isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB',
                  borderColor: resumeFile ? colors.primary : colors.border,
                },
              ]}
              onPress={pickResume}
              activeOpacity={0.75}
            >
              {resumeFile ? (
                <View style={styles.fileSelectedRow}>
                  <View style={[styles.fileIconBox, { backgroundColor: colors.primary }]}>
                    <Ionicons name="document-text" size={24} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectedFileName, { color: colors.text }]} numberOfLines={1}>
                      {resumeFile.name}
                    </Text>
                    <Text style={[styles.selectedFileMeta, { color: colors.primary }]}>
                      Ready to submit • Tap to replace
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                </View>
              ) : (
                <View style={styles.fileEmptyContent}>
                  <View style={[styles.uploadIconCircle, { backgroundColor: isDark ? 'rgba(45, 106, 45, 0.2)' : (colors.primaryContainer || '#E8F5E9') }]}>
                    <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
                  </View>
                  <Text style={[styles.uploadPrompt, { color: colors.text }]}>
                    Upload your resume
                  </Text>
                  <Text style={[styles.uploadFormats, { color: colors.textMuted }]}>
                    Supports PDF, DOC, DOCX • Up to 5 MB
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Privacy notice note */}
            <View
              style={[
                styles.noticeCard,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6',
                  borderColor: colors.borderSecondary,
                },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                Your resume & contact details will be shared directly with the recruiter at {job.companyName}.
              </Text>
            </View>

            {/* Action buttons */}
            <Button
              title="Submit Application"
              icon="send"
              variant="primary"
              size="lg"
              fullWidth
              loading={uploading}
              disabled={!resumeFile || uploading}
              onPress={submitApplication}
              style={{ marginBottom: 8 }}
            />

            <Button
              title="Cancel"
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => {
                setShowResumeModal(false);
                setResumeFile(null);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  iconColor,
  iconBg,
  colors,
  isDark,
}: {
  icon: any;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View
      style={[
        styles.gridCard,
        {
          backgroundColor: colors.cardBg,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
        },
      ]}
    >
      <View style={[styles.gridIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.gridLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.gridValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  notFoundSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Navbar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Scroll Content
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // Hero Card
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  postedTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  companyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  companyLogo: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  companyLogoFallback: {
    width: 58,
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  companyNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  companyName: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  salaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  salaryInfo: {
    flex: 1,
  },
  salaryLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  salaryValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  salaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  salaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Grid Section
  gridSection: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: '48.5%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1.5,
      },
      default: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  gridIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  gridValue: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
  },

  // Section Card
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCardTitle: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Skills
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  skillPillText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Description
  descriptionText: {
    fontSize: 14.5,
    lineHeight: 23,
    letterSpacing: 0.1,
  },

  // Address
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  // HR Contact
  hrContentBox: {
    gap: 12,
  },
  hrDetails: {
    gap: 8,
  },
  hrItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hrItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hrContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  hrContactBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Deadline
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  deadlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deadlineLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  deadlineDate: {
    fontSize: 14,
    fontWeight: '700',
  },
  daysLeftBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  daysLeftText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Other Jobs Section
  otherJobsSection: {
    marginTop: 6,
    gap: 12,
  },
  otherJobsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  otherJobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  otherJobTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  otherJobMeta: {
    fontSize: 12,
  },
  otherJobSalary: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Bottom Floating Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: '0 -4px 14px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  applyBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryShareBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryApplyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  appliedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  appliedTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  appliedSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  closedBannerText: {
    color: '#DC2626',
    fontSize: 13.5,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  modalIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalCloseBtn: {
    padding: 6,
  },

  // File Picker
  filePickerBox: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 20,
    marginBottom: 16,
  },
  fileEmptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadPrompt: {
    fontSize: 15,
    fontWeight: '700',
  },
  uploadFormats: {
    fontSize: 12,
    fontWeight: '500',
  },
  fileSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedFileName: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  selectedFileMeta: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Notice Card
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
});
