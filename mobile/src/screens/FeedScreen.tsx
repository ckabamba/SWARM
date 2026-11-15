import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme/tokens';
import { useWarmPathStore } from '../store/warmPathStore';

interface Comment {
  id: number;
  author: string;
  role: string;
  text: string;
  time: string;
}

interface FeedPost {
  id: number;
  authorType: 'student' | 'alumni' | 'club';
  authorName: string;
  authorRole: string;
  authorInitials: string;
  sharedTie?: string;
  content: string;
  time: string;
  likes: number;
  isLiked?: boolean;
  comments: Comment[];
  isAlum?: boolean;
  alumId?: number;
}

const INITIAL_POSTS: FeedPost[] = [
  {
    id: 1,
    authorType: 'alumni',
    authorName: 'Elena Rostova',
    authorRole: "CompE '23 · SWE @ NVIDIA",
    authorInitials: 'ER',
    sharedTie: 'Both in VIP: Embedded Vision',
    content:
      'For anyone interviewing for hardware or GPU systems internships: make sure you can explain cache coherency protocols and memory bottlenecks from your VIP or lab projects. That was 80% of my NVIDIA technical round.',
    time: '2h ago',
    likes: 18,
    isLiked: false,
    isAlum: true,
    alumId: 87,
    comments: [
      {
        id: 101,
        author: 'George P. Burdell',
        role: 'CompE 2nd year',
        text: 'Super helpful Elena! Did they ask for C or C++ implementations on the whiteboard?',
        time: '1h ago',
      },
      {
        id: 102,
        author: 'Elena Rostova',
        role: "CompE '23 · SWE @ NVIDIA",
        text: '@George Modern C++ (smart pointers & move semantics) with custom allocators.',
        time: '45m ago',
      },
    ],
  },
  {
    id: 2,
    authorType: 'student',
    authorName: 'Devon Brooks',
    authorRole: 'CS 1st year · GT',
    authorInitials: 'DB',
    sharedTie: 'Both in RoboJackets',
    content:
      'Just wrapped our first RoboJackets software workshop on ROS2 nodes! Really cool seeing how what we learn in class immediately powers autonomous navigation.',
    time: '5h ago',
    likes: 12,
    isLiked: false,
    comments: [],
  },
  {
    id: 3,
    authorType: 'club',
    authorName: 'VIP Embedded Vision',
    authorRole: 'Student Research Team',
    authorInitials: 'EV',
    sharedTie: 'On your active path',
    content:
      'Office hours this Thursday 4–6pm in Klaus 1116 for any students working on thermal imaging or camera calibration pipelines. Drop in and meet the team leads!',
    time: '1d ago',
    likes: 24,
    isLiked: false,
    comments: [
      {
        id: 201,
        author: 'Marcus Vance',
        role: "CS '23 · SWE @ NVIDIA",
        text: 'Loved my semesters on this team. Huge shoutout to the vision crew.',
        time: '18h ago',
      },
    ],
  },
  {
    id: 4,
    authorType: 'alumni',
    authorName: 'Marcus Vance',
    authorRole: "CS '23 · Systems SWE @ NVIDIA",
    authorInitials: 'MV',
    sharedTie: 'Both took CS 3210 & Arch Lab',
    content:
      'Don’t skip CS 3210 (OS)! Every systems team at NVIDIA looks at operating systems grades and project depth. Understanding page tables and context switching sets you apart from 95% of candidates.',
    time: '2d ago',
    likes: 31,
    isLiked: false,
    isAlum: true,
    alumId: 89,
    comments: [],
  },
];

const FILTER_TABS = ['All', 'Alumni', 'Students', 'Clubs'] as const;
type FilterTab = (typeof FILTER_TABS)[number];

interface FeedScreenProps {
  isAlumDemo?: boolean;
}

export default function FeedScreen({ isAlumDemo = false }: FeedScreenProps) {
  const { student, alumni } = useWarmPathStore();
  const demoAlum = alumni[0];
  const author = isAlumDemo ? demoAlum.name : student.name;
  const authorInitials = isAlumDemo
    ? demoAlum.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
    : student.initials;
  const authorRole = isAlumDemo
    ? `${demoAlum.major} '${String(demoAlum.grad_year).slice(-2)} · ${demoAlum.headline || 'Software Engineer · NVIDIA'}`
    : `${student.major} · ${student.yearLabel}`;
  const [posts, setPosts] = useState<FeedPost[]>(INITIAL_POSTS);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<number | null>(null);
  const [commentInputText, setCommentInputText] = useState('');
  const [newPostModalVisible, setNewPostModalVisible] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');

  const filteredPosts = posts.filter((post) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Alumni') return post.authorType === 'alumni';
    if (activeFilter === 'Students') return post.authorType === 'student';
    if (activeFilter === 'Clubs') return post.authorType === 'club';
    return true;
  });

  const handleToggleLike = (postId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const isLiked = !post.isLiked;
          return {
            ...post,
            isLiked,
            likes: isLiked ? post.likes + 1 : post.likes - 1,
          };
        }
        return post;
      })
    );
  };

  const handleToggleComments = (postId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCommentsPostId((curr) => (curr === postId ? null : postId));
    setCommentInputText('');
  };

  const handleAddComment = (postId: number) => {
    if (!commentInputText.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newComment: Comment = {
      id: Date.now(),
      author,
      role: authorRole,
      text: commentInputText.trim(),
      time: 'Just now',
    };

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...post.comments, newComment],
          };
        }
        return post;
      })
    );
    setCommentInputText('');
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const createdPost: FeedPost = {
      id: Date.now(),
      authorType: isAlumDemo ? 'alumni' : 'student',
      authorName: author,
      authorRole,
      authorInitials,
      content: newPostContent.trim(),
      time: 'Just now',
      likes: 0,
      isLiked: false,
      comments: [],
      ...(isAlumDemo && { alumId: 87 }),
    };

    setPosts([createdPost, ...posts]);
    setNewPostContent('');
    setNewPostModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="chatbubbles" size={20} color={THEME.colors.glow} style={styles.titleIcon} />
            <Text style={styles.headerTitle}>COMMUNITY FEED</Text>
          </View>
          <Text style={styles.subtitle}>
            Conversations, interview insights, and shared path updates
          </Text>
        </View>

        {/* Composer Prompt Box */}
        <TouchableOpacity
          style={styles.composerBar}
          onPress={() => setNewPostModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{authorInitials}</Text>
          </View>
          <Text style={styles.composerPlaceholder}>
            Share an update, milestone, or ask your network...
          </Text>
          <Ionicons name="create-outline" size={18} color={THEME.colors.glow} />
        </TouchableOpacity>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_TABS.map((tab) => {
            const isSelected = activeFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveFilter(tab);
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Feed Posts */}
        <View style={styles.postsList}>
          {filteredPosts.map((post) => {
            const isCommentsOpen = expandedCommentsPostId === post.id;

            return (
              <View key={post.id} style={styles.postCard}>
                {/* Author Header */}
                <View style={styles.postHeader}>
                  <View
                    style={[
                      styles.authorAvatar,
                      post.authorType === 'alumni' && styles.avatarAlum,
                      post.authorType === 'club' && styles.avatarClub,
                    ]}
                  >
                    <Text style={styles.avatarInitials}>{post.authorInitials}</Text>
                  </View>
                  <View style={styles.authorMeta}>
                    <View style={styles.authorNameRow}>
                      <Text style={styles.authorName}>{post.authorName}</Text>
                      {post.authorType === 'alumni' && (
                        <View style={styles.alumBadge}>
                          <Text style={styles.alumBadgeText}>ALUM</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.authorRole}>{post.authorRole}</Text>
                  </View>
                  <Text style={styles.postTime}>{post.time}</Text>
                </View>

                {/* Shared Tie indicator */}
                {post.sharedTie && (
                  <View style={styles.tieRow}>
                    <Ionicons name="git-branch-outline" size={12} color={THEME.colors.tie} />
                    <Text style={styles.tieText}>{post.sharedTie}</Text>
                  </View>
                )}

                {/* Body Content */}
                <Text style={styles.postContent}>{post.content}</Text>

                {/* Interactive Action Row */}
                <View style={styles.actionRow}>
                  {/* Like Button */}
                  <TouchableOpacity
                    style={[styles.actionBtn, post.isLiked && styles.actionBtnActive]}
                    onPress={() => handleToggleLike(post.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={post.isLiked ? 'heart' : 'heart-outline'}
                      size={17}
                      color={post.isLiked ? THEME.colors.ember : THEME.colors.ash}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        post.isLiked && styles.actionBtnTextLiked,
                      ]}
                    >
                      {post.likes}
                    </Text>
                  </TouchableOpacity>

                  {/* Comment Button */}
                  <TouchableOpacity
                    style={[styles.actionBtn, isCommentsOpen && styles.actionBtnActive]}
                    onPress={() => handleToggleComments(post.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isCommentsOpen ? 'chatbubble' : 'chatbubble-outline'}
                      size={16}
                      color={isCommentsOpen ? THEME.colors.glow : THEME.colors.ash}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        isCommentsOpen && styles.actionBtnTextActive,
                      ]}
                    >
                      {post.comments.length}
                    </Text>
                  </TouchableOpacity>

                  {/* Connect / Share */}
                  {post.isAlum && (
                    <View style={styles.connectPill}>
                      <Ionicons name="sparkles-outline" size={12} color={THEME.colors.glow} />
                      <Text style={styles.connectPillText}>On Your WarmPath</Text>
                    </View>
                  )}
                </View>

                {/* Expandable Comments Section */}
                {isCommentsOpen && (
                  <View style={styles.commentsSection}>
                    {post.comments.map((c) => (
                      <View key={c.id} style={styles.commentItem}>
                        <View style={styles.commentMeta}>
                          <Text style={styles.commentAuthor}>{c.author}</Text>
                          <Text style={styles.commentRole}>{c.role}</Text>
                          <Text style={styles.commentTime}>{c.time}</Text>
                        </View>
                        <Text style={styles.commentText}>{c.text}</Text>
                      </View>
                    ))}

                    {/* Inline Comment Input */}
                    <View style={styles.commentInputRow}>
                      <TextInput
                        style={styles.commentInput}
                        placeholder="Write a reply..."
                        placeholderTextColor={THEME.colors.ash}
                        value={commentInputText}
                        onChangeText={setCommentInputText}
                      />
                      <TouchableOpacity
                        style={styles.sendCommentBtn}
                        onPress={() => handleAddComment(post.id)}
                      >
                        <Ionicons name="arrow-up" size={16} color={THEME.colors.void} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* New Post Modal */}
      <Modal
        visible={newPostModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNewPostModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>NEW POST</Text>
              <TouchableOpacity onPress={() => setNewPostModalVisible(false)}>
                <Ionicons name="close" size={22} color={THEME.colors.ash} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalAuthorRow}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{authorInitials}</Text>
              </View>
              <View>
                <Text style={styles.modalAuthorName}>{author}</Text>
                <Text style={styles.modalAuthorSub}>
                  {authorRole}
                </Text>
              </View>
            </View>

            <TextInput
              style={styles.modalTextInput}
              placeholder="What's happening on your path? Ask a question or share a milestone..."
              placeholderTextColor={THEME.colors.ash}
              multiline
              autoFocus
              value={newPostContent}
              onChangeText={setNewPostContent}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setNewPostModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitModalBtn,
                  !newPostContent.trim() && styles.submitModalBtnDisabled,
                ]}
                onPress={handleCreatePost}
                disabled={!newPostContent.trim()}
              >
                <Text style={styles.submitModalBtnText}>Post to Swarm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: THEME.spacing.gutter,
    paddingTop: 16,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  titleIcon: {
    marginRight: 2,
  },
  headerTitle: {
    ...THEME.typography.cap,
    fontSize: 13,
    letterSpacing: 2,
    color: THEME.colors.glow,
  },
  subtitle: {
    ...THEME.typography.bodyAsh,
    fontSize: 13,
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.panel,
    borderRadius: THEME.rounded.field,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 10,
  },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 233, 168, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.glow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.glow,
  },
  composerPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.ash,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.rounded.pill,
    backgroundColor: 'rgba(244, 238, 230, 0.05)',
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  filterChipActive: {
    backgroundColor: 'rgba(255, 233, 168, 0.16)',
    borderColor: THEME.colors.glow,
  },
  filterChipText: {
    ...THEME.typography.cap,
    fontSize: 10,
    letterSpacing: 1.2,
    color: THEME.colors.ash,
  },
  filterChipTextActive: {
    color: THEME.colors.glow,
    fontWeight: '700',
  },
  postsList: {
    gap: 14,
  },
  postCard: {
    backgroundColor: THEME.colors.panel,
    borderRadius: THEME.rounded.card,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(244, 238, 230, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  avatarAlum: {
    backgroundColor: 'rgba(234, 170, 0, 0.15)',
    borderColor: THEME.colors.gold,
  },
  avatarClub: {
    backgroundColor: 'rgba(255, 106, 31, 0.15)',
    borderColor: THEME.colors.ember,
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.bone,
  },
  authorMeta: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.bone,
  },
  alumBadge: {
    backgroundColor: 'rgba(234, 170, 0, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.gold,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  alumBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: THEME.colors.gold,
    letterSpacing: 1,
  },
  authorRole: {
    fontSize: 11,
    color: THEME.colors.ash,
    marginTop: 1,
  },
  postTime: {
    ...THEME.typography.cap,
    fontSize: 9.5,
    color: THEME.colors.ash,
  },
  tieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(246, 207, 166, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(246, 207, 166, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  tieText: {
    fontSize: 11,
    color: THEME.colors.tie,
    fontWeight: '500',
  },
  postContent: {
    ...THEME.typography.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: THEME.colors.bone,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 238, 230, 0.08)',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: THEME.rounded.pill,
  },
  actionBtnActive: {
    backgroundColor: 'rgba(244, 238, 230, 0.06)',
  },
  actionBtnText: {
    fontSize: 12,
    color: THEME.colors.ash,
    fontWeight: '500',
  },
  actionBtnTextLiked: {
    color: THEME.colors.ember,
    fontWeight: '700',
  },
  actionBtnTextActive: {
    color: THEME.colors.glow,
  },
  connectPill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 233, 168, 0.08)',
    borderRadius: THEME.rounded.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  connectPillText: {
    fontSize: 10,
    color: THEME.colors.glow,
    fontWeight: '500',
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 238, 230, 0.08)',
    gap: 10,
  },
  commentItem: {
    backgroundColor: 'rgba(244, 238, 230, 0.03)',
    borderRadius: 8,
    padding: 10,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.bone,
  },
  commentRole: {
    fontSize: 10,
    color: THEME.colors.ash,
    flex: 1,
  },
  commentTime: {
    fontSize: 10,
    color: THEME.colors.ash,
  },
  commentText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: THEME.colors.bone,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(244, 238, 230, 0.06)',
    borderRadius: THEME.rounded.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    fontSize: 12.5,
    color: THEME.colors.bone,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  sendCommentBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.glow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0c0814',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...THEME.typography.cap,
    fontSize: 12,
    letterSpacing: 2,
    color: THEME.colors.glow,
  },
  modalAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  modalAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.bone,
  },
  modalAuthorSub: {
    fontSize: 11,
    color: THEME.colors.ash,
  },
  modalTextInput: {
    minHeight: 110,
    backgroundColor: 'rgba(244, 238, 230, 0.04)',
    borderRadius: THEME.rounded.field,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    padding: 14,
    fontSize: 14,
    color: THEME.colors.bone,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.rounded.pill,
  },
  cancelModalBtnText: {
    fontSize: 13,
    color: THEME.colors.ash,
    fontWeight: '500',
  },
  submitModalBtn: {
    backgroundColor: THEME.colors.glow,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: THEME.rounded.pill,
  },
  submitModalBtnDisabled: {
    opacity: 0.4,
  },
  submitModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.void,
  },
});
