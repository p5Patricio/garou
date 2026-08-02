import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BtnPrimary from '../../src/components/BtnPrimary';
import Icon from '../../src/components/Icon';
import SectionLabel from '../../src/components/SectionLabel';
import Stepper from '../../src/components/Stepper';
import { RADII, useTheme } from '../../src/constants/theme';
import { getDB, initDB } from '../../src/db';
import type { LoadUnit } from '../../src/types/workout';

interface ExerciseRow {
  id: number;
  nombre: string;
  grupo_muscular: string;
  equipo: string;
  sesion: string;
  orden: number;
  series_objetivo: number;
  reps_min: number;
  reps_max: number;
  rir_min: number;
  rir_max: number;
  descanso_seg: number;
  notas_tecnica: string | null;
  unidad_preferida: LoadUnit;
  superset_group: string | null;
}

const SESSIONS = ['Torso A', 'Pierna A', 'Ligero', 'Torso B', 'Pierna B'] as const;
const UNITS: LoadUnit[] = ['kg', 'placas', 'lb', 'bw'];

export default function RoutineScreen() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<string>('Torso A');
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [editing, setEditing] = useState<ExerciseRow | null>(null);

  const loadExercises = useCallback(async () => {
    try {
      await initDB();
      const rows = await getDB().getAllAsync<ExerciseRow>(
        `SELECT id, nombre, grupo_muscular, equipo, sesion, orden,
                series_objetivo, reps_min, reps_max, rir_min, rir_max,
                descanso_seg, notas_tecnica, unidad_preferida, superset_group
         FROM exercises
         WHERE sesion = ? AND activo = 1
         ORDER BY orden ASC, id ASC`,
        [session]
      );
      setExercises(rows);
    } catch (err) {
      console.error('[RoutineScreen] load error', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadExercises();
    }, [loadExercises])
  );

  const saveExercise = async () => {
    if (!editing) return;

    // Validate routine editor
    const nombre = editing.nombre.trim();
    if (!nombre) {
      Alert.alert('Guardar ejercicio', 'El nombre no puede estar vacio.');
      return;
    }
    if (editing.reps_max < editing.reps_min) {
      Alert.alert('Guardar ejercicio', 'Las reps maximas deben ser mayores o iguales a las minimas.');
      return;
    }
    if (editing.rir_max < editing.rir_min) {
      Alert.alert('Guardar ejercicio', 'El RIR maximo debe ser mayor o igual al RIR minimo.');
      return;
    }
    if (editing.descanso_seg <= 0) {
      Alert.alert('Guardar ejercicio', 'El descanso debe ser mayor a 0 segundos.');
      return;
    }
    // Bodyweight only makes sense for free/bodyweight exercises; machines and cables
    // should use kg, lb or plates.
    if (editing.unidad_preferida === 'bw' && editing.equipo !== 'libre') {
      Alert.alert('Guardar ejercicio', 'BW solo es valido para ejercicios con equipo libre.');
      return;
    }

    if (editing.id === 0) {
      await getDB().runAsync(
        `INSERT INTO exercises (
          nombre, grupo_muscular, equipo, sesion, orden, series_objetivo,
          reps_min, reps_max, rir_min, rir_max, rir_objetivo,
          descanso_seg, notas_tecnica, unidad_preferida, activo, superset_group
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          editing.nombre.trim(),
          editing.grupo_muscular.trim() || 'General',
          editing.equipo.trim() || 'libre',
          session,
          editing.orden,
          editing.series_objetivo,
          editing.reps_min,
          editing.reps_max,
          editing.rir_min,
          editing.rir_max,
          editing.rir_min,
          editing.descanso_seg,
          editing.notas_tecnica,
          editing.unidad_preferida,
          editing.superset_group?.trim() || null,
        ]
      );
      setEditing(null);
      await loadExercises();
      return;
    }
    await getDB().runAsync(
      `UPDATE exercises
       SET nombre = ?, grupo_muscular = ?, equipo = ?, series_objetivo = ?, reps_min = ?, reps_max = ?,
           rir_min = ?, rir_max = ?, rir_objetivo = ?, descanso_seg = ?,
           unidad_preferida = ?, notas_tecnica = ?, superset_group = ?
       WHERE id = ?`,
      [
        editing.nombre.trim(),
        editing.grupo_muscular.trim() || 'General',
        editing.equipo.trim() || 'libre',
        editing.series_objetivo,
        editing.reps_min,
        editing.reps_max,
        editing.rir_min,
        editing.rir_max,
        editing.rir_min,
        editing.descanso_seg,
        editing.unidad_preferida,
        editing.notas_tecnica,
        editing.superset_group?.trim() || null,
        editing.id,
      ]
    );
    setEditing(null);
    await loadExercises();
  };

  const addExercise = () => {
    const nextOrder = exercises.reduce((max, ex) => Math.max(max, ex.orden), 0) + 1;
    setEditing({
      id: 0,
      nombre: 'Nuevo ejercicio',
      grupo_muscular: 'General',
      equipo: 'libre',
      sesion: session,
      orden: nextOrder,
      series_objetivo: 3,
      reps_min: 8,
      reps_max: 12,
      rir_min: 1,
      rir_max: 2,
      descanso_seg: 90,
      notas_tecnica: '',
      unidad_preferida: 'kg',
      superset_group: null,
    });
  };

  const moveExercise = async (ex: ExerciseRow, direction: -1 | 1) => {
    const currentIndex = exercises.findIndex((item) => item.id === ex.id);
    const other = exercises[currentIndex + direction];
    if (!other) return;
    await getDB().runAsync('UPDATE exercises SET orden = ? WHERE id = ?', [other.orden, ex.id]);
    await getDB().runAsync('UPDATE exercises SET orden = ? WHERE id = ?', [ex.orden, other.id]);
    await loadExercises();
  };

  const deactivateExercise = () => {
    if (!editing || editing.id === 0) {
      setEditing(null);
      return;
    }
    Alert.alert('Quitar ejercicio', `Quitar ${editing.nombre} de la rutina? El historial se conserva.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          await getDB().runAsync('UPDATE exercises SET activo = 0 WHERE id = ?', [editing.id]);
          setEditing(null);
          await loadExercises();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.date, { color: theme.text3 }]}>Rutina fija editable</Text>
            <Text style={[styles.title, { color: theme.text1 }]}>Rutina</Text>
          </View>
          <TouchableOpacity
            onPress={addExercise}
            style={[styles.addBtn, { backgroundColor: theme.accent }]}
            accessibilityRole="button"
            accessibilityLabel="Agregar ejercicio"
          >
            <Icon name="plus" size={18} color="#fff" strokeW={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessionTabs}>
          {SESSIONS.map((item) => {
            const active = session === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setSession(item)}
                style={[styles.sessionPill, { backgroundColor: active ? theme.accentA : theme.bg3, borderColor: active ? theme.accent : theme.border }]}
                accessibilityRole="button"
                accessibilityLabel={`Sesion ${item}`}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.sessionPillText, { color: active ? theme.accent : theme.text2 }]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <SectionLabel>{session}</SectionLabel>
        <View style={[styles.listCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
          {exercises.map((ex, index) => (
            <TouchableOpacity
              key={ex.id}
              onPress={() => setEditing(ex)}
              style={[styles.exerciseRow, { borderBottomColor: theme.border, borderBottomWidth: index < exercises.length - 1 ? 1 : 0 }]}
              accessibilityRole="button"
            >
              <View style={[styles.orderBadge, { backgroundColor: theme.bg3 }]}>
                <Text style={[styles.orderText, { color: theme.text3 }]}>{ex.orden}</Text>
              </View>
              <View style={styles.exerciseBody}>
                <Text style={[styles.exerciseName, { color: theme.text1 }]}>{ex.nombre}</Text>
                <Text style={[styles.exerciseMeta, { color: theme.text3 }]}>
                  {ex.series_objetivo}x{ex.reps_min}-{ex.reps_max} - RIR {ex.rir_min}-{ex.rir_max} - {Math.round(ex.descanso_seg / 60)} min - {ex.unidad_preferida}
                </Text>
              </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    onPress={() => moveExercise(ex, -1)}
                    style={styles.rowActionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Mover arriba"
                  >
                    <Text style={[styles.rowActionText, { color: theme.text3 }]}>Subir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveExercise(ex, 1)}
                    style={styles.rowActionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Mover abajo"
                  >
                    <Text style={[styles.rowActionText, { color: theme.text3 }]}>Bajar</Text>
                  </TouchableOpacity>
                </View>
              <Icon name="chevron" size={16} color={theme.text4} strokeW={2} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        {editing ? (
          <SafeAreaView style={[styles.modalSafe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setEditing(null)} style={styles.modalHeaderBtn}>
                <Text style={[styles.modalHeaderText, { color: theme.text2 }]}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text1 }]}>Editar ejercicio</Text>
              <TouchableOpacity onPress={saveExercise} style={styles.modalHeaderBtn}>
                <Text style={[styles.modalHeaderText, { color: theme.accent }]}>Guardar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.editCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
                <Text style={[styles.fieldLabel, { color: theme.text3 }]}>Nombre</Text>
                <TextInput
                  value={editing.nombre}
                  onChangeText={(nombre) => setEditing({ ...editing, nombre })}
                  style={[styles.input, { color: theme.text1, borderColor: theme.border2, backgroundColor: theme.bg3 }]}
                  placeholderTextColor={theme.text4}
                />
                <Text style={[styles.fieldLabel, { color: theme.text3 }]}>Grupo muscular</Text>
                <TextInput
                  value={editing.grupo_muscular}
                  onChangeText={(grupo_muscular) => setEditing({ ...editing, grupo_muscular })}
                  style={[styles.input, { color: theme.text1, borderColor: theme.border2, backgroundColor: theme.bg3 }]}
                  placeholderTextColor={theme.text4}
                />
                <Text style={[styles.fieldLabel, { color: theme.text3 }]}>Equipo</Text>
                <TextInput
                  value={editing.equipo}
                  onChangeText={(equipo) => setEditing({ ...editing, equipo })}
                  style={[styles.input, { color: theme.text1, borderColor: theme.border2, backgroundColor: theme.bg3 }]}
                  placeholderTextColor={theme.text4}
                />
                <Text style={[styles.fieldLabel, { color: theme.text3 }]}>Superset</Text>
                <TextInput
                  value={editing.superset_group ?? ''}
                  onChangeText={(superset_group) => setEditing({ ...editing, superset_group })}
                  style={[styles.input, { color: theme.text1, borderColor: theme.border2, backgroundColor: theme.bg3 }]}
                  placeholder="Opcional"
                  placeholderTextColor={theme.text4}
                />
              </View>

              <View style={[styles.editCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
                <Stepper value={editing.series_objetivo} onChange={(series_objetivo) => setEditing({ ...editing, series_objetivo })} min={1} step={1} label="Series" />
                <Stepper value={editing.reps_min} onChange={(reps_min) => setEditing({ ...editing, reps_min })} min={1} step={1} label="Reps min" />
                <Stepper value={editing.reps_max} onChange={(reps_max) => setEditing({ ...editing, reps_max })} min={editing.reps_min} step={1} label="Reps max" />
                <Stepper value={editing.rir_min} onChange={(rir_min) => setEditing({ ...editing, rir_min })} min={0} step={1} label="RIR min" />
                <Stepper value={editing.rir_max} onChange={(rir_max) => setEditing({ ...editing, rir_max })} min={editing.rir_min} step={1} label="RIR max" />
                <Stepper value={Math.round(editing.descanso_seg / 30)} onChange={(v) => setEditing({ ...editing, descanso_seg: v * 30 })} min={1} step={1} label="Descanso" unit="x30s" />
              </View>

              <View style={[styles.editCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
                <Text style={[styles.fieldLabel, { color: theme.text3 }]}>Unidad</Text>
                <View style={styles.unitsRow}>
                    {UNITS.map((unit) => {
                    const active = editing.unidad_preferida === unit;
                    return (
                      <TouchableOpacity
                        key={unit}
                        onPress={() => setEditing({ ...editing, unidad_preferida: unit })}
                        style={[styles.unitBtn, { backgroundColor: active ? theme.accentA : theme.bg3, borderColor: active ? theme.accent : theme.border }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Unidad ${unit}`}
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.unitBtnText, { color: active ? theme.accent : theme.text2 }]}>{unit}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[styles.fieldLabel, { color: theme.text3 }]}>Notas</Text>
                <TextInput
                  value={editing.notas_tecnica ?? ''}
                  onChangeText={(notas_tecnica) => setEditing({ ...editing, notas_tecnica })}
                  style={[styles.input, styles.notesInput, { color: theme.text1, borderColor: theme.border2, backgroundColor: theme.bg3 }]}
                  placeholderTextColor={theme.text4}
                  multiline
                />
              </View>

              <View style={styles.modalSave}>
                <BtnPrimary onPress={saveExercise} icon="check">Guardar cambios</BtnPrimary>
                <TouchableOpacity onPress={deactivateExercise} style={[styles.deleteBtn, { borderColor: theme.border2 }]}>
                  <Text style={[styles.deleteBtnText, { color: theme.text2 }]}>
                    {editing.id === 0 ? 'Descartar' : 'Quitar de rutina'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 100 },
  header: { padding: 20, paddingTop: 8, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.4 },
  addBtn: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sessionTabs: { paddingHorizontal: 20, paddingBottom: 14, gap: 8 },
  sessionPill: { minHeight: 48, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sessionPillText: { fontSize: 13, fontWeight: '800' },
  listCard: { marginHorizontal: 20, borderWidth: 1, borderRadius: RADII.r2, overflow: 'hidden' },
  exerciseRow: { minHeight: 72, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderBadge: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  orderText: { fontSize: 13, fontWeight: '900' },
  exerciseBody: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '800' },
  exerciseMeta: { fontSize: 12, marginTop: 3 },
  rowActions: { gap: 4, alignItems: 'flex-end' },
  rowActionBtn: { minHeight: 24, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  rowActionText: { fontSize: 11, fontWeight: '800' },
  modalSafe: { flex: 1 },
  modalHeader: { minHeight: 58, paddingHorizontal: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalHeaderBtn: { minWidth: 72, minHeight: 48, justifyContent: 'center' },
  modalHeaderText: { fontSize: 15, fontWeight: '700' },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalBody: { padding: 20, gap: 12, paddingBottom: 32 },
  editCard: { borderWidth: 1, borderRadius: RADII.r2, padding: 16, gap: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: RADII.r1, paddingHorizontal: 12, fontSize: 16, fontWeight: '700' },
  notesInput: { minHeight: 86, paddingTop: 12, textAlignVertical: 'top' },
  unitsRow: { flexDirection: 'row', gap: 8 },
  unitBtn: { flex: 1, minHeight: 48, borderRadius: RADII.r1, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  unitBtnText: { fontSize: 13, fontWeight: '900' },
  modalSave: { marginTop: 4, gap: 10 },
  deleteBtn: { minHeight: 48, borderRadius: RADII.r1, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 13, fontWeight: '800' },
});
