import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, RADII, SEMANTIC } from '../constants/theme';
import { getDB } from '../db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SetEntry {
  num_serie: number;
  peso_kg: number;
  reps: number;
  rir_real: number | null;
}

interface SessionGroup {
  sessionId: number;
  fecha: string;
  sets: SetEntry[];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  exerciseId: number;
  exerciseName: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExerciseHistoryScreen({ exerciseId, exerciseName, onClose }: Props) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionGroup[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db = getDB();

        // Fetch the last 5 completed sessions that have logs for this exercise
        const sessionRows = await db.getAllAsync<{ id: number; fecha: string }>(
          `SELECT DISTINCT ws.id, ws.fecha
           FROM workout_sessions ws
           JOIN set_logs sl ON sl.session_id = ws.id
           WHERE sl.exercise_id = ?
             AND sl.completada = 1
           ORDER BY ws.fecha DESC
           LIMIT 5`,
          [exerciseId]
        );

        const groups: SessionGroup[] = [];

        for (const sess of sessionRows) {
          const sets = await db.getAllAsync<SetEntry>(
            `SELECT num_serie, peso_kg, reps, rir_real
             FROM set_logs
             WHERE session_id = ? AND exercise_id = ? AND completada = 1
             ORDER BY num_serie ASC`,
            [sess.id, exerciseId]
          );
          groups.push({ sessionId: sess.id, fecha: sess.fecha, sets });
        }

        if (!cancelled) {
          setSessions(groups);
        }
      } catch (err) {
        console.error('[ExerciseHistoryScreen] load error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [exerciseId]);

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerLabel, { color: theme.text3 }]}>Historial</Text>
            <Text style={[styles.headerTitle, { color: theme.text1 }]} numberOfLines={1}>
              {exerciseName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: theme.bg4, minWidth: 48, minHeight: 48 }]}
            accessibilityLabel="Cerrar historial"
            accessibilityRole="button"
          >
            <Text style={[styles.closeBtnText, { color: theme.text2 }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Body */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyIcon, { color: theme.text4 }]}>📋</Text>
            <Text style={[styles.emptyTitle, { color: theme.text2 }]}>Sin historial</Text>
            <Text style={[styles.emptySubtitle, { color: theme.text3 }]}>
              Aún no hay series registradas para este ejercicio.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {sessions.map((session) => (
              <View
                key={session.sessionId}
                style={[
                  styles.sessionCard,
                  {
                    backgroundColor: theme.bg2,
                    borderColor: theme.border,
                    borderRadius: RADII.r2,
                  },
                ]}
              >
                {/* Session date header */}
                <View style={[styles.sessionHeader, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.sessionDate, { color: theme.text1 }]}>
                    {formatDate(session.fecha)}
                  </Text>
                  <Text style={[styles.sessionSets, { color: theme.text3 }]}>
                    {session.sets.length} {session.sets.length === 1 ? 'serie' : 'series'}
                  </Text>
                </View>

                {/* Sets table header */}
                <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.tableHeaderCell, styles.cellSerie, { color: theme.text4 }]}>SERIE</Text>
                  <Text style={[styles.tableHeaderCell, styles.cellPeso, { color: theme.text4 }]}>PESO</Text>
                  <Text style={[styles.tableHeaderCell, styles.cellReps, { color: theme.text4 }]}>REPS</Text>
                  <Text style={[styles.tableHeaderCell, styles.cellRir, { color: theme.text4 }]}>RIR</Text>
                </View>

                {/* Set rows */}
                {session.sets.map((s, idx) => {
                  const isLast = idx === session.sets.length - 1;
                  return (
                    <View
                      key={s.num_serie}
                      style={[
                        styles.tableRow,
                        {
                          borderBottomColor: theme.border,
                          borderBottomWidth: isLast ? 0 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.setCircle, styles.cellSerie, { backgroundColor: SEMANTIC.greenA }]}>
                        <Text style={[styles.setCircleText, { color: SEMANTIC.green }]}>
                          {s.num_serie + 1}
                        </Text>
                      </View>
                      <Text style={[styles.tableCell, styles.cellPeso, { color: theme.text1 }]}>
                        {s.peso_kg === 0 ? 'BW' : `${s.peso_kg} kg`}
                      </Text>
                      <Text style={[styles.tableCell, styles.cellReps, { color: theme.text1 }]}>
                        {s.reps}
                      </Text>
                      <Text style={[styles.tableCell, styles.cellRir, { color: theme.text3 }]}>
                        {s.rir_real != null ? s.rir_real : '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  // iso: 'YYYY-MM-DD'
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [year, month, day] = parts.map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 2 },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  closeBtn: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeBtnText: { fontSize: 16, fontWeight: '700', lineHeight: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  scroll: { padding: 16, gap: 12 },
  sessionCard: { borderWidth: 1, overflow: 'hidden' },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sessionDate: { fontSize: 14, fontWeight: '700' },
  sessionSets: { fontSize: 12 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  tableHeaderCell: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tableCell: { fontSize: 14, fontWeight: '600' },
  setCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setCircleText: { fontSize: 11, fontWeight: '700' },
  // Column widths
  cellSerie: { width: 36 },
  cellPeso: { flex: 1 },
  cellReps: { width: 52, textAlign: 'center' },
  cellRir: { width: 40, textAlign: 'center' },
});
