import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, ScrollView, Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { SearchBar, SectionCard, Skeleton, EmptyState, Pagination, ActionBtn, TableRow, T, COL, MobileCard, MobileCardRow, useIsMobile } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { fmtDateTime } from '../../utils/adminUtils';
import { useConfirmStore } from '../../store/confirmStore';

const COLS: { label: string; style: object }[] = [
  { label: 'User',     style: COL.user },
  { label: 'Caption',  style: COL.xl   },
  { label: 'Media',    style: COL.xs   },
  { label: 'Likes',    style: COL.xs   },
  { label: 'Comments', style: COL.xs   },
  { label: 'Shares',   style: COL.xs   },
  { label: 'Date',     style: COL.md   },
  { label: 'Actions',  style: COL.act  },
];

export default function AdminFeeds() {
  const isMobile = useIsMobile();
  const [feeds, setFeeds] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiClient.get('/admin-panel/feeds', { params: { skip, take: 20, q: q || undefined } });
      setFeeds(res.data.data.feeds);
      setTotal(res.data.data.total);
    } catch {}
    setLoading(false);
  }, [skip, q]);

  useEffect(() => { setSkip(0); }, [q]);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const del = async (id: string) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Delete feed post?',
      message: 'This action will permanently delete this post and cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;
    try {
      await adminApiClient.delete(`/admin-panel/feeds/${id}`);
      load();
    } catch (e: any) {
      console.error('Failed to delete feed', e);
    }
  };

  return (
    <AdminShell title="Feeds">
      <SectionCard>
        <View style={T.toolbar}>
          <SearchBar value={q} onChangeText={setQ} placeholder="Search feeds…" />
        </View>

        {isMobile ? (
          <View style={{ padding: 12 }}>
            {loading ? <Skeleton rows={6} /> : feeds.length === 0 ? <EmptyState /> : (
              feeds.map((f) => (
                <MobileCard key={f.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <View style={T.avatar}>
                      {f.author?.avatarUrl
                        ? <Image source={{ uri: f.author.avatarUrl }} style={T.avatarImg} />
                        : <Text style={T.avatarFallback}>{f.author?.displayName?.[0]?.toUpperCase()}</Text>
                      }
                    </View>
                    <Text style={[T.cellPrimary, { flex: 1 }]}>{f.author?.displayName}</Text>
                    {f.mediaUrls?.[0] && (
                      <Image source={{ uri: f.mediaUrls[0] }} style={{ width: 44, height: 44, borderRadius: 6 }} />
                    )}
                  </View>
                  <MobileCardRow label="Caption"><Text style={T.td} numberOfLines={3}>{f.content}</Text></MobileCardRow>
                  <MobileCardRow label="Engagement">
                    <Text style={T.td}>❤️ {f.likesCount} · 💬 {f.commentsCount} · 🔁 {f.sharesCount}</Text>
                  </MobileCardRow>
                  <MobileCardRow label="Date"><Text style={T.tdMuted}>{fmtDateTime(f.createdAt)}</Text></MobileCardRow>
                  <View style={{ marginTop: 6 }}>
                    <ActionBtn label="Delete" onPress={() => del(f.id)} variant="danger" />
                  </View>
                </MobileCard>
              ))
            )}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 920 }}>
              <View style={T.header}>
                {COLS.map((h) => (
                  <Text key={h.label} style={[T.th, h.style]}>{h.label}</Text>
                ))}
              </View>
              {loading ? <Skeleton rows={8} /> : feeds.length === 0 ? <EmptyState /> : (
                feeds.map((f, i) => (
                  <TableRow key={f.id} even={i % 2 === 0}>
                    <View style={[T.td, COL.user, { flexDirection: 'row', alignItems: 'center' }]}>
                      <View style={T.avatar}>
                        {f.author?.avatarUrl
                          ? <Image source={{ uri: f.author.avatarUrl }} style={T.avatarImg} />
                          : <Text style={T.avatarFallback}>{f.author?.displayName?.[0]?.toUpperCase()}</Text>
                        }
                      </View>
                      <Text style={T.cellPrimary} numberOfLines={1}>{f.author?.displayName}</Text>
                    </View>
                    <Text style={[T.td, COL.xl]} numberOfLines={2}>{f.content}</Text>
                    <View style={[T.td, COL.xs]}>
                      {f.mediaUrls?.[0]
                        ? <Image source={{ uri: f.mediaUrls[0] }} style={{ width: 40, height: 40, borderRadius: 6 }} />
                        : <Text style={T.tdMuted}>{f.videoUrl ? '🎥' : '—'}</Text>
                      }
                    </View>
                    <Text style={[T.td, COL.xs]}>{f.likesCount}</Text>
                    <Text style={[T.td, COL.xs]}>{f.commentsCount}</Text>
                    <Text style={[T.td, COL.xs]}>{f.sharesCount}</Text>
                    <Text style={[T.tdMuted, COL.md]} numberOfLines={1}>{fmtDateTime(f.createdAt)}</Text>
                    <View style={[T.td, COL.act]}>
                      <ActionBtn label="Delete" onPress={() => del(f.id)} variant="danger" />
                    </View>
                  </TableRow>
                ))
              )}
            </View>
          </ScrollView>
        )}
        <Pagination skip={skip} take={20} total={total} onPage={setSkip} />
      </SectionCard>
    </AdminShell>
  );
}
