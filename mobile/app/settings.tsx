import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Switch, ActivityIndicator, Alert, Platform, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import {
  requestPermissions, scheduleDailyReminder, cancelAllReminders,
  getSavedSettings, saveSettings, notificationsAvailable,
} from '../lib/notifications';
import { api } from '../lib/api';
import { useUiStore } from '../stores/uiStore';
import { Colors } from '../constants/theme';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export default function SettingsScreen() {
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goals, setGoals] = useState(['', '', '']);
  const [savingGoals, setSavingGoals] = useState(false);

  useEffect(() => {
    getSavedSettings().then(({ hour: h, minute: m, enabled: e }) => {
      setHour(h); setMinute(m); setEnabled(e);
      setLoading(false);
    });
    api.get<{ goals: string[] }>('/character/goals')
      .then(({ data }) => {
        const g = data.goals ?? [];
        setGoals([g[0] ?? '', g[1] ?? '', g[2] ?? '']);
      })
      .catch(() => { /* nessun obiettivo o offline */ });
  }, []);

  async function handleSaveGoals() {
    const cleaned = goals.map((g) => g.trim()).filter(Boolean).slice(0, 3);
    const prev = goals;
    setSavingGoals(true);
    try {
      await api.patch('/character/goals', { goals: cleaned });
      useUiStore.getState().showToast('Obiettivi aggiornati', 'success');
    } catch {
      setGoals(prev); // rollback
      useUiStore.getState().showToast('Impossibile salvare gli obiettivi', 'error');
    } finally {
      setSavingGoals(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const granted = await requestPermissions();
      if (!granted && enabled) {
        Alert.alert('Permesso negato', 'Abilita le notifiche nelle impostazioni del dispositivo.');
        setSaving(false);
        return;
      }
      await saveSettings(hour, minute, enabled);
      if (enabled && granted) {
        await scheduleDailyReminder(hour, minute);
        Alert.alert('SALVATO', `Promemoria impostato alle ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ogni giorno.`);
      } else {
        await cancelAllReminders();
        Alert.alert('SALVATO', 'Notifiche disabilitate.');
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={Colors.accent} /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Text style={s.backText}>← INDIETRO</Text>
      </TouchableOpacity>

      <Text style={s.pageLabel}>[ IMPOSTAZIONI ]</Text>

      {!notificationsAvailable && (
        <View style={s.banner}>
          <Text style={s.bannerText}>
            Le notifiche non sono disponibili in Expo Go su Android dall'SDK 53. Usa un development build per abilitarle.
          </Text>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionLabel}>NOTIFICHE PUSH</Text>

        <View style={s.row}>
          <Text style={s.rowLabel}>Abilita promemoria giornaliero</Text>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: Colors.border, true: Colors.accent }}
            thumbColor={enabled ? '#fff' : Colors.textMuted}
          />
        </View>

        {enabled && (
          <>
            <Text style={s.pickerLabel}>ORA DEL PROMEMORIA</Text>
            <View style={s.pickerRow}>
              <View style={s.pickerWrap}>
                <Text style={s.pickerTitle}>Ora</Text>
                <Picker
                  selectedValue={hour}
                  onValueChange={(v) => setHour(Number(v))}
                  style={s.picker}
                  itemStyle={s.pickerItem}
                  dropdownIconColor={Colors.accent}
                >
                  {HOURS.map((h) => (
                    <Picker.Item key={h} label={String(h).padStart(2, '0')} value={h} color={Platform.OS === 'android' ? Colors.text : undefined} />
                  ))}
                </Picker>
              </View>
              <Text style={s.pickerSep}>:</Text>
              <View style={s.pickerWrap}>
                <Text style={s.pickerTitle}>Minuti</Text>
                <Picker
                  selectedValue={minute}
                  onValueChange={(v) => setMinute(Number(v))}
                  style={s.picker}
                  itemStyle={s.pickerItem}
                  dropdownIconColor={Colors.accent}
                >
                  {MINUTES.map((m) => (
                    <Picker.Item key={m} label={String(m).padStart(2, '0')} value={m} color={Platform.OS === 'android' ? Colors.text : undefined} />
                  ))}
                </Picker>
              </View>
            </View>
            <Text style={s.hint}>
              Riceverai una notifica ogni giorno alle {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
            </Text>
          </>
        )}
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={Colors.background} /> : <Text style={s.saveBtnText}>SALVA</Text>}
      </TouchableOpacity>

      <View style={[s.section, { marginTop: 24 }]}>
        <Text style={s.sectionLabel}>OBIETTIVI (MAX 3)</Text>
        <Text style={s.hint}>
          Le quest giornaliere includeranno passi concreti verso questi obiettivi.
        </Text>
        {goals.map((g, i) => (
          <TextInput
            key={i}
            style={s.goalInput}
            value={g}
            onChangeText={(t) => setGoals((prev) => prev.map((v, j) => (j === i ? t : v)))}
            placeholder={`Obiettivo ${i + 1}`}
            placeholderTextColor={Colors.textMuted}
            maxLength={100}
          />
        ))}
        <TouchableOpacity style={s.saveBtn} onPress={handleSaveGoals} disabled={savingGoals}>
          {savingGoals ? <ActivityIndicator color={Colors.background} /> : <Text style={s.saveBtnText}>SALVA OBIETTIVI</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: 56, paddingBottom: 60, paddingHorizontal: 24 },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },

  back: { marginBottom: 8 },
  backText: { color: Colors.accent, fontSize: 11, letterSpacing: 2 },
  pageLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, marginBottom: 28 },

  section: { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 24 },
  sectionLabel: { color: Colors.textSecondary, fontSize: 10, letterSpacing: 3, marginBottom: 16 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  rowLabel: { color: Colors.text, fontSize: 14, flex: 1 },

  pickerLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerWrap: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  pickerTitle: { color: Colors.textMuted, fontSize: 9, letterSpacing: 2, textAlign: 'center', paddingTop: 8 },
  picker: { color: Colors.text, height: 120 },
  pickerItem: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  pickerSep: { color: Colors.accent, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  hint: { color: Colors.textMuted, fontSize: 11, marginTop: 10, textAlign: 'center' },

  saveBtn: { backgroundColor: Colors.accent, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: Colors.background, fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  goalInput: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14, marginTop: 10 },

  banner: { backgroundColor: '#1a1000', borderWidth: 1, borderColor: Colors.warning, borderRadius: 8, padding: 12, marginBottom: 20 },
  bannerText: { color: Colors.warning, fontSize: 12, lineHeight: 18 },
});
