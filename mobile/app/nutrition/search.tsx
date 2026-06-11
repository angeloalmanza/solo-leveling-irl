import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert, Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useNutritionStore, Food, MealLog, SavedMeal } from '../../stores/nutritionStore';
import { Colors } from '../../constants/theme';

const EXAMPLES = [
  'pasta al sugo 200g',
  'pizza margherita una fetta',
  '2 uova strapazzate',
  'petto di pollo 150g',
  'yogurt greco con miele',
  'BigMac McDonald\'s',
  'cappuccino e cornetto',
  'insalata caesar',
];

interface ParsedResult {
  food: Food;
  grams: number;
}

export default function FoodSearchScreen() {
  const { mealType } = useLocalSearchParams<{ mealType: MealLog['mealType'] }>();
  const { aiParseFood, addMealItem, savedMeals, fetchSavedMeals, saveMeal, useSavedMeal, deleteSavedMeal } = useNutritionStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [addedMealLogId, setAddedMealLogId] = useState<string | null>(null);
  const [grams, setGrams] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => { fetchSavedMeals(); }, []);

  async function handleAnalyze() {
    const desc = input.trim();
    if (!desc) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const parsed = await aiParseFood(desc);
      setResult(parsed);
      setGrams(String(parsed.grams));
    } catch {
      setError('Il Sistema non ha riconosciuto l\'alimento. Riprova con una descrizione più precisa.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!result || !mealType) return;
    setAdding(true);
    try {
      const qty = Math.max(1, parseFloat(grams) || result.grams);
      await addMealItem(mealType, result.food.id, qty);
      router.back();
    } finally {
      setAdding(false);
    }
  }

  async function handleUseSaved(meal: SavedMeal) {
    if (!mealType) return;
    try {
      await useSavedMeal(meal.id, mealType);
      setShowSaved(false);
      router.back();
    } catch {
      Alert.alert('Errore', 'Impossibile caricare il pasto salvato');
    }
  }

  async function handleSaveMeal() {
    if (!addedMealLogId) return;
    Alert.prompt('SALVA PASTO', 'Dai un nome a questo pasto', async (name) => {
      if (!name?.trim()) return;
      try {
        await saveMeal(addedMealLogId, name.trim());
        Alert.alert('SALVATO', 'Pasto aggiunto ai preferiti');
      } catch {
        Alert.alert('Errore', 'Impossibile salvare il pasto');
      }
    });
  }

  const totalKcal = result
    ? Math.round(result.food.calories * (parseFloat(grams) || result.grams) / 100)
    : 0;
  const totalProt = result
    ? Math.round(result.food.protein * (parseFloat(grams) || result.grams) / 100 * 10) / 10
    : 0;
  const totalCarbs = result
    ? Math.round(result.food.carbs * (parseFloat(grams) || result.grams) / 100 * 10) / 10
    : 0;
  const totalFat = result
    ? Math.round(result.food.fat * (parseFloat(grams) || result.grams) / 100 * 10) / 10
    : 0;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>[ AI FOOD SCANNER ]</Text>
        <TouchableOpacity style={s.savedBtn} onPress={() => setShowSaved(true)}>
          <Text style={s.savedBtnText}>★ SALVATI</Text>
        </TouchableOpacity>
      </View>

      {/* Modal pasti salvati */}
      <Modal visible={showSaved} animationType="slide" transparent onRequestClose={() => setShowSaved(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>[ PASTI SALVATI ]</Text>
              <TouchableOpacity onPress={() => setShowSaved(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {savedMeals.length === 0 ? (
              <Text style={s.modalEmpty}>Nessun pasto salvato</Text>
            ) : (
              <ScrollView>
                {savedMeals.map((meal) => (
                  <View key={meal.id} style={s.savedRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.savedName}>{meal.name}</Text>
                      <Text style={s.savedItems}>{meal.items.length} aliment{meal.items.length === 1 ? 'o' : 'i'}</Text>
                    </View>
                    <TouchableOpacity style={s.useBtn} onPress={() => handleUseSaved(meal)}>
                      <Text style={s.useBtnText}>USA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.delBtn} onPress={() => deleteSavedMeal(meal.id)}>
                      <Text style={s.delBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>DESCRIVI CIÒ CHE HAI MANGIATO</Text>
        <Text style={s.sublabel}>
          Scrivi in modo naturale — quantità, piatto, fast food. L'AI calcola tutto.
        </Text>

        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={(t) => { setInput(t); setResult(null); setError(''); }}
            placeholder="es. pasta con il sugo 200g"
            placeholderTextColor={Colors.textMuted}
            multiline
            returnKeyType="done"
            onSubmitEditing={handleAnalyze}
          />
        </View>

        <TouchableOpacity
          style={[s.analyzeBtn, (!input.trim() || loading) && s.analyzeBtnDisabled]}
          onPress={handleAnalyze}
          disabled={!input.trim() || loading}
        >
          {loading ? (
            <View style={s.loadingRow}>
              <ActivityIndicator color={Colors.background} size="small" />
              <Text style={s.analyzeBtnText}>IL SISTEMA STA ANALIZZANDO...</Text>
            </View>
          ) : (
            <Text style={s.analyzeBtnText}>⚡ ANALIZZA CON AI</Text>
          )}
        </TouchableOpacity>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {!result && !loading && (
          <View style={s.examples}>
            <Text style={s.examplesLabel}>ESEMPI</Text>
            <View style={s.chips}>
              {EXAMPLES.map((ex) => (
                <TouchableOpacity
                  key={ex}
                  style={s.chip}
                  onPress={() => { setInput(ex); setResult(null); setError(''); }}
                >
                  <Text style={s.chipText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {result && (
          <View style={s.resultCard}>
            <View style={s.resultHeader}>
              <Text style={s.resultTag}>[ ALIMENTO RICONOSCIUTO ]</Text>
              <Text style={s.resultName}>{result.food.name}</Text>
              <Text style={s.resultPer}>Valori per 100g</Text>
              <View style={s.macroRow}>
                <MacroChip label="KCAL" value={result.food.calories} color={Colors.accent} />
                <MacroChip label="P" value={result.food.protein} color="#22c55e" unit="g" />
                <MacroChip label="C" value={result.food.carbs} color="#3b82f6" unit="g" />
                <MacroChip label="G" value={result.food.fat} color="#eab308" unit="g" />
              </View>
            </View>

            <View style={s.divider} />

            <Text style={s.qtyLabel}>QUANTITÀ (grammi)</Text>
            <TextInput
              style={s.qtyInput}
              value={grams}
              onChangeText={setGrams}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />

            <View style={s.totalBox}>
              <Text style={s.totalLabel}>TOTALE PORZIONE</Text>
              <View style={s.totalRow}>
                <TotalItem label="kcal" value={totalKcal} color={Colors.accent} />
                <TotalItem label="prot" value={totalProt} color="#22c55e" />
                <TotalItem label="carb" value={totalCarbs} color="#3b82f6" />
                <TotalItem label="grassi" value={totalFat} color="#eab308" />
              </View>
            </View>

            <TouchableOpacity style={s.addBtn} onPress={handleAdd} disabled={adding}>
              {adding
                ? <ActivityIndicator color={Colors.background} />
                : <Text style={s.addBtnText}>AGGIUNGI AL PASTO</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MacroChip({ label, value, color, unit = '' }: { label: string; value: number; color: string; unit?: string }) {
  return (
    <View style={[mc.chip, { borderColor: color }]}>
      <Text style={[mc.label, { color }]}>{label}</Text>
      <Text style={[mc.value, { color }]}>{value}{unit}</Text>
    </View>
  );
}

function TotalItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={ti.box}>
      <Text style={[ti.value, { color }]}>{value}</Text>
      <Text style={ti.label}>{label}</Text>
    </View>
  );
}

const mc = StyleSheet.create({
  chip: {
    flex: 1, borderWidth: 1, borderRadius: 6, padding: 8,
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)',
  },
  label: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  value: { fontSize: 14, fontWeight: '800', marginTop: 2 },
});

const ti = StyleSheet.create({
  box: { flex: 1, alignItems: 'center' },
  value: { fontSize: 20, fontWeight: '800' },
  label: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: Colors.accent, fontSize: 14 },
  headerTitle: { color: Colors.textMuted, fontSize: 10, letterSpacing: 3, fontFamily: 'Orbitron_400Regular' },

  content: { paddingHorizontal: 20, paddingBottom: 60 },

  label: { color: Colors.textSecondary, fontSize: 10, letterSpacing: 3, fontFamily: 'Orbitron_400Regular', marginBottom: 6 },
  sublabel: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 16 },

  inputRow: { marginBottom: 12 },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    color: Colors.text, fontSize: 16, minHeight: 60,
  },

  analyzeBtn: {
    backgroundColor: Colors.accent, borderRadius: 8,
    paddingVertical: 16, alignItems: 'center', marginBottom: 20,
  },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { color: Colors.background, fontSize: 12, fontWeight: '800', letterSpacing: 3, fontFamily: 'Orbitron_700Bold' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  error: { color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 16 },

  examples: { marginTop: 4 },
  examplesLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 3, marginBottom: 12, fontFamily: 'Orbitron_400Regular' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  chipText: { color: Colors.textSecondary, fontSize: 12 },

  resultCard: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.accent,
    borderRadius: 12, padding: 18, gap: 4,
  },
  resultHeader: { gap: 6 },
  resultTag: { color: Colors.accent, fontSize: 9, letterSpacing: 3, fontFamily: 'Orbitron_400Regular' },
  resultName: { color: Colors.text, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  resultPer: { color: Colors.textMuted, fontSize: 11, marginBottom: 8 },
  macroRow: { flexDirection: 'row', gap: 6 },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },

  qtyLabel: { color: Colors.textSecondary, fontSize: 10, letterSpacing: 3, fontFamily: 'Orbitron_400Regular', marginBottom: 8 },
  qtyInput: {
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.accent, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    color: Colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center',
    marginBottom: 16,
  },

  totalBox: {
    backgroundColor: 'rgba(0,212,255,0.05)', borderRadius: 8,
    padding: 14, marginBottom: 16,
  },
  totalLabel: { color: Colors.textMuted, fontSize: 9, letterSpacing: 3, fontFamily: 'Orbitron_400Regular', textAlign: 'center', marginBottom: 10 },
  totalRow: { flexDirection: 'row' },

  addBtn: {
    backgroundColor: Colors.accent, borderRadius: 8,
    paddingVertical: 16, alignItems: 'center',
  },
  addBtnText: { color: Colors.background, fontSize: 12, fontWeight: '800', letterSpacing: 3, fontFamily: 'Orbitron_700Bold' },

  savedBtn: { marginLeft: 'auto', borderWidth: 1, borderColor: Colors.warning, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  savedBtnText: { color: Colors.warning, fontSize: 9, letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: Colors.accent, fontSize: 11, letterSpacing: 3 },
  modalClose: { color: Colors.textMuted, fontSize: 18 },
  modalEmpty: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  savedName: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  savedItems: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  useBtn: { backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  useBtnText: { color: Colors.background, fontSize: 11, fontWeight: '800' },
  delBtn: { paddingHorizontal: 8 },
  delBtnText: { color: Colors.error, fontSize: 16 },
});
