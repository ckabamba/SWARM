import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createThemedStyles } from '../theme/themedStyles';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccount } from '../store/AccountContext';
import { CommunityPost, CommunityResource, PublicEvent, PublicProfile, newRequestId, warmPathApi } from '../services/warmPathApi';
import { DEMO_ACCOUNT_ID, DEMO_EVENTS, DEMO_RESOURCES, DEMO_STUDENT, demoEventPostLink, demoResourcePostLink } from '../demo/fixtures';
import { getDemoPosts, setDemoPosts } from '../demo/communityState';
import { THEME } from '../theme/tokens';

type Filter = 'All' | 'Students' | 'Alumni';
type LinkChoice = { kind: 'event' | 'resource'; key: string; title: string; meta: string };
const FILTERS: Filter[] = ['All', 'Students', 'Alumni'];

interface FeedScreenProps {
  demoMode?: boolean;
}

export default function FeedScreen({ demoMode = false }: FeedScreenProps) {
  const { account } = useAccount();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [resources, setResources] = useState<CommunityResource[]>([]);
  const [filter, setFilter] = useState<Filter>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityPost | null>(null);
  const [body, setBody] = useState('');
  const [selectedLink, setSelectedLink] = useState<LinkChoice | null>(null);
  const [showLinks, setShowLinks] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<PublicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const retryKey = useRef<{ fingerprint: string; id: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [feed, publicEvents] = await Promise.all([warmPathApi.posts(), warmPathApi.events()]);
      setPosts(feed.items);
      setEvents(publicEvents.items);
      if (account) {
        const options = await warmPathApi.communityOptions();
        setResources(options.resources);
      } else {
        setResources([]);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load Social Jackets.');
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (demoMode) {
      setPosts(getDemoPosts());
      setEvents(DEMO_EVENTS);
      setResources(DEMO_RESOURCES);
      setError('');
      setLoading(false);
    } else {
      void load();
    }
  }, [load, demoMode]);

  const linkChoices = useMemo<LinkChoice[]>(() => [
    ...events.map((event) => ({ kind: 'event' as const, key: event.url, title: event.title, meta: `${event.organizer || 'Campus event'} · ${event.location || 'Location not listed'}` })),
    ...resources.map((resource) => ({ kind: 'resource' as const, key: String(resource.id), title: resource.name, meta: resource.kind })),
  ], [events, resources]);

  const visiblePosts = useMemo(() => posts.filter((post) => {
    if (filter === 'Students') return post.author.kind === 'student';
    if (filter === 'Alumni') return post.author.kind === 'alum';
    return true;
  }), [posts, filter]);

  const openComposer = (post?: CommunityPost) => {
    setError('');
    setEditing(post || null);
    setBody(post?.body || '');
    setSelectedLink(post?.link_kind && post.link_key ? linkChoices.find((item) => item.kind === post.link_kind && item.key === post.link_key) || null : null);
    retryKey.current = null;
    setComposerOpen(true);
  };

  const savePost = async () => {
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 2000 || busy) return;
    if (!account && !demoMode) { setComposerOpen(false); return; }
    setBusy(true);
    setError('');
    try {
      if (demoMode) {
        const linked = selectedLink?.kind === 'event'
          ? demoEventPostLink(selectedLink.key)
          : selectedLink?.kind === 'resource'
            ? demoResourcePostLink(selectedLink.key)
            : null;
        const now = new Date().toISOString();
        const saved: CommunityPost = editing ? {
          ...editing,
          body: trimmed,
          version: editing.version + 1,
          updated_at: now,
          link_kind: selectedLink?.kind || null,
          link_key: selectedLink?.key || null,
          linked_record: linked,
        } : {
          id: Math.min(0, ...posts.map((post) => post.id)) - 1,
          body: trimmed,
          version: 1,
          created_at: now,
          updated_at: now,
          author: { id: DEMO_ACCOUNT_ID, name: DEMO_STUDENT.name, kind: 'student', major: DEMO_STUDENT.major },
          link_kind: selectedLink?.kind || null,
          link_key: selectedLink?.key || null,
          linked_record: linked,
        };
        setPosts((current) => setDemoPosts([saved, ...current.filter((item) => item.id !== saved.id)]));
        setComposerOpen(false);
        setEditing(null);
        setBody('');
        setSelectedLink(null);
        retryKey.current = null;
        return;
      }
      let saved: CommunityPost;
      if (editing) {
        saved = await warmPathApi.updatePost(editing.id, trimmed, selectedLink?.kind || null, selectedLink?.key || null, editing.version);
      } else {
        const fingerprint = JSON.stringify([trimmed, selectedLink?.kind || null, selectedLink?.key || null]);
        if (!retryKey.current || retryKey.current.fingerprint !== fingerprint) retryKey.current = { fingerprint, id: newRequestId() };
        saved = await warmPathApi.createPost(trimmed, selectedLink?.kind || null, selectedLink?.key || null, retryKey.current.id);
      }
      setPosts((current) => [saved, ...current.filter((item) => item.id !== saved.id)].sort((a, b) => b.id - a.id));
      setComposerOpen(false);
      setEditing(null);
      setBody('');
      setSelectedLink(null);
      retryKey.current = null;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the post. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const removePost = (post: CommunityPost) => {
    if (demoMode) {
      Alert.alert('Remove demo post?', 'This only changes the fictional post in this app session.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => setPosts((current) => setDemoPosts(current.filter((item) => item.id !== post.id))) },
      ]);
      return;
    }
    Alert.alert('Delete this post?', 'This removes your post from Social Jackets.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete post', style: 'destructive', onPress: () => {
        setBusy(true);
        void warmPathApi.deletePost(post.id, post.version).then(() => setPosts((current) => current.filter((item) => item.id !== post.id)))
          .catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not delete this post. Reload and try again.'))
          .finally(() => setBusy(false));
      } },
    ]);
  };

  const openProfile = async (personId: number) => {
    setAuthorProfile(null);
    setProfileError('');
    if (demoMode) {
      const author = posts.find((post) => post.author.id === personId)?.author;
      setAuthorProfile({ person_id: personId, profile: { name: author?.name || 'Demo student', kind: 'student', major: author?.major || '', grad_year: 2028, introduction: 'Fictional profile fixture for the WarmPath demo.' }, evidence: 'fictional_demo', identity_verified: false });
      return;
    }
    setProfileLoading(true);
    try { setAuthorProfile(await warmPathApi.publicProfile(personId)); }
    catch (reason) { setProfileError(reason instanceof Error ? reason.message : 'This profile is unavailable.'); }
    finally { setProfileLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.titleRow}><Ionicons name="people-outline" size={19} color={THEME.colors.gold} /><Text style={styles.eyebrow}>SOCIAL JACKETS</Text></View>
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>{demoMode ? 'Fictional student demo posts and campus activities.' : 'Posts and sourced campus listings from WarmPath accounts.'}</Text>
      </View>

      {demoMode ? <View style={styles.demoBanner}><Ionicons name="flask-outline" size={14} color={THEME.colors.glow} /><Text style={styles.demoBannerText}>DEMO DATA · Fictional student profiles, posts, clubs, and events. Changes stay in this app session.</Text></View> : null}

      {demoMode ? <TouchableOpacity style={styles.composerPrompt} onPress={() => openComposer()} accessibilityRole="button" accessibilityLabel="Share a demo update">
        <View style={styles.avatar}><Text style={styles.avatarText}>JL</Text></View>
        <Text style={styles.composerText}>Share a demo update…</Text><Ionicons name="create-outline" size={19} color={THEME.colors.glow} />
      </TouchableOpacity> : account ? <TouchableOpacity style={styles.composerPrompt} onPress={() => openComposer()} accessibilityRole="button" accessibilityLabel="Share an update">
        <View style={styles.avatar}><Text style={styles.avatarText}>{account.profile.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</Text></View>
        <Text style={styles.composerText}>Share an update…</Text><Ionicons name="create-outline" size={19} color={THEME.colors.glow} />
      </TouchableOpacity> : null}

      <View style={styles.filterRow}>{FILTERS.map((item) => <TouchableOpacity key={item} style={[styles.filterChip, filter === item && styles.filterSelected]} onPress={() => setFilter(item)} accessibilityRole="button" accessibilityState={{ selected: filter === item }}><Text style={[styles.filterText, filter === item && styles.filterTextSelected]}>{item}</Text></TouchableOpacity>)}</View>

      {error && !composerOpen ? <View style={styles.errorBanner}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text><TouchableOpacity onPress={() => void load()}><Text style={styles.linkText}>Retry</Text></TouchableOpacity></View> : null}
      {loading ? <View style={styles.state}><ActivityIndicator color={THEME.colors.gold} /><Text style={styles.muted}>Loading posts from WarmPath…</Text></View> : (
        <FlatList
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          data={visiblePosts}
          keyExtractor={(post) => String(post.id)}
          showsVerticalScrollIndicator
          refreshing={loading}
          onRefresh={() => { if (demoMode) setPosts(getDemoPosts()); else void load(); }}
          ListEmptyComponent={<View style={styles.state}><Text style={styles.emptyTitle}>{demoMode ? 'No demo posts yet' : 'No public posts yet'}</Text><Text style={styles.muted}>{demoMode ? 'Create a fictional demo update to preview the composer.' : 'Posts from public WarmPath profiles will appear here. There is no sample feed.'}</Text></View>}
          renderItem={({ item }) => <PostCard post={item} demoMode={demoMode} owner={demoMode ? item.author.id === DEMO_ACCOUNT_ID : item.author.id === account?.person_id} onEdit={() => openComposer(item)} onDelete={() => removePost(item)} onOpenProfile={() => void openProfile(item.author.id)} />}
        />
      )}

      <ComposerModal visible={composerOpen} editing={editing} demoMode={demoMode} body={body} setBody={(value) => { setBody(value); retryKey.current = null; }} selectedLink={selectedLink} choices={linkChoices} busy={busy} error={error} showLinks={showLinks} setShowLinks={setShowLinks} onSelectLink={(link) => { setSelectedLink(link); setShowLinks(false); retryKey.current = null; }} onClose={() => { setComposerOpen(false); setError(''); }} onSave={() => void savePost()} />

      <Modal visible={profileLoading || Boolean(authorProfile) || Boolean(profileError)} transparent animationType="fade" onRequestClose={() => { setAuthorProfile(null); setProfileError(''); }}>
        <View style={styles.modalBackdrop}><View style={styles.profileModal}>
          <View style={styles.modalHeading}><Text style={styles.modalTitle}>Public profile</Text><TouchableOpacity onPress={() => { setAuthorProfile(null); setProfileError(''); }} accessibilityRole="button" accessibilityLabel="Close profile"><Ionicons name="close" size={22} color={THEME.colors.ash} /></TouchableOpacity></View>
          {profileLoading ? <ActivityIndicator color={THEME.colors.gold} /> : authorProfile ? <>
            <Text style={styles.profileName}>{authorProfile.profile.name}</Text>
            <Text style={styles.muted}>{authorProfile.profile.kind === 'student' ? 'Student' : 'Alumni'}{authorProfile.profile.major ? ` · ${authorProfile.profile.major}` : ''}{authorProfile.profile.grad_year ? ` · Class of ${authorProfile.profile.grad_year}` : ''}</Text>
            {authorProfile.profile.introduction ? <Text style={styles.postBody}>{authorProfile.profile.introduction}</Text> : <Text style={styles.muted}>No public introduction is available.</Text>}
            <Text style={styles.disclaimer}>{authorProfile.evidence === 'fictional_demo' ? 'Fictional demo profile. This person is not a real WarmPath account.' : 'WarmPath marks this information as self-reported. Campus identity is not verified.'}</Text>
          </> : <Text accessibilityRole="alert" style={styles.errorText}>{profileError}</Text>}
        </View></View>
      </Modal>
    </View>
  );
}

function PostCard({ post, owner, demoMode, onEdit, onDelete, onOpenProfile }: { post: CommunityPost; owner: boolean; demoMode: boolean; onEdit: () => void; onDelete: () => void; onOpenProfile: () => void }) {
  const date = new Date(post.created_at);
  const stamp = Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString();
  return <View style={styles.postCard}>
    <View style={styles.postHead}>
      <TouchableOpacity style={styles.authorButton} onPress={onOpenProfile} accessibilityRole="button" accessibilityLabel={`Open ${post.author.name}'s public profile`}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{post.author.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</Text></View>
        <View style={styles.authorMeta}><Text style={styles.authorName}>{post.author.name}</Text><Text style={styles.authorSub}>{demoMode ? 'Fictional demo student' : post.author.kind === 'student' ? 'Student' : 'Alumni'}{post.author.major ? ` · ${post.author.major}` : ''}</Text></View>
      </TouchableOpacity>
      <View style={styles.postTimeAndActions}><Text style={styles.time}>{stamp}</Text>{owner ? <View style={styles.ownerActions}><TouchableOpacity onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit post"><Ionicons name="create-outline" size={17} color={THEME.colors.ash} /></TouchableOpacity><TouchableOpacity onPress={onDelete} accessibilityRole="button" accessibilityLabel={demoMode ? 'Remove demo post' : 'Delete post'}><Ionicons name="trash-outline" size={16} color={THEME.colors.ash} /></TouchableOpacity></View> : null}</View>
    </View>
    <Text style={styles.postBody}>{post.body}</Text>
    {post.link_kind ? post.linked_record ? <View style={styles.linkedCard}>
      <Text style={styles.linkedKicker}>{demoMode ? (post.link_kind === 'event' ? 'DEMO EVENT' : 'DEMO CLUB') : post.link_kind === 'event' ? 'SOURCED EVENT' : 'LINKED RESOURCE'}</Text>
      <Text style={styles.linkedTitle}>{post.linked_record.title}</Text>
      {post.link_kind === 'event' ? <Text style={styles.muted}>{post.linked_record.starts_at ? new Date(post.linked_record.starts_at).toLocaleString() : 'Date not listed'}{post.linked_record.location ? ` · ${post.linked_record.location}` : ''}</Text> : null}
      {demoMode ? <Text style={styles.muted}>Fictional demo fixture - stable ID {post.linked_record.key}</Text> : <TouchableOpacity style={styles.openLink} onPress={() => void Linking.openURL(post.linked_record!.url)} accessibilityRole="link"><Text style={styles.linkText}>Open {post.link_kind === 'event' ? 'event source' : 'resource'}</Text><Ionicons name="open-outline" size={13} color={THEME.colors.glow} /></TouchableOpacity>}
    </View> : <View style={styles.linkedCard}><Text style={styles.muted}>The linked {post.link_kind} is no longer available.</Text></View> : null}
  </View>;
}

function ComposerModal({ visible, editing, demoMode, body, setBody, selectedLink, choices, busy, error, showLinks, setShowLinks, onSelectLink, onClose, onSave }: {
  visible: boolean; editing: CommunityPost | null; demoMode: boolean; body: string; setBody: (value: string) => void; selectedLink: LinkChoice | null; choices: LinkChoice[]; busy: boolean; error: string; showLinks: boolean; setShowLinks: (value: boolean) => void; onSelectLink: (choice: LinkChoice | null) => void; onClose: () => void; onSave: () => void;
}) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.composerModal}>
        <View style={styles.modalHeading}><View><Text style={styles.modalTitle}>{editing ? 'Edit update' : 'Share an update'}</Text><Text style={styles.muted}>{demoMode ? 'This post stays in the local demo session.' : 'Your public WarmPath profile will be shown.'}</Text></View><TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close composer"><Ionicons name="close" size={22} color={THEME.colors.ash} /></TouchableOpacity></View>
        <TextInput style={styles.composerInput} value={body} onChangeText={setBody} placeholder="What would you like to share?" placeholderTextColor={THEME.colors.ash} multiline maxLength={2000} autoFocus />
        <View style={styles.linkChoiceRow}><View style={styles.selectedLinkLabel}><Text style={styles.linkedKicker}>OPTIONAL LINK</Text><Text numberOfLines={2} style={styles.muted}>{selectedLink ? selectedLink.title : 'No linked record selected'}</Text></View><TouchableOpacity style={styles.smallButton} onPress={() => setShowLinks(!showLinks)} accessibilityRole="button"><Text style={styles.smallButtonText}>{showLinks ? 'Close' : 'Choose'}</Text></TouchableOpacity></View>
        {showLinks ? <View style={styles.choices}>
          <TouchableOpacity style={styles.choice} onPress={() => onSelectLink(null)}><Text style={styles.choiceTitle}>No linked record</Text><Text style={styles.choiceMeta}>Share text only</Text></TouchableOpacity>
          {choices.map((choice) => <TouchableOpacity key={`${choice.kind}:${choice.key}`} style={styles.choice} onPress={() => onSelectLink(choice)}><Text style={styles.choiceTitle}>{choice.kind === 'event' ? 'Event · ' : 'Resource · '}{choice.title}</Text><Text style={styles.choiceMeta}>{choice.meta}</Text></TouchableOpacity>)}
          {choices.length === 0 ? <Text style={styles.muted}>Sign in with a public profile to load resource links. Public sourced events appear here when available.</Text> : null}
        </View> : null}
        <Text style={styles.counter}>{body.trim().length}/2000 characters</Text>
        {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
        <View style={styles.modalButtons}><TouchableOpacity onPress={onClose} style={styles.cancelButton} disabled={busy}><Text style={styles.muted}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={onSave} disabled={busy || !body.trim() || body.trim().length > 2000} style={[styles.smallButton, (busy || !body.trim()) && styles.disabled]}>{busy ? <ActivityIndicator color={THEME.colors.void} /> : <Text style={styles.smallButtonText}>{editing ? 'Save changes' : 'Share update'}</Text>}</TouchableOpacity></View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = createThemedStyles(StyleSheet.create({
  container: { flex: 1, paddingHorizontal: THEME.spacing.gutter, paddingTop: 14 },
  heading: { gap: 3, marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrow: { ...THEME.typography.cap, color: THEME.colors.gold, fontSize: 9.5, letterSpacing: 1.5 },
  title: { ...THEME.typography.display, color: THEME.colors.bone, fontSize: 24 },
  subtitle: { ...THEME.typography.bodyAsh, fontSize: 11.5 },
  composerPrompt: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: THEME.colors.line, borderRadius: THEME.rounded.card, backgroundColor: THEME.colors.panel, paddingHorizontal: 12, paddingVertical: 10 },
  composerText: { color: THEME.colors.ash, fontSize: 13, flex: 1 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: THEME.colors.gold, backgroundColor: 'rgba(234,170,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: THEME.colors.glow, fontWeight: '700', fontSize: 11 },
  accountPrompt: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: THEME.colors.line, borderRadius: THEME.rounded.card, backgroundColor: THEME.colors.panel, padding: 12 },
  demoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderWidth: 1, borderColor: 'rgba(234,170,0,0.42)', borderRadius: THEME.rounded.field, backgroundColor: 'rgba(234,170,0,0.09)', padding: 8 },
  demoBannerText: { flex: 1, color: THEME.colors.glow, fontSize: 9.5, lineHeight: 14 },
  promptText: { flex: 1, gap: 3 },
  promptTitle: { ...THEME.typography.title, fontSize: 13, color: THEME.colors.bone },
  filterRow: { flexDirection: 'row', gap: 7, paddingVertical: 10 },
  filterChip: { borderRadius: THEME.rounded.pill, borderWidth: 1, borderColor: THEME.colors.line, paddingHorizontal: 11, paddingVertical: 6 },
  filterSelected: { borderColor: THEME.colors.gold, backgroundColor: 'rgba(234,170,0,0.13)' },
  filterText: { color: THEME.colors.ash, fontSize: 10, fontWeight: '600' },
  filterTextSelected: { color: THEME.colors.glow },
  feed: { flex: 1 },
  feedContent: { gap: 9, paddingBottom: 12 },
  postCard: { backgroundColor: THEME.colors.panel, borderWidth: 1, borderColor: THEME.colors.line, borderRadius: THEME.rounded.card, padding: 13, gap: 10 },
  postHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  authorButton: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  authorMeta: { flex: 1, gap: 2 },
  authorName: { color: THEME.colors.bone, fontSize: 12, fontWeight: '700' },
  authorSub: { color: THEME.colors.ash, fontSize: 10.5 },
  postTimeAndActions: { alignItems: 'flex-end', gap: 5 },
  time: { color: THEME.colors.ash, fontSize: 9, textAlign: 'right', maxWidth: 100 },
  ownerActions: { flexDirection: 'row', gap: 12, paddingVertical: 2 },
  postBody: { color: THEME.colors.bone, fontSize: 13, lineHeight: 19 },
  linkedCard: { backgroundColor: THEME.colors.surface, borderWidth: 1, borderColor: THEME.colors.line, borderRadius: THEME.rounded.field, padding: 10, gap: 4 },
  linkedKicker: { ...THEME.typography.cap, color: THEME.colors.gold, fontSize: 8, letterSpacing: 1.1 },
  linkedTitle: { color: THEME.colors.bone, fontSize: 12, fontWeight: '600' },
  openLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 3 },
  linkText: { color: THEME.colors.glow, fontSize: 11, fontWeight: '600' },
  muted: { color: THEME.colors.ash, fontSize: 11, lineHeight: 16 },
  errorBanner: { padding: 9, borderWidth: 1, borderColor: 'rgba(255,106,31,0.5)', borderRadius: THEME.rounded.field, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  errorText: { color: '#ff9b83', fontSize: 11, lineHeight: 16, flex: 1 },
  state: { padding: 22, alignItems: 'center', gap: 8, backgroundColor: THEME.colors.panel, borderWidth: 1, borderColor: THEME.colors.line, borderRadius: THEME.rounded.card },
  emptyTitle: { color: THEME.colors.bone, fontSize: 13, fontWeight: '700' },
  smallButton: { minHeight: 34, borderRadius: THEME.rounded.pill, backgroundColor: THEME.colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, paddingVertical: 7 },
  smallButtonText: { color: THEME.colors.void, fontSize: 11, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)', padding: 12 },
  composerModal: { maxHeight: '92%', borderRadius: THEME.rounded.card, borderWidth: 1, borderColor: THEME.colors.line, backgroundColor: THEME.colors.panelSolid, padding: 16, gap: 11 },
  modalHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  modalTitle: { ...THEME.typography.headline, color: THEME.colors.bone, fontSize: 17 },
  composerInput: { minHeight: 105, maxHeight: 180, borderWidth: 1, borderColor: THEME.colors.line, borderRadius: THEME.rounded.field, backgroundColor: THEME.colors.surface, color: THEME.colors.bone, padding: 11, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
  linkChoiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedLinkLabel: { flex: 1, gap: 3 },
  choices: { maxHeight: 150, borderTopWidth: 1, borderTopColor: THEME.colors.line },
  choice: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: THEME.colors.line, gap: 2 },
  choiceTitle: { color: THEME.colors.bone, fontSize: 11, fontWeight: '600' },
  choiceMeta: { color: THEME.colors.ash, fontSize: 10 },
  counter: { color: THEME.colors.ash, fontSize: 9, textAlign: 'right' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 2 },
  cancelButton: { paddingHorizontal: 7, paddingVertical: 8 },
  disabled: { opacity: 0.45 },
  profileModal: { width: '100%', maxWidth: 420, borderRadius: THEME.rounded.card, borderWidth: 1, borderColor: THEME.colors.line, backgroundColor: THEME.colors.panelSolid, padding: 18, gap: 10 },
  profileName: { ...THEME.typography.headline, color: THEME.colors.bone },
  disclaimer: { color: THEME.colors.ash, fontSize: 10, lineHeight: 14, borderTopWidth: 1, borderTopColor: THEME.colors.line, paddingTop: 8 },
}));
