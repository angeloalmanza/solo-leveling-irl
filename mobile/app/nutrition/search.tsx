import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useNutritionStore, Food, MealLog } from '../../stores/nutritionStore';
import { Colors } from '../../constants/theme';

export default function FoodSearchScreen() {
  const { mealType } = useLocalSearchParams<{ mealType: MealLog['mealType'] }>();
  const { searchResults, searching, searchFoods, addMealItem, clearSearch } = useNutritionStore();

  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { if (query.length >= 2) searchFoods(query); }, 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => () => clearSearch(), []);

  async function handleAdd() {
    if (!selectedFood || !mealType) return;
    setAdding(true);
    try {
      await addMealItem(mealType, selectedFood.id, parseFloat(quantity) || 100);
      router.back();
    } finally {
      setAdding(false);
    }
  }

  const renderFood = useCallback(({ item }: { item: Food }) => (
    <TouchableOpacity style={styles.foodRow} onPress={() => { setSelectedFood(item); setQuantity('100'); }}>
      <View style={styles.foodInfo}>
        <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.foodMacros}>
          {item.calories} kcal · P {item.protein}g · C {item.carbs}g · G {item.fat}g
        </Text>
      </View>
      <Text style={styles.per100}>per 100g</Text>
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

      <Modal visible={!!selectedFood} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{selectedFood?.name}</Text>
            <Text style={styles.modalSub}>
              {selectedFood?.calories} kcal · P {selectedFood?.protein}g · C {selectedFood?.carbs}g · G {selectedFood?.fat}g
            </Text>

            <Text style={styles.qLabel}>QUANTITÀ (grammi)</Text>
            <TextInput
              style={styles.qInput}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              selectTextOnFocus
            />

            {selectedFood && (
              <Text style={styles.preview}>
                ≈ {Math.round(selectedFood.calories * (parseFloat(quantity) || 0) / 100)} kcal
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedFood(null)}>
                <Text style={styles.cancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={adding}>
                {adding
                  ? <ActivityIndicator color={Colors.background} />
                  : <Text style={styles.addText}>AGGIUNGI</Text>
                }
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
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { paddingVertical: 4 },
  backText: { color: Colors.accent, fontSize: 14 },
  title: { color: Colors.textMuted, fontSize: 10, letterSpacing: 4 },

  searchRow: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24 },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSub: { color: Colors.textSecondary, fontSize: 13, marginBottom: 20 },
  qLabel: { color: Colors.textSecondary, fontSize: 11, letterSpacing: 3, marginBottom: 8 },
  qInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.accent, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    color: Colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center',
  },
  preview: { color: Colors.accent, fontSize: 13, textAlign: 'center', marginTop: 8 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontSize: 14 },
  addBtn: { flex: 1, paddingVertical: 14, backgroundColor: Colors.accent, borderRadius: 8, alignItems: 'center' },
  addText: { color: Colors.background, fontSize: 14, fontWeight: '800', letterSpacing: 2 },
});
