/**
 * AI Travel Planner — React Native App
 * ------------------------------------
 * Screens: Home → PlanTrip → Results | Weather | History
 *
 * Install deps:
 *   npx create-expo-app TravelPlanner --template blank
 *   cd TravelPlanner
 *   npx expo install @react-navigation/native @react-navigation/native-stack
 *   npx expo install react-native-screens react-native-safe-area-context
 *   npx expo install @expo/vector-icons
 *
 * Replace App.js with this file, then update GATEWAY_URL below.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, FlatList, SafeAreaView,
  KeyboardAvoidingView, Platform, Animated, Alert,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const GATEWAY_URL = 'http://localhost:8000'; // ← change to your backend URL

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  bg: '#0F1117',
  card: '#1A1D2E',
  accent: '#4F8EF7',
  accentSoft: '#1E3A6E',
  green: '#34C97B',
  yellow: '#F5C542',
  text: '#EAEAEA',
  muted: '#8892A4',
  border: '#2A2D3E',
  danger: '#E05C5C',
  font: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  mono: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
};

// ─── API HELPERS ──────────────────────────────────────────────────────────────
async function generatePlan({ source, destination, duration, budget, sessionId }) {
  const query = `Plan a ${duration} trip from ${source} to ${destination} under ${budget}`;
  const res = await fetch(`${GATEWAY_URL}/plans/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session_id: sessionId, source, destination }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

async function fetchWeather(city) {
  const res = await fetch(`${GATEWAY_URL}/weather?city=${encodeURIComponent(city)}`);
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  return res.json();
}

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
function Chip({ label, color = T.accent }) {
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function PrimaryButton({ title, onPress, loading, disabled, color = T.accent }) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, { backgroundColor: color, opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={styles.primaryBtnText}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

function InputField({ label, value, onChangeText, placeholder, keyboardType = 'default' }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        keyboardType={keyboardType}
      />
    </View>
  );
}

// ─── HOME SCREEN ─────────────────────────────────────────────────────────────
function HomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  const actions = [
    { icon: '✈️', label: 'Plan a Trip', screen: 'PlanTrip', color: T.accent },
    { icon: '🌤', label: 'Check Weather', screen: 'Weather', color: T.green },
    { icon: '📋', label: 'Trip History', screen: 'History', color: T.yellow },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.homeContainer}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.heroEmoji}>🌍</Text>
          <Text style={styles.heroTitle}>AI Travel{'\n'}Planner</Text>
          <Text style={styles.heroSubtitle}>Your intelligent trip companion</Text>

          <View style={styles.actionGrid}>
            {actions.map(a => (
              <TouchableOpacity
                key={a.screen}
                style={[styles.actionCard, { borderColor: a.color + '55' }]}
                onPress={() => navigation.navigate(a.screen)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionIcon}>{a.icon}</Text>
                <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Card style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Quick Tips</Text>
            <Text style={styles.tipsText}>• Plan trips up to 30 days in advance</Text>
            <Text style={styles.tipsText}>• Budget in ₹ for Indian destinations</Text>
            <Text style={styles.tipsText}>• Weather updates refresh every hour</Text>
          </Card>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── PLAN TRIP SCREEN ─────────────────────────────────────────────────────────
function PlanTripScreen({ navigation }) {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const sessionId = useRef(`rn_${Date.now()}`).current;

  const canSubmit = source && destination && duration && budget;

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generatePlan({ source, destination, duration, budget, sessionId });
      if (result.status !== 'success') throw new Error(result.message || 'Unknown error');
      navigation.navigate('Result', { plan: result.trip_plan, query: { source, destination, duration, budget } });
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not generate plan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.screenContainer}>
          <Text style={styles.screenTitle}>🗺 Plan Your Trip</Text>
          <Text style={styles.screenSubtitle}>Fill in the details below</Text>

          <Card>
            <InputField label="From" value={source} onChangeText={setSource} placeholder="e.g. Bangalore" />
            <InputField label="To" value={destination} onChangeText={setDestination} placeholder="e.g. Goa" />
            <InputField label="Duration" value={duration} onChangeText={setDuration} placeholder="e.g. 3 days" />
            <InputField label="Budget (₹)" value={budget} onChangeText={setBudget} placeholder="e.g. 15000" keyboardType="numeric" />
          </Card>

          <View style={styles.quickBudgets}>
            <Text style={styles.quickLabel}>Quick budgets:</Text>
            {['5000', '10000', '20000', '50000'].map(b => (
              <TouchableOpacity key={b} onPress={() => setBudget(b)}>
                <Chip label={`₹${b}`} color={budget === b ? T.accent : T.muted} />
              </TouchableOpacity>
            ))}
          </View>

          <PrimaryButton
            title="Generate Itinerary ✨"
            onPress={handleGenerate}
            loading={loading}
            disabled={!canSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── RESULT SCREEN ────────────────────────────────────────────────────────────
function ResultScreen({ route, navigation }) {
  const { plan, query } = route.params;

  const weather = plan?.weather;
  const itinerary = plan?.itinerary;

  function saveToHistory() {
    // In a real app you'd use AsyncStorage or a context/store
    Alert.alert('Saved!', 'Trip saved to history (demo)');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContainer}>
        <Text style={styles.screenTitle}>✈️ Your Itinerary</Text>

        <Card style={styles.summaryCard}>
          <Text style={styles.routeText}>{query.source} → {query.destination}</Text>
          <View style={styles.row}>
            <Chip label={query.duration} color={T.accent} />
            <Chip label={`₹${plan?.estimated_budget ?? query.budget}`} color={T.green} />
          </View>
        </Card>

        {weather && (
          <Card>
            <Text style={styles.sectionTitle}>🌤 Weather at Destination</Text>
            <Text style={styles.weatherCity}>{weather.city}</Text>
            <Text style={styles.weatherInfo}>{weather.temperature}  ·  {weather.condition}</Text>
          </Card>
        )}

        {plan?.budget_advice && (
          <Card>
            <Text style={styles.sectionTitle}>💡 Budget Tips</Text>
            <Text style={styles.bodyText}>{plan.budget_advice}</Text>
          </Card>
        )}

        {itinerary && (
          <Card>
            <Text style={styles.sectionTitle}>🗺 Day-by-Day</Text>
            {Array.isArray(itinerary)
              ? itinerary.map((item, i) => (
                  <View key={i} style={styles.itineraryRow}>
                    <View style={styles.itineraryDot} />
                    <Text style={styles.itineraryText}>{item}</Text>
                  </View>
                ))
              : <Text style={styles.bodyText}>{String(itinerary)}</Text>
            }
          </Card>
        )}

        <View style={styles.resultActions}>
          <PrimaryButton title="💾 Save Trip" onPress={saveToHistory} color={T.green} />
          <PrimaryButton
            title="🔄 Plan Another"
            onPress={() => navigation.navigate('PlanTrip')}
            color={T.accentSoft}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── WEATHER SCREEN ──────────────────────────────────────────────────────────
function WeatherScreen() {
  const [city, setCity] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFetch() {
    if (!city.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await fetchWeather(city.trim());
      setResult(data.weather ?? data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const popularCities = ['Mumbai', 'Delhi', 'Goa', 'Bangalore', 'Jaipur', 'Manali'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContainer}>
        <Text style={styles.screenTitle}>🌤 Weather Check</Text>

        <Card>
          <InputField label="City" value={city} onChangeText={setCity} placeholder="Enter city name" />
          <PrimaryButton title="Get Weather" onPress={handleFetch} loading={loading} disabled={!city.trim()} />
        </Card>

        <View style={styles.quickBudgets}>
          <Text style={styles.quickLabel}>Popular:</Text>
          {popularCities.map(c => (
            <TouchableOpacity key={c} onPress={() => setCity(c)}>
              <Chip label={c} color={city === c ? T.green : T.muted} />
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <Card><Text style={[styles.bodyText, { color: T.danger }]}>❌ {error}</Text></Card>
        ) : null}

        {result && (
          <Card style={styles.weatherCard}>
            <Text style={styles.weatherCity}>{result.city}</Text>
            <Text style={styles.weatherBig}>{result.temperature}</Text>
            <Text style={styles.weatherCondition}>{result.condition}</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── HISTORY SCREEN ──────────────────────────────────────────────────────────
function HistoryScreen() {
  // In a real app, read from AsyncStorage
  const demoHistory = [
    { source: 'Bangalore', destination: 'Goa', duration: '3 days', budget: '12000', date: '20 Mar 2026' },
    { source: 'Delhi', destination: 'Manali', duration: '5 days', budget: '20000', date: '18 Mar 2026' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContainer}>
        <Text style={styles.screenTitle}>📋 Trip History</Text>
        {demoHistory.length === 0 ? (
          <Card><Text style={styles.muted}>No trips saved yet.</Text></Card>
        ) : (
          demoHistory.map((h, i) => (
            <Card key={i} style={styles.historyCard}>
              <Text style={styles.routeText}>{h.source} → {h.destination}</Text>
              <View style={styles.row}>
                <Chip label={h.duration} color={T.accent} />
                <Chip label={`₹${h.budget}`} color={T.green} />
              </View>
              <Text style={styles.historyDate}>{h.date}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: T.card },
          headerTintColor: T.text,
          headerTitleStyle: { fontFamily: T.font, fontWeight: '700' },
          contentStyle: { backgroundColor: T.bg },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'AI Travel Planner', headerShown: false }} />
        <Stack.Screen name="PlanTrip" component={PlanTripScreen} options={{ title: 'Plan a Trip' }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Your Itinerary' }} />
        <Stack.Screen name="Weather" component={WeatherScreen} options={{ title: 'Weather' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: T.bg },

  // Home
  homeContainer: { padding: 24, paddingTop: 60 },
  heroEmoji: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  heroTitle: { fontSize: 42, fontFamily: T.font, fontWeight: '700', color: T.text, textAlign: 'center', lineHeight: 48 },
  heroSubtitle: { fontSize: 15, color: T.muted, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 24 },
  actionCard: { backgroundColor: T.card, borderWidth: 1, borderRadius: 16, padding: 20, alignItems: 'center', width: '44%' },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  tipsCard: { marginTop: 8 },
  tipsTitle: { color: T.yellow, fontWeight: '700', marginBottom: 8, fontSize: 14 },
  tipsText: { color: T.muted, fontSize: 13, lineHeight: 22 },

  // Shared screen layout
  screenContainer: { padding: 20, paddingBottom: 40 },
  screenTitle: { fontSize: 26, fontFamily: T.font, fontWeight: '700', color: T.text, marginBottom: 4 },
  screenSubtitle: { fontSize: 14, color: T.muted, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  bodyText: { color: T.text, fontSize: 14, lineHeight: 22 },
  muted: { color: T.muted, fontSize: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },

  // Card
  card: { backgroundColor: T.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: T.border },

  // Input
  inputWrap: { marginBottom: 14 },
  inputLabel: { color: T.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  input: { backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: T.text, fontSize: 15 },

  // Button
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Chip
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: '600' },

  // Quick budgets row
  quickBudgets: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 },
  quickLabel: { color: T.muted, fontSize: 12, fontWeight: '600' },

  // Result
  summaryCard: { },
  routeText: { fontSize: 20, fontWeight: '700', color: T.text, marginBottom: 8 },
  itineraryRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  itineraryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.accent, marginTop: 5, marginRight: 10 },
  itineraryText: { color: T.text, fontSize: 14, flex: 1, lineHeight: 20 },
  resultActions: { gap: 10, marginTop: 8 },

  // Weather
  weatherCard: { alignItems: 'center', paddingVertical: 28 },
  weatherCity: { fontSize: 22, fontWeight: '700', color: T.text, marginBottom: 8 },
  weatherBig: { fontSize: 48, color: T.green, fontWeight: '800', marginBottom: 4 },
  weatherCondition: { fontSize: 16, color: T.muted },
  weatherInfo: { color: T.muted, fontSize: 14, marginTop: 4 },

  // History
  historyCard: { },
  historyDate: { color: T.muted, fontSize: 12, marginTop: 8 },
});