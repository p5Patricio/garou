import { Platform } from 'react-native';
import { getDB, initDB } from '../db';
import type { ActiveTimer, TimerKind } from '../types/timer';

type NotifModule = typeof import('expo-notifications');
type NotifeeModule = typeof import('@notifee/react-native');

let Notifs: NotifModule | null = null;
let Notifee: NotifeeModule | null = null;
const configuredKinds = new Set<TimerKind>();
const configuredNotifeeKinds = new Set<TimerKind>();

const EXPO_PREFIX = 'expo:';
const NOTIFEE_PREFIX = 'notifee:';
const ID_SEPARATOR = '|';

function getNotifications(): NotifModule | null {
  if (Notifs !== null) return Notifs;
  try {
    Notifs = require('expo-notifications') as NotifModule;
    return Notifs;
  } catch {
    return null;
  }
}

function getNotifee(): NotifeeModule | null {
  if (Platform.OS !== 'android') return null;
  if (Notifee !== null) return Notifee;
  try {
    Notifee = require('@notifee/react-native') as NotifeeModule;
    return Notifee;
  } catch {
    return null;
  }
}

function encodeNotificationIds(ids: Array<{ type: 'expo' | 'notifee'; id: string | null }>): string | null {
  const encoded = ids
    .filter((item): item is { type: 'expo' | 'notifee'; id: string } => !!item.id)
    .map((item) => `${item.type === 'expo' ? EXPO_PREFIX : NOTIFEE_PREFIX}${item.id}`);
  return encoded.length > 0 ? encoded.join(ID_SEPARATOR) : null;
}

function decodeNotificationIds(value: string | null): Array<{ type: 'expo' | 'notifee'; id: string }> {
  if (!value) return [];
  if (!value.includes(':')) return [{ type: 'expo', id: value }];
  const ids: Array<{ type: 'expo' | 'notifee'; id: string }> = [];
  for (const part of value.split(ID_SEPARATOR)) {
    if (part.startsWith(EXPO_PREFIX)) ids.push({ type: 'expo', id: part.slice(EXPO_PREFIX.length) });
    if (part.startsWith(NOTIFEE_PREFIX)) ids.push({ type: 'notifee', id: part.slice(NOTIFEE_PREFIX.length) });
  }
  return ids;
}

async function ensureNotifications(kind: TimerKind): Promise<void> {
  const mod = getNotifications();
  if (!mod || configuredKinds.has(kind)) return;
  mod.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  await mod.requestPermissionsAsync().catch(() => {});
  await mod.setNotificationChannelAsync(`${kind}-timer`, {
    name: kind === 'rest' ? 'Descanso entre series' : 'Cardio',
    importance: mod.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  }).catch(() => {});
  configuredKinds.add(kind);
}

async function ensureNotifee(kind: TimerKind): Promise<string | null> {
  const mod = getNotifee();
  if (!mod) return null;
  const channelId = `${kind}-timer-live`;
  if (!configuredNotifeeKinds.has(kind)) {
    await mod.default.requestPermission().catch(() => {});
    await mod.default.createChannel({
      id: channelId,
      name: kind === 'rest' ? 'Descanso en vivo' : 'Cardio en vivo',
      importance: mod.AndroidImportance.DEFAULT,
      vibration: false,
    }).catch(() => {});
    configuredNotifeeKinds.add(kind);
  }
  return channelId;
}

async function cancelNotification(notificationId: string | null): Promise<void> {
  const ids = decodeNotificationIds(notificationId);
  const expo = getNotifications();
  const notifee = getNotifee();
  for (const item of ids) {
    if (item.type === 'expo' && expo) {
      await expo.cancelScheduledNotificationAsync(item.id).catch(() => {});
    }
    if (item.type === 'notifee' && notifee) {
      await notifee.default.cancelNotification(item.id).catch(() => {});
      await notifee.default.cancelTriggerNotification(item.id).catch(() => {});
    }
  }
}

async function scheduleExpoEndNotification(kind: TimerKind, label: string, seconds: number): Promise<string | null> {
  const mod = getNotifications();
  if (!mod || seconds <= 0) return null;
  await ensureNotifications(kind);
  const title = kind === 'rest' ? 'Descanso terminado' : 'Cardio terminado';
  const body = kind === 'rest' ? `Retoma la sesion - ${label}` : `Cardio completado - ${label}`;
  try {
    return await mod.scheduleNotificationAsync({
      content: { title, body, sound: true, data: { type: `${kind}-timer` } },
      trigger: {
        type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
  } catch {
    return null;
  }
}

async function scheduleNotifeeTimer(kind: TimerKind, label: string, endAtMs: number): Promise<string | null> {
  const mod = getNotifee();
  const channelId = await ensureNotifee(kind);
  if (!mod || !channelId) return null;

  const notificationId = `garou-${kind}-timer`;
  const title = kind === 'rest' ? 'Descanso en curso' : 'Cardio en curso';
  const doneTitle = kind === 'rest' ? 'Descanso terminado' : 'Cardio terminado';
  const body = kind === 'rest' ? `Siguiente serie - ${label}` : `Sesion - ${label}`;
  const doneBody = kind === 'rest' ? `Retoma la sesion - ${label}` : `Cardio completado - ${label}`;

  try {
    await mod.default.displayNotification({
      id: notificationId,
      title,
      body,
      android: {
        channelId,
        ongoing: true,
        autoCancel: false,
        onlyAlertOnce: true,
        showChronometer: true,
        chronometerDirection: 'down',
        timestamp: endAtMs,
        pressAction: { id: 'default' },
      },
    });

    await mod.default.createTriggerNotification(
      {
        id: notificationId,
        title: doneTitle,
        body: doneBody,
        android: {
          channelId,
          ongoing: false,
          autoCancel: true,
          pressAction: { id: 'default' },
        },
      },
      {
        type: mod.TriggerType.TIMESTAMP,
        timestamp: endAtMs,
        alarmManager: { allowWhileIdle: true },
      }
    ).catch(() => {});

    return notificationId;
  } catch {
    return null;
  }
}

async function scheduleNotification(kind: TimerKind, label: string, seconds: number, endAtMs: number): Promise<string | null> {
  const [notifeeId, expoId] = await Promise.all([
    scheduleNotifeeTimer(kind, label, endAtMs),
    scheduleExpoEndNotification(kind, label, seconds),
  ]);
  return encodeNotificationIds([
    { type: 'notifee', id: notifeeId },
    { type: 'expo', id: expoId },
  ]);
}

function mapTimer(row: any): ActiveTimer {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    startedAtMs: row.started_at_ms,
    endAtMs: row.end_at_ms,
    totalSeg: row.total_seg,
    notificationId: row.notification_id,
    active: row.active === 1,
  };
}

export async function getActiveTimer(kind: TimerKind): Promise<ActiveTimer | null> {
  await initDB();
  const row = await getDB().getFirstAsync<any>(
    `SELECT id, kind, label, started_at_ms, end_at_ms, total_seg, notification_id, active
     FROM active_timers
     WHERE kind = ? AND active = 1
     ORDER BY id DESC
     LIMIT 1`,
    [kind]
  );
  if (!row) return null;
  if (row.end_at_ms <= Date.now()) {
    await stopTimer(kind);
    return null;
  }
  return mapTimer(row);
}

export async function startTimer(kind: TimerKind, label: string, totalSeg: number): Promise<ActiveTimer> {
  await initDB();
  const db = getDB();
  const existing = await getActiveTimer(kind);
  if (existing?.notificationId) {
    await cancelNotification(existing.notificationId);
  }
  await db.runAsync('UPDATE active_timers SET active = 0 WHERE kind = ? AND active = 1', [kind]);

  const startedAtMs = Date.now();
  const endAtMs = startedAtMs + totalSeg * 1000;
  const notificationId = await scheduleNotification(kind, label, totalSeg, endAtMs);
  await db.runAsync(
    `INSERT INTO active_timers (kind, label, started_at_ms, end_at_ms, total_seg, notification_id, active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [kind, label, startedAtMs, endAtMs, totalSeg, notificationId]
  );
  const row = await db.getFirstAsync<any>(
    `SELECT id, kind, label, started_at_ms, end_at_ms, total_seg, notification_id, active
     FROM active_timers
     WHERE kind = ? AND active = 1
     ORDER BY id DESC
     LIMIT 1`,
    [kind]
  );
  return mapTimer(row);
}

export async function addTimerSeconds(kind: TimerKind, seconds: number): Promise<ActiveTimer | null> {
  const timer = await getActiveTimer(kind);
  if (!timer) return null;
  const remaining = Math.max(0, Math.round((timer.endAtMs - Date.now()) / 1000)) + seconds;
  await cancelNotification(timer.notificationId);
  const notificationId = await scheduleNotification(kind, timer.label, remaining, timer.endAtMs + seconds * 1000);
  const endAtMs = timer.endAtMs + seconds * 1000;
  await getDB().runAsync(
    'UPDATE active_timers SET end_at_ms = ?, total_seg = total_seg + ?, notification_id = ? WHERE id = ?',
    [endAtMs, seconds, notificationId, timer.id]
  );
  return getActiveTimer(kind);
}

export async function stopTimer(kind: TimerKind): Promise<void> {
  await initDB();
  const db = getDB();
  const rows = await db.getAllAsync<{ notification_id: string | null }>(
    'SELECT notification_id FROM active_timers WHERE kind = ?',
    [kind]
  );
  for (const row of rows) {
    await cancelNotification(row.notification_id);
  }
  await db.runAsync('DELETE FROM active_timers WHERE kind = ?', [kind]);
}
