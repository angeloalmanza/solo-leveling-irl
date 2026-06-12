import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useNutritionStore, MealLog, MEAL_LABELS, MEAL_ORDER } from '../../stores/nutritionStore';
import { MacroBar } from '../../components/MacroBar';
import { Colors } from '../../constants/theme';

export default function NutritionScreen() {
  const { today, loading, fetchToday, removeMealItem, updateMealItem, photoParseFood, addMealItem, updateGoals, resetGoals } = useNutritionStore();
  const [photoLoading, setPhotoLoading] = useState<MealLog['mealType'] | null>(null);
  const [editItem, setEditItem] = useState<{ mealId: string; itemId: string; name: string } | null>(null);
  const [editQty, setEditQty] = useState('');
  const [savingQty, setSavingQty] = useState(false);

  function openEditItem(mealId: string, itemId: string, name: string, qty: number) {
    setEditItem({ mealId, itemId, name });
    setEditQty(String(Math.round(qty)));
  }

  async function handleSaveQty() {
    if (!editItem) return;
    const q = parseFloat(editQty.replace(',', '.'));
    if (isNaN(q) || q <= 0) { Alert.alert('Errore', 'Inserisci una quantità valida'); return; }
    setSavingQty(true);
    try {
      await updateMealItem(editItem.mealId, editItem.itemId, q);
      setEditItem(null);
    } catch {
      Alert.alert('Errore', 'Impossibile aggiornare la quantità');
    } finally {
      setSavingQty(false);
    }
  }
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goalCalories, setGoalCalories] = useState('');
  const [goalProtein, setGoalProtein] = useState('');
  const [goalCarbs, setGoalCarbs] = useState('');
  const [goalFat, setGoalFat] = useState('');
  const [savingGoals, setSavingGoals] = useState(false);

  function openGoalsModal() {
    const g = today?.goals;
    setGoalCalories(String(Math.round(g?.calories ?? 0)));
    setGoalProtein(String(Math.round(g?.protein ?? 0)));
    setGoalCarbs(String(Math.round(g?.carbs ?? 0)));
    setGoalFat(String(Math.round(g?.fat ?? 0)));
    setShowGoalsModal(true);
  }

  async function handleSaveGoals() {
    const c = parseFloat(goalCalories), p = parseFloat(goalProtein), ca = parseFloat(goalCarbs), f = parseFloat(goalFat);
    if ([c, p, ca, f].some((v) => isNaN(v) || v <= 0)) {
      Alert.alert('Errore', 'Tutti i valori devono essere positivi');
      return;
    }
    setSavingGoals(true);
    try {
      await updateGoals({ calories: c, protein: p, carbs: ca, fat: f });
      setShowGoalsModal(false);
    } finally {
      setSavingGoals(false);
    }
  }

  async function handleResetGoals() {
    setSavingGoals(true);
    try {
      await resetGoals();
      setShowGoalsModal(false);
    } finally {
      setSavingGoals(false);
    }
  }

  async function handlePhoto(mealType: MealLog['mealType']) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permesso negato', 'Consenti l\'accesso alla fotocamera nelle impostazioni'); return; }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.3,
      exif: false,
    });
    if (result.canceled || !result.assets[0].base64) return;
    setPhotoLoading(mealType);
    try {
      const items = await photoParseFood(result.assets[0].base64);
      for (const { food, grams } of items) {
        await addMealItem(mealType, food.id, grams);
      }
      Alert.alert('ANALISI COMPLETATA', `${items.length} alimento${items.length > 1 ? 'i' : ''} aggiunto${items.length > 1 ? 'i' : ''}`);
    } catch {
      Alert.alert('Errore', 'Impossibile analizzare la foto');
    } finally {
      setPhotoLoading(null);
    }
  }

  useEffect(() => { fetchToday(); }, []);

  if (loading && !today) {
    return <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>;
  }

  const goals = today?.goals;
  const totals = today?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const mealMap = MEAL_ORDER.reduce<Record<string, MealLog | undefined>>((acc, type) => {
    acc[type] = today?.meals.find((m) => m.mealType === type);
    return acc;
  }, {});

  return (
    <View style={styles.root}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchToday} tintColor={Colors.accent} />}
    >
      <Text style={styles.systemLabel}>[ NUTRITION TRACKER ]</Text>

      <View style={styles.macrosCard}>
        <View style={styles.macrosHeader}>
          <Text style={styles.macrosTitle}>OBIETTIVI GIORNALIERI</Text>
          <TouchableOpacity onPress={openGoalsModal} style={styles.editGoalsBtn}>
            <Text style={styles.editGoalsText}>✏</Text>
          </TouchableOpacity>
          {today?.rewardGiven && (
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardText}>+1 VIT ✓</Text>
            </View>
          )}
        </View>
        {goals ? (
          <>
            <MacroBar label="Calorie" unit="kcal" current={totals.calories} goal={goals.calories} />
            <MacroBar label="Proteine" unit="g" current={totals.protein} goal={goals.protein} />
            <MacroBar label="Carboidrati" unit="g" current={totals.carbs} goal={goals.carbs} />
            <MacroBar label="Grassi" unit="g" current={totals.fat} goal={goals.fat} />
          </>
        ) : (
          <Text style={styles.noGoals}>Obiettivi non disponibili</Text>
        )}
      </View>

      <View style={styles.divider} />

      {MEAL_ORDER.map((mealType) => {
        const meal = mealMap[mealType];
        return (
          <View key={mealType} style={styles.mealSection}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealTitle}>{MEAL_LABELS[mealType].toUpperCase()}</Text>
              {meal && (
                <Text style={styles.mealCalories}>{Math.round(meal.totals.calories)} kcal</Text>
              )}
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={() => handlePhoto(mealType)}
                disabled={photoLoading === mealType}
              >
                {photoLoading === mealType
                  ? <ActivityIndicator color={Colors.accent} size="small" />
                  : <Text style={styles.photoBtnText}>📷</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => router.push({ pathname: '/nutrition/search', params: { mealType } })}
              >
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {meal?.items.map((item) => (
              <View key={item.id} style={styles.foodItem}>
                <TouchableOpacity
                  style={styles.foodInfo}
                  onPress={() => openEditItem(meal.id, item.id, item.food.name, item.quantity)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.foodName} numberOfLines={1}>{item.food.name}  ✎</Text>
                  <Text style={styles.foodDetail}>
                    {item.quantity}g · {Math.round(item.itemCalories)} kcal · P {Math.round(item.food.protein * item.quantity / 100)}g
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeMealItem(meal.id, item.id)}
                >
                  <Text style={styles.removeBtnText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}

            {(!meal || meal.items.length === 0) && (
              <Text style={styles.emptyMeal}>Nessun alimento aggiunto</Text>
            )}
          </View>
        );
      })}
    </ScrollView>

    {/* Modal obiettivi */}

    <Modal visible={showGoalsModal} animationType="slide" transparent onRequestClose={() => setShowGoalsModal(false)}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>[ OBIETTIVI PERSONALIZZATI ]</Text>
            <TouchableOpacity onPress={() => setShowGoalsModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {[
            { label: 'Calorie (kcal)', value: goalCalories, set: setGoalCalories },
            { label: 'Proteine (g)', value: goalProtein, set: setGoalProtein },
            { label: 'Carboidrati (g)', value: goalCarbs, set: setGoalCarbs },
            { label: 'Grassi (g)', value: goalFat, set: setGoalFat },
          ].map(({ label, value, set }) => (
            <View key={label} style={styles.goalRow}>
              <Text style={styles.goalLabel}>{label}</Text>
              <TextInput
                style={styles.goalInput}
                value={value}
                onChangeText={set}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
            </View>
          ))}

          <TouchableOpacity style={styles.saveGoalsBtn} onPress={handleSaveGoals} disabled={savingGoals}>
            {savingGoals ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.saveGoalsBtnText}>SALVA OBIETTIVI</Text>}
          </TouchableOpacity>

          {today?.goals?.isCustom && (
            <TouchableOpacity style={styles.resetGoalsBtn} onPress={handleResetGoals} disabled={savingGoals}>
              <Text style={styles.resetGoalsBtnText}>Reimposta automatico (BMR/TDEE)</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {/* Modal modifica quantità alimento */}
    <Modal visible={!!editItem} animationType="slide" transparent onRequestClose={() => setEditItem(null)}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>[ MODIFICA QUANTITÀ ]</Text>
            <TouchableOpacity onPress={() => setEditItem(null)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.editItemName}>{editItem?.name}</Text>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Grammi</Text>
            <TextInput
              style={styles.goalInput}
              value={editQty}
              onChangeText={setEditQty}
              keyboardType="decimal-pad"
              selectTextOnFocus
              autoFocus
            />
          </View>
          <TouchableOpacity style={styles.saveGoalsBtn} onPress={handleSaveQty} disabled={savingQty}>
            {savingQty ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.saveGoalsBtnText}>SALVA</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },

  systemLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, marginBottom: 16 },

  macrosCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: 16, marginBottom: 8,
  },
  macrosHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  macrosTitle: { color: Colors.textSecondary, fontSize: 10, letterSpacing: 3, flex: 1 },
  rewardBadge: { backgroundColor: Colors.success + '22', borderWidth: 1, borderColor: Colors.success, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  rewardText: { color: Colors.success, fontSize: 11, fontWeight: '700' },
  noGoals: { color: Colors.textMuted, fontSize: 13 },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },

  mealSection: { marginBottom: 20 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mealTitle: { color: Colors.textSecondary, fontSize: 11, letterSpacing: 3, flex: 1 },
  mealCalories: { color: Colors.accent, fontSize: 12, fontWeight: '700', marginRight: 12 },
  addBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.accent + '22',
    borderWidth: 1, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: Colors.accent, fontSize: 18, lineHeight: 22, fontWeight: '700' },
  photoBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  photoBtnText: { fontSize: 16 },

  foodItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6,
  },
  foodInfo: { flex: 1 },
  foodName: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  foodDetail: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  removeBtn: { padding: 4 },
  removeBtnText: { color: Colors.textMuted, fontSize: 20, lineHeight: 20 },

  emptyMeal: { color: Colors.textMuted, fontSize: 12, paddingLeft: 4 },

  editGoalsBtn: { padding: 6 },
  editGoalsText: { color: Colors.textSecondary, fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: Colors.accent, fontSize: 10, letterSpacing: 3 },
  modalClose: { color: Colors.textMuted, fontSize: 18 },
  editItemName: { color: Colors.text, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  goalLabel: { color: Colors.textSecondary, fontSize: 13 },
  goalInput: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, color: Colors.text, fontSize: 16, fontWeight: '700', width: 100, textAlign: 'right' },
  saveGoalsBtn: { backgroundColor: Colors.accent, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveGoalsBtnText: { color: Colors.background, fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  resetGoalsBtn: { alignItems: 'center', paddingVertical: 12 },
  resetGoalsBtnText: { color: Colors.textMuted, fontSize: 12, textDecorationLine: 'underline' },
});
