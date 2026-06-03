import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useNutritionStore, Food, MealLog } from '../../stores/nutritionStore';
import { Colors } from '../../constants/theme';

type Unit = { label: string; abbr: string; toGrams: number };

const UNITS: Unit[] = [
  { label: 'grammi', abbr: 'g', toGrams: 1 },
  { label: 'millilitri', abbr: 'ml', toGrams: 1 },
  { label: 'tazza', abbr: 'tazza', toGrams: 240 },
  { label: 'cucchiaio', abbr: 'cucch.', toGrams: 15 },
  { label: 'cucchiaino', abbr: 'cucch.no', toGrams: 5 },
  { label: 'porzione', abbr: 'porz.', toGrams: 100 },
];

function toGrams(amount: number, unit: Unit): number {
  return amount * unit.toGrams;
}

export default function FoodSearchScreen() {
  const { mealType } = useLocalSearchParams<{ mealType: MealLog['mealType'] }>();
  const { searchResults, searching, searchFoods, addMealItem, clearSearch } = useNutritionStore();

  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<Unit>(UNITS[0]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { if (query.length >= 2) searchFoods(query); }, 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => () => clearSearch(), []);

  function selectFood(food: Food) {
    setSelectedFood(food);
    setAmount('100');
    setUnit(UNITS[0]);
  }

  async function handleAdd() {
    if (!selectedFood || !mealType) return;
    setAdding(true);
    try {
      const grams = toGrams(parseFloat(amount) || 1, unit);
      await addMealItem(mealType, selectedFood.id, grams);
      router.back();
    } finally {
      setAdding(false);
    }
  }

  const grams = toGrams(parseFloat(amount) || 0, unit);
  const previewKcal = selectedFood ? Math.round(selectedFood.calories * grams / 100) : 0;
  const previewProt = selectedFood ? Math.round(selectedFood.protein * grams / 100 * 10) / 10 : 0;

  const renderFood = useCallback(({ item }: { item: Food }) => (
    <TouchableOpacity style={styles.foodRow} onPress={() => selectFood(item)}>
      <View style={styles.foodInfo}>
        <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.foodMacros}>
          {item.calories} kcal · P {item.protein}g · C {item.carbs}g · G {item.fat}g
        </Text>
      </View>
      <Text style={styles.per100}>/ 100g</Text>
    </TouchableOpacity>
  ), []);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>CERCA ALIMENTO</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="es. pollo, riso, mela..."
          placeholderTextColor={Colors.textMuted}
          autoFocus
          returnKeyType="search"
        />
        {searching && <ActivityIndicator color={Colors.accent} style={styles.spinner} />}
      </View>

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={renderFood}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.length >= 2 && !searching ? (
            <Text style={styles.empty}>Nessun risultato per "{query}"</Text>
          ) : null
        }
      />

      {/* Quantity modal */}
      <Modal visible={!!selectedFood} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle} numberOfLines={2}>{selectedFood?.name}</Text>
            <Text style={styles.modalSub}>
              {selectedFood?.calories} kcal · P {selectedFood?.protein}g · C {selectedFood?.carbs}g · G {selectedFood?.fat}g — per 100g
            </Text>

            {/* Amount input */}
            <Text style={styles.sectionLabel}>QUANTITÀ</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />

            {/* Unit picker */}
            <Text style={styles.sectionLabel}>UNITÀ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u.abbr}
                  style={[styles.unitChip, unit.abbr === u.abbr && styles.unitChipActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitText, unit.abbr === u.abbr && styles.unitTextActive]}>
                    {u.label}
                  </Text>
                  <Text style={[styles.unitGrams, unit.abbr === u.abbr && styles.unitTextActive]}>
                    {u.toGrams}g
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Preview */}
            <View style={styles.preview}>
              <Text style={styles.previewEq}>
                {parseFloat(amount) || 0} {unit.abbr} = {Math.round(grams)}g
              </Text>
              <Text style={styles.previewKcal}>
                ≈ <Text style={{ color: Colors.accent }}>{previewKcal} kcal</Text>
                {'  '}P {previewProt}g
              </Text>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedFood(null)}>
                <Text style={styles.cancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={adding}>
                {adding
                  ? <ActivityIndicator color={Colors.background} />
                  : <Text style={styles.addText}>AGGIUNGI</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: Colors.accent, fontSize: 14 },
  title: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4, fontFamily: 'Orbitron_400Regular' },

  searchRow: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    color: Colors.text, fontSize: 15,
  },
  spinner: { marginLeft: 12 },

  foodRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  foodInfo: { flex: 1 },
  foodName: { color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  foodMacros: { color: Colors.textSecondary, fontSize: 12 },
  per100: { color: Colors.textMuted, fontSize: 11 },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { color: Colors.text, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  modalSub: { color: Colors.textSecondary, fontSize: 12, marginBottom: 20 },

  sectionLabel: {
    color: Colors.textSecondary, fontSize: 10, letterSpacing: 3,
    fontFamily: 'Orbitron_400Regular', marginBottom: 8, marginTop: 16,
  },
  amountInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.accent, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    color: Colors.text, fontSize: 28, fontWeight: '700', textAlign: 'center',
  },

  unitScroll: { flexGrow: 0, marginBottom: 4 },
  unitChip: {
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  unitChipActive: { borderColor: Colors.accent, backgroundColor: 'rgba(0,212,255,0.1)' },
  unitText: { color: Colors.textSecondary, fontSize: 13 },
  unitTextActive: { color: Colors.accent, fontWeight: '700' },
  unitGrams: { color: Colors.textMuted, fontSize: 10, marginTop: 1 },

  preview: {
    backgroundColor: 'rgba(0,212,255,0.06)', borderRadius: 8,
    padding: 14, marginTop: 16, alignItems: 'center', gap: 4,
  },
  previewEq: { color: Colors.textSecondary, fontSize: 13 },
  previewKcal: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700' },

  buttons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, alignItems: 'center',
  },
  cancelText: { color: Colors.textSecondary, fontSize: 14 },
  addBtn: {
    flex: 1, paddingVertical: 14, backgroundColor: Colors.accent,
    borderRadius: 8, alignItems: 'center',
  },
  addText: { color: Colors.background, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
});
