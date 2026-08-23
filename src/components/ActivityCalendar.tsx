import React, { useMemo, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';
import { formatLocalDate } from '../utils/date';
import type { ActivityDay } from '../utils/activityCalendar';

interface ActivityCalendarProps {
  days: ActivityDay[];
}

const CELL = 11;
const GAP = 3;
const DOW_LABELS = ['', 'Lun', '', 'Mie', '', 'Vie', ''];
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function levelColor(level: 0 | 1 | 2 | 3 | 4, accent: string, emptyBg: string): string {
  if (level === 0) return emptyBg;
  const alphaHex = ['', '33', '66', '99', ''][level];
  return level === 4 ? accent : `${accent}${alphaHex}`;
}

export default function ActivityCalendar({ days }: ActivityCalendarProps) {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const hasScrolledToEnd = useRef(false);

  const weeks = useMemo(() => {
    if (days.length === 0) return [] as (ActivityDay | null)[][];
    const [y, m, d] = days[0].fecha.split('-').map(Number);
    const firstDow = new Date(y, m - 1, d).getDay(); // 0 = Sun

    const padded: (ActivityDay | null)[] = [...Array(firstDow).fill(null), ...days];
    while (padded.length % 7 !== 0) padded.push(null);

    const cols: (ActivityDay | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      cols.push(padded.slice(i, i + 7));
    }
    return cols;
  }, [days]);

  // Month label appears above the first week-column whose row-0..6 crosses into a new month.
  const monthLabelForWeek = useMemo(() => {
    const labels: (string | null)[] = [];
    let lastMonth = -1;
    for (const week of weeks) {
      const firstReal = week.find((d) => d !== null);
      if (!firstReal) {
        labels.push(null);
        continue;
      }
      const month = Number(firstReal.fecha.split('-')[1]) - 1;
      if (month !== lastMonth) {
        labels.push(MONTH_LABELS[month]);
        lastMonth = month;
      } else {
        labels.push(null);
      }
    }
    return labels;
  }, [weeks]);

  const restColor = theme.text3;

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.dowCol}>
          <View style={{ height: 16 }} />
          {DOW_LABELS.map((label, i) => (
            <View key={i} style={{ height: CELL, marginBottom: GAP, justifyContent: 'center' }}>
              {label ? (
                <Text style={[styles.dowLabel, { color: theme.text3 }]}>{label}</Text>
              ) : null}
            </View>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          ref={scrollRef}
          onContentSizeChange={() => {
            // Snap to the most recent week (today, at the right edge) once, on first
            // layout only — a later re-render (e.g. focus refresh) must not fight a
            // scroll position the user set by hand.
            if (!hasScrolledToEnd.current) {
              hasScrolledToEnd.current = true;
              scrollRef.current?.scrollToEnd({ animated: false });
            }
          }}
        >
          <View>
            <View style={styles.monthRow}>
              {weeks.map((_, wi) => (
                <View key={wi} style={{ width: CELL + GAP }}>
                  {monthLabelForWeek[wi] ? (
                    <Text style={[styles.monthLabel, { color: theme.text3 }]}>
                      {monthLabelForWeek[wi]}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
            <View style={styles.weeksRow}>
              {weeks.map((week, wi) => (
                <View key={wi} style={{ marginRight: GAP }}>
                  {week.map((day, di) => {
                    if (!day) {
                      return <View key={di} style={{ width: CELL, height: CELL, marginBottom: GAP }} />;
                    }
                    const bg = day.esDescanso
                      ? restColor
                      : levelColor(day.level, theme.accent, theme.bg3);
                    const label = day.esDescanso
                      ? `${formatLocalDate(day.fecha)}: dia de descanso`
                      : day.level === 0
                      ? `${formatLocalDate(day.fecha)}: sin entrenamiento`
                      : `${formatLocalDate(day.fecha)}: ${day.tipoSesion}, ${
                          day.level === 4 ? 'completada' : `${Math.round((day.pct ?? 0) * 100)}% completada`
                        }`;
                    return (
                      <View
                        key={di}
                        accessible
                        accessibilityLabel={label}
                        style={[
                          styles.cell,
                          {
                            backgroundColor: bg,
                            borderColor: theme.border,
                            borderWidth: day.esDescanso || day.level > 0 ? 0 : 1,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={styles.legendRow}>
        <Text style={[styles.legendText, { color: theme.text3 }]}>Menos</Text>
        {([0, 1, 2, 3, 4] as const).map((lvl) => (
          <View
            key={lvl}
            style={[
              styles.legendCell,
              {
                backgroundColor: levelColor(lvl, theme.accent, theme.bg3),
                borderColor: theme.border,
                borderWidth: lvl === 0 ? 1 : 0,
              },
            ]}
          />
        ))}
        <Text style={[styles.legendText, { color: theme.text3 }]}>Mas</Text>

        <View style={[styles.legendCell, { backgroundColor: restColor, marginLeft: 14 }]} />
        <Text style={[styles.legendText, { color: theme.text3 }]}>Descanso</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  dowCol: {
    marginRight: 4,
  },
  dowLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  monthRow: {
    flexDirection: 'row',
    height: 16,
  },
  monthLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  weeksRow: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL,
    height: CELL,
    marginBottom: GAP,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 3,
  },
  legendText: {
    fontSize: 11,
    marginHorizontal: 4,
  },
  legendCell: {
    width: CELL,
    height: CELL,
    borderRadius: 2,
  },
});
