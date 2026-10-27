import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MATCHES_URL } from '../config';
import { FavoriteButton } from '../components/FavoriteButton';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { useFavorites } from '../hooks/useFavorites';

type Team = { id: string; name: string; city: string };
type Score = { home: number; away: number };
type Match = {
  id: string;
  startsAt: string | null;
  status: string;
  minute?: number;
  home: Team;
  away: Team;
  score: Score | null;
};

type Filter = 'all' | 'upcoming' | 'finished';

const STATUS_LABELS: Record<string, string> = {
  finished: 'Завершён',
  scheduled: 'Предстоящий',
  live: 'Идёт',
  postponed: 'Отложен',
};

const FILTER_LABELS: Record<Filter, string> = {
  all: 'Все',
  upcoming: 'Предстоящие',
  finished: 'Завершённые',
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Дата уточняется';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Дата уточняется';
  // toLocaleString использует часовой пояс устройства по умолчанию
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function scoreLabel(match: Match): string | null {
  if (!match.score) return null;
  return `${match.score.home} : ${match.score.away}`;
}

function matchesFilter(match: Match, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'finished') return match.status === 'finished';
  return match.status !== 'finished'; // upcoming: всё, что не завершено
}

export function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const { isFavorite, toggle } = useFavorites();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(MATCHES_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMatches(Array.isArray(data.matches) ? data.matches : []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить матчи');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => matches.filter(m => matchesFilter(m, filter)),
    [matches, filter],
  );

  if (loading && matches.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Загрузка матчей…</Text>
      </View>
    );
  }

  if (error && matches.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Ошибка: {error}</Text>
        <Pressable style={styles.button} onPress={load}>
          <Text style={styles.buttonText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
       <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Матчи тура</Text>
          <UpdatedAgo since={lastUpdated} />
        </View>
        <Pressable
          style={[styles.refreshBtn, refreshing && styles.refreshBtnDisabled]}
          onPress={refresh}
          disabled={refreshing}
        >
          <Text style={styles.refreshText}>
            {refreshing ? '...' : 'Обновить'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {(Object.keys(FILTER_LABELS) as Filter[]).map(f => (
          <Pressable
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {FILTER_LABELS[f]}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={m => m.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        ListEmptyComponent={<Text style={styles.muted}>Матчей нет</Text>}
        renderItem={({ item }) => {
          const score = scoreLabel(item);
          return (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.teams}>
                  {item.home.name} — {item.away.name}
                </Text>
                <FavoriteButton
                  active={isFavorite(item.id)}
                  onPress={() => toggle(item.id)}
                />
              </View>
              {score !== null && <Text style={styles.score}>{score}</Text>}
              <View style={styles.row}>
                <Text style={styles.meta}>{formatDate(item.startsAt)}</Text>
                <Text style={styles.meta}>
                  {statusLabel(item.status)}
                  {item.status === 'live' && item.minute != null
                    ? ` · ${item.minute}'`
                    : ''}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#111827',
    marginLeft: 8,
  },
  refreshBtnDisabled: {
    opacity: 0.5,
  },
  refreshText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  title: { fontSize: 24, fontWeight: '700' },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  filterActive: { backgroundColor: '#111827' },
  filterText: { color: '#374151' },
  filterTextActive: { color: '#fff' },
  card: { padding: 12, borderRadius: 12, backgroundColor: '#f9fafb', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teams: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  score: { fontSize: 20, fontWeight: '700', marginVertical: 6 },
  meta: { color: '#6b7280', fontSize: 13 },
  muted: { color: '#6b7280', textAlign: 'center', marginTop: 16 },
  error: { color: '#b91c1c', marginBottom: 12 },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
});