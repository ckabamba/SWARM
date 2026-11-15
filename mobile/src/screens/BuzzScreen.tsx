import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme/tokens';

interface BuzzItem {
  id: number;
  source: string;
  sourceType: 'campus' | 'club' | 'article' | 'career';
  sourceIcon: keyof typeof Ionicons.glyphMap;
  verified: boolean;
  tag: string;
  title: string;
  summary: string;
  time: string;
  readMinutes: number;
}

const BUZZ_ITEMS: BuzzItem[] = [
  {
    id: 1,
    source: 'Georgia Tech Career Center',
    sourceType: 'career',
    sourceIcon: 'briefcase-outline',
    verified: true,
    tag: 'RECRUITING',
    title: 'NVIDIA posted 3 new SWE intern roles targeting Georgia Tech',
    summary:
      'Positions open across GPU systems architecture, autonomous navigation, and deep learning compilers. GT applicants with VIP team or systems lab experience are strongly highlighted.',
    time: '2h ago',
    readMinutes: 2,
  },
  {
    id: 2,
    source: 'RoboJackets',
    sourceType: 'club',
    sourceIcon: 'hardware-chip-outline',
    verified: true,
    tag: 'COMPETITION',
    title: 'RoboJackets advances to RoboCup@Home regional championship',
    summary:
      'The software division deployed an end-to-end perception pipeline on ROS2. Team alumni currently at NVIDIA, Apple, and Waymo will hold a technical mentorship panel next Tuesday.',
    time: '6h ago',
    readMinutes: 3,
  },
  {
    id: 3,
    source: 'VIP Program Office',
    sourceType: 'campus',
    sourceIcon: 'school-outline',
    verified: true,
    tag: 'OPPORTUNITY',
    title: 'VIP: Embedded Vision & GPU Systems open spring applications',
    summary:
      'Undergraduate research spots open for 2nd and 3rd year Computer Engineering and Computer Science majors. Application deadline is December 1st.',
    time: '1d ago',
    readMinutes: 2,
  },
  {
    id: 4,
    source: 'The Technique',
    sourceType: 'article',
    sourceIcon: 'newspaper-outline',
    verified: false,
    tag: 'CAMPUS NEWS',
    title: 'Georgia Tech ranks #4 nationally in tech recruiter preference',
    summary:
      'Recent survey data shows GT engineering and computing graduates leading Southeastern placements in tier-1 tech internships and research fellowships.',
    time: '2d ago',
    readMinutes: 4,
  },
  {
    id: 5,
    source: 'College of Computing',
    sourceType: 'campus',
    sourceIcon: 'ribbon-outline',
    verified: true,
    tag: 'RESEARCH',
    title: 'Undergraduate Architecture Lab showcases 14 new hardware papers',
    summary:
      'Poster sessions begin this Friday at Klaus Atrium. Current undergraduate researchers will demonstrate FPGA acceleration prototypes.',
    time: '3d ago',
    readMinutes: 3,
  },
];

const CATEGORIES = ['All', 'Recruiting', 'Clubs', 'Campus', 'Research'] as const;
type Category = (typeof CATEGORIES)[number];

export default function BuzzScreen() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  const filteredItems = BUZZ_ITEMS.filter((item) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Recruiting') return item.sourceType === 'career';
    if (activeCategory === 'Clubs') return item.sourceType === 'club';
    if (activeCategory === 'Campus') return item.sourceType === 'campus' || item.sourceType === 'article';
    if (activeCategory === 'Research') return item.tag === 'RESEARCH' || item.tag === 'OPPORTUNITY';
    return true;
  });

  const handleSelectCategory = (cat: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(cat);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="flash" size={20} color={THEME.colors.gold} style={styles.titleIcon} />
          <Text style={styles.headerTitle}>WHAT&apos;S THE BUZZ</Text>
        </View>
        <Text style={styles.subtitle}>
          Official announcements, club dispatches, and campus news
        </Text>
      </View>

      {/* Category Pills (Filter) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => handleSelectCategory(cat)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Read-Only Buzz Articles List */}
      <View style={styles.listContainer}>
        {filteredItems.map((item) => (
          <View key={item.id} style={styles.card}>
            {/* Source Header */}
            <View style={styles.sourceRow}>
              <View style={styles.sourceMeta}>
                <View style={styles.sourceIconBadge}>
                  <Ionicons name={item.sourceIcon} size={13} color={THEME.colors.gold} />
                </View>
                <Text style={styles.sourceName} numberOfLines={1}>
                  {item.source}
                </Text>
                {item.verified && (
                  <Ionicons
                    name="checkmark-circle"
                    size={13}
                    color={THEME.colors.gold}
                    style={styles.verifiedIcon}
                  />
                )}
              </View>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>

            {/* Tag Badge */}
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>{item.tag}</Text>
            </View>

            {/* Title & Summary */}
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSummary}>{item.summary}</Text>

            {/* Footer with read time */}
            <View style={styles.cardFooter}>
              <View style={styles.readTimeRow}>
                <Ionicons name="time-outline" size={12} color={THEME.colors.ash} />
                <Text style={styles.readTimeText}>{item.readMinutes} min read</Text>
              </View>
              <View style={styles.officialBadge}>
                <Ionicons name="lock-closed-outline" size={11} color={THEME.colors.ash} />
                <Text style={styles.officialBadgeText}>Official Post</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Read-Only Notice at bottom */}
      <View style={styles.footerNoteBox}>
        <Ionicons name="information-circle-outline" size={15} color={THEME.colors.ash} />
        <Text style={styles.footerNote}>
          What&apos;s the Buzz aggregates verified campus articles and club channels. To interact with students and alumni, visit the Community Feed.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: THEME.rounded.pill,
    backgroundColor: 'rgba(244, 238, 230, 0.05)',
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  filterChipActive: {
    backgroundColor: 'rgba(234, 170, 0, 0.16)',
    borderColor: THEME.colors.gold,
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
  listContainer: {
    gap: 14,
  },
  card: {
    backgroundColor: THEME.colors.panel,
    borderRadius: THEME.rounded.card,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    padding: 18,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sourceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 10,
  },
  sourceIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(234, 170, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceName: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.bone,
    flexShrink: 1,
  },
  verifiedIcon: {
    marginLeft: 2,
  },
  timeText: {
    ...THEME.typography.cap,
    fontSize: 9.5,
    color: THEME.colors.ash,
    letterSpacing: 0.5,
  },
  tagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(234, 170, 0, 0.08)',
    borderColor: 'rgba(234, 170, 0, 0.3)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 8,
  },
  tagBadgeText: {
    ...THEME.typography.cap,
    fontSize: 8.5,
    color: THEME.colors.gold,
    letterSpacing: 1.4,
  },
  cardTitle: {
    ...THEME.typography.title,
    fontSize: 15,
    lineHeight: 21,
    color: THEME.colors.bone,
    marginBottom: 8,
  },
  cardSummary: {
    ...THEME.typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: THEME.colors.ash,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 238, 230, 0.08)',
    paddingTop: 10,
  },
  readTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTimeText: {
    fontSize: 11,
    color: THEME.colors.ash,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  officialBadgeText: {
    ...THEME.typography.cap,
    fontSize: 9,
    color: THEME.colors.ash,
    letterSpacing: 1,
  },
  footerNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    padding: 14,
    borderRadius: THEME.rounded.field,
    backgroundColor: 'rgba(244, 238, 230, 0.03)',
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  footerNote: {
    ...THEME.typography.bodyAsh,
    fontSize: 11.5,
    lineHeight: 17,
    flex: 1,
  },
});
