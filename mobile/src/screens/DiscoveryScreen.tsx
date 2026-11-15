import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createThemedStyles } from '../theme/themedStyles';
import { THEME } from '../theme/tokens';
import { DiscoveryResource, PublicEvent, warmPathApi } from '../services/warmPathApi';
import { DEMO_DISCOVERY_RESOURCES, DEMO_EVENTS } from '../demo/fixtures';

type DemoDiscoveryResource = (typeof DEMO_DISCOVERY_RESOURCES)[number];
type DiscoveryItem = { kind: 'resource'; record: DiscoveryResource | DemoDiscoveryResource } | { kind: 'event'; record: PublicEvent };
type Category = 'All' | 'Resources' | 'Events';

export default function DiscoveryScreen({ demoMode = false }: { demoMode?: boolean }) {
  const [resources, setResources] = useState<Array<DiscoveryResource | DemoDiscoveryResource>>([]);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (demoMode) {
      setResources(DEMO_DISCOVERY_RESOURCES);
      setEvents(DEMO_EVENTS);
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await warmPathApi.startWorkspace();
      const [resourceData, eventData] = await Promise.all([warmPathApi.resources(), warmPathApi.events()]);
      setResources(resourceData.items);
      setEvents(eventData.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load discovery records.');
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => { void load(); }, [load]);

  const items = useMemo<DiscoveryItem[]>(() => [
    ...(category !== 'Events' ? resources.map((record) => ({ kind: 'resource' as const, record })) : []),
    ...(category !== 'Resources' ? events.map((record) => ({ kind: 'event' as const, record })) : []),
  ].filter(({ kind, record }) => {
    const haystack = kind === 'resource'
      ? `${record.name} ${record.kind} ${record.summary}`
      : `${record.title} ${record.organizer || ''} ${record.location || ''}`;
    return haystack.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  }), [resources, events, category, query]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>WARMPath</Text>
          <Text style={styles.title}>Discovery</Text>
          <Text style={styles.subtitle}>{demoMode ? 'Fictional student clubs and activities for this demo.' : 'Browse source-linked campus resources and current public event listings.'}</Text>
        </View>
        {demoMode ? <View style={styles.demoBanner}><Text style={styles.demoText}>DEMO DATA - Fictional resources and events. No campus listing is implied.</Text></View> : null}
        <View style={styles.searchBox}><Ionicons name="search-outline" size={17} color={THEME.colors.ash} /><TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search resources and events" placeholderTextColor={THEME.colors.ash} returnKeyType="search" /></View>
        <View style={styles.filters}>{(['All', 'Resources', 'Events'] as Category[]).map((item) => <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[styles.filter, category === item && styles.filterActive]} accessibilityRole="button" accessibilityState={{ selected: category === item }}><Text style={[styles.filterText, category === item && styles.filterTextActive]}>{item}</Text></TouchableOpacity>)}</View>

        {loading ? <View style={styles.stateCard}><ActivityIndicator color={THEME.colors.gold} /><Text style={styles.body}>Loading public records…</Text></View> : error ? <View style={styles.stateCard}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><TouchableOpacity style={styles.button} onPress={() => void load()}><Text style={styles.buttonText}>Try again</Text></TouchableOpacity></View> : items.length === 0 ? <View style={styles.stateCard}><Text style={styles.body}>No matching records were returned by WarmPath.</Text></View> : items.map((item) => item.kind === 'event'
          ? <EventCard key={`event:${item.record.url}`} event={item.record} />
          : <ResourceCard key={`resource:${item.record.id}`} resource={item.record} />)}
      </ScrollView>
    </View>
  );
}

function EventCard({ event }: { event: PublicEvent }) {
  const date = new Date(event.starts_at);
  const demo = event.source === 'Fictional demo data';
  return <View style={styles.card}>
    <View style={styles.cardHeading}><View style={styles.iconBadge}><Ionicons name="calendar-outline" size={16} color={THEME.colors.gold} /></View><Text style={styles.kind}>{demo ? 'DEMO EVENT' : 'PUBLIC EVENT'}</Text></View>
    <Text style={styles.cardTitle}>{event.title}</Text>
    <Text style={styles.body}>{Number.isNaN(date.getTime()) ? event.starts_at : date.toLocaleString()}</Text>
    {event.organizer ? <Text style={styles.secondary}>Organizer · {event.organizer}</Text> : null}
    {event.location ? <Text style={styles.secondary}>Location · {event.location}</Text> : null}
    <Text style={styles.source}>{demo ? 'Fictional demo fixture, not a real event listing.' : `Source record · ${event.source}`}</Text>
    {event.url && !demo ? <TouchableOpacity style={styles.linkButton} onPress={() => void Linking.openURL(event.url)} accessibilityRole="link"><Text style={styles.linkText}>Open source listing</Text><Ionicons name="open-outline" size={14} color={THEME.colors.glow} /></TouchableOpacity> : null}
  </View>;
}

function ResourceCard({ resource }: { resource: DiscoveryResource | DemoDiscoveryResource }) {
  const demo = typeof resource.id === 'string';
  return <View style={styles.card}>
    <View style={styles.cardHeading}><View style={styles.iconBadge}><Ionicons name="compass-outline" size={16} color={THEME.colors.gold} /></View><Text style={styles.kind}>{resource.kind}</Text></View>
    <Text style={styles.cardTitle}>{resource.name}</Text>
    <Text style={styles.body}>{resource.summary}</Text>
    {resource.url && !demo ? <TouchableOpacity style={styles.linkButton} onPress={() => void Linking.openURL(resource.url)} accessibilityRole="link"><Text style={styles.linkText}>Open resource</Text><Ionicons name="open-outline" size={14} color={THEME.colors.glow} /></TouchableOpacity> : null}
    {demo ? <Text style={styles.source}>Fictional demo fixture · {resource.id}</Text> : resource.source_url ? <Text style={styles.source}>Source link is supplied by WarmPath.</Text> : null}
  </View>;
}
const styles = createThemedStyles(StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: THEME.spacing.gutter, paddingBottom: 28, gap: 11 },
  header: { gap: 5, marginBottom: 4 },
  eyebrow: { ...THEME.typography.cap, color: THEME.colors.gold },
  title: { ...THEME.typography.display, color: THEME.colors.bone },
  subtitle: { ...THEME.typography.bodyAsh },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44, borderRadius: THEME.rounded.field, borderWidth: 1, borderColor: THEME.colors.line, backgroundColor: THEME.colors.panel, paddingHorizontal: 12 },
  search: { flex: 1, color: THEME.colors.bone, fontSize: 14, paddingVertical: 8 },
  filters: { flexDirection: 'row', gap: 7, paddingBottom: 2 },
  filter: { borderWidth: 1, borderColor: THEME.colors.line, borderRadius: THEME.rounded.pill, paddingHorizontal: 12, paddingVertical: 7 },
  filterActive: { borderColor: THEME.colors.gold, backgroundColor: 'rgba(234,170,0,0.14)' },
  filterText: { color: THEME.colors.ash, fontSize: 11, fontWeight: '600' },
  filterTextActive: { color: THEME.colors.glow },
  card: { backgroundColor: THEME.colors.panelSolid, borderWidth: 1, borderColor: THEME.colors.line, borderRadius: THEME.rounded.card, padding: 15, gap: 8 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  iconBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(234,170,0,0.12)' },
  kind: { ...THEME.typography.cap, color: THEME.colors.gold, fontSize: 9, letterSpacing: 1.1 },
  cardTitle: { ...THEME.typography.title, color: THEME.colors.bone, lineHeight: 21 },
  body: { ...THEME.typography.body, color: THEME.colors.bone, fontSize: 12.5, lineHeight: 18 },
  secondary: { ...THEME.typography.bodyAsh, fontSize: 11.5 },
  source: { color: THEME.colors.ash, fontSize: 10, lineHeight: 14 },
  linkButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, marginTop: 2, paddingVertical: 4 },
  linkText: { color: THEME.colors.glow, fontSize: 12, fontWeight: '600' },
  stateCard: { backgroundColor: THEME.colors.panelSolid, borderWidth: 1, borderColor: THEME.colors.line, borderRadius: THEME.rounded.card, padding: 18, alignItems: 'center', gap: 11 },
  button: { borderRadius: THEME.rounded.pill, borderWidth: 1, borderColor: THEME.colors.gold, paddingHorizontal: 14, paddingVertical: 8 },
  buttonText: { color: THEME.colors.glow, fontSize: 12, fontWeight: '600' },
  error: { color: '#ff9b83', fontSize: 12, textAlign: 'center' },
  demoBanner: { borderWidth: 1, borderColor: 'rgba(234,170,0,0.45)', borderRadius: THEME.rounded.field, backgroundColor: 'rgba(234,170,0,0.1)', padding: 9 },
  demoText: { color: THEME.colors.glow, fontSize: 10.5, lineHeight: 15 },
}));
