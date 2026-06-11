import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useNutritionStore, MealLog, MEAL_LABELS, MEAL_ORDER } from '../../stores/nutritionStore';
import { MacroBar } from '../../components/MacroBar';
import { Colors } from '../../constants/theme';

export default function NutritionScreen() {
  const { today, loading, fetchToday, removeMealItem, photoParseFood, addMealItem } = useNutritionStore();
  const [photoLoading, setPhotoLoading] = useState<MealLog['mealType'] | null>(null);

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchToday} tintColor={Colors.accent} />}
    >
      <Text style={styles.systemLabel}>[ NUTRITION TRACKER ]</Text>

      <View style={styles.macrosCard}>
        <View style={styles.macrosHeader}>
          <Text style={styles.macrosTitle}>OBIETTIVI GIORNALIERI</Text>
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
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName} numberOfLines={1}>{item.food.name}</Text>
                  <Text style={styles.foodDetail}>
                    {item.quantity}g · {Math.round(item.itemCalories)} kcal · P {Math.round(item.food.protein * item.quantity / 100)}g
                  </Text>
                </View>
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
  );
}

const styles = StyleSheet.create({
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
});
