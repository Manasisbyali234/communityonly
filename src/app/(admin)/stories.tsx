import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, ScrollView, Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { SearchBar, SectionCard, Skeleton, EmptyState, Pagination, ActionBtn, Badge, TableRow, T, COL, MobileCard, MobileCardRow, useIsMobile } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { fmtDateTime } from '../../utils/adminUtils';
import { useConfirmStore } from '../../store/confirmStore';

const COLS: { label: string; style: object }[] = [
  { label: 'Preview',  style: COL.xs  },
  { label: 'User',     style: COL.user },
  { label: 'Type',     style: COL.sm  },
  { label: 'Views',    style: COL.xs  },
  { label: 'Likes',    style: COL.xs  },
  { label: 'Uploaded', style: COL.md  },
  { label: 'Expires',  style: COL.md  },
  { label: 'Status',   style: COL.sm  },
  { label: 'Actions',  style: COL.act },
];

export default function AdminStories() {
  const isMobile = useIsMobile();
  const [stories, setStories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiClient.get('/admin-panel/stories', { params: { skip, take: 20, q: q || undefined } });
      setStories(res.data.data.stories);
      setTotal(res.data.data.total);
    } catch {}
    setLoading(false);
  }, [skip, q]);

  useEffect(() => { setSkip(0); }, [q]);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const del = async (id: string) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Delete story?',
      message: 'This will permanently remove this story.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;
    try {
      await adminApiClient.delete(`/admin-panel/stories/${id}`);
      load();
    } catch (e: any) {
      console.error('Failed to delete story', e);
    }
  };

  return (
    <AdminShell title="Stories">
      <SectionCard>
        <View style={T.toolbar}>
          <SearchBar value={q} onChangeText={setQ} placeholder="Search by user…" />
        </View>

        {isMobile ? (
          <View style={{ padding: 12 }}>
            {loading ? <Skeleton rows={6} /> : stories.length === 0 ? <EmptyState /> : (
              stories.map((s) => {
                const expired = new Date(s.expiresAt) < new Date();
                return (
                  <MobileCard key={s.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      {s.mediaType === 'IMAGE'
                        ? <Image source={{ uri: s.mediaUrl }} style={{ width: 44, height: 58, borderRadius: 6, marginRight: 10 }} />
                        : <View style={{ width: 44, height: 58, borderRadius: 6, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                            <Text>🎥</Text>
                          </View>
                      }
                      <View style={T.avatar}>
                        {s.author?.avatarUrl
                          ? <Image source={{ uri: s.author.avatarUrl }} style={T.avatarImg} />
                          : <Text style={T.avatarFallback}>{s.author?.displayName?.[0]?.toUpperCase()}</Text>
                        }
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={T.cellPrimary}>{s.author?.displayName}</Text>
                        <Badge label={expired ? 'EXPIRED' : 'ACTIVE'} />
                      </View>
                    </View>
                    <MobileCardRow label="Type"><Text style={T.td}>{s.mediaType}</Text></MobileCardRow>
                    <MobileCardRow label="Views / Likes">
                      <Text style={T.td}>👁 {s.viewCount} · ❤️ {s.likesCount}</Text>
                    </MobileCardRow>
                    <MobileCardRow label="Uploaded"><Text style={T.tdMuted}>{fmtDateTime(s.createdAt)}</Text></MobileCardRow>
                    <MobileCardRow label="Expires"><Text style={T.tdMuted}>{fmtDateTime(s.expiresAt)}</Text></MobileCardRow>
                    <View style={{ marginTop: 6 }}>
                      <ActionBtn label="Delete" onPress={() => del(s.id)} variant="danger" />
                    </View>
                  </MobileCard>
                );
              })
            )}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 860 }}>
              <View style={T.header}>
                {COLS.map((h) => <Text key={h.label} style={[T.th, h.style]}>{h.label}</Text>)}
              </View>
              {loading ? <Skeleton rows={8} /> : stories.length === 0 ? <EmptyState /> : (
                stories.map((s, i) => {
                  const expired = new Date(s.expiresAt) < new Date();
                  return (
                    <TableRow key={s.id} even={i % 2 === 0}>
                      <View style={[T.td, COL.xs]}>
                        {s.mediaType === 'IMAGE'
                          ? <Image source={{ uri: s.mediaUrl }} style={{ width: 40, height: 52, borderRadius: 6 }} />
                          : <View style={{ width: 40, height: 52, borderRadius: 6, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                              <Text>🎥</Text>
                            </View>
                        }
                      </View>
                      <View style={[T.td, COL.user, { flexDirection: 'row', alignItems: 'center' }]}>
                        <View style={T.avatar}>
                          {s.author?.avatarUrl
                            ? <Image source={{ uri: s.author.avatarUrl }} style={T.avatarImg} />
                            : <Text style={T.avatarFallback}>{s.author?.displayName?.[0]?.toUpperCase()}</Text>
                          }
                        </View>
                        <Text style={T.cellPrimary} numberOfLines={1}>{s.author?.displayName}</Text>
                      </View>
                      <Text style={[T.td, COL.sm]}>{s.mediaType}</Text>
                      <Text style={[T.td, COL.xs]}>{s.viewCount}</Text>
                      <Text style={[T.td, COL.xs]}>{s.likesCount}</Text>
                      <Text style={[T.tdMuted, COL.md]} numberOfLines={1}>{fmtDateTime(s.createdAt)}</Text>
                      <Text style={[T.tdMuted, COL.md]} numberOfLines={1}>{fmtDateTime(s.expiresAt)}</Text>
                      <View style={[T.td, COL.sm]}><Badge label={expired ? 'EXPIRED' : 'ACTIVE'} /></View>
                      <View style={[T.td, COL.act]}>
                        <ActionBtn label="Delete" onPress={() => del(s.id)} variant="danger" />
                      </View>
                    </TableRow>
                  );
                })
              )}
            </View>
          </ScrollView>
        )}
        <Pagination skip={skip} take={20} total={total} onPage={setSkip} />
      </SectionCard>
    </AdminShell>
  );
}
