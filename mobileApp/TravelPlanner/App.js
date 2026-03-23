/**
 * AI Travel Planner — React Native App (Redesigned)
 * --------------------------------------------------
 * FIX: Change GATEWAY_URL to your machine's local IP so QR scanning works.
 * Find your IP: run `ipconfig` on Windows → look for IPv4 under your WiFi adapter
 * Example: const GATEWAY_URL = 'http://192.168.1.42:8000';
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, SafeAreaView,
  KeyboardAvoidingView, Platform, Animated, Alert, StatusBar,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// ─── CONFIG ─────────────────────────────────────────────────────────────────
// ⚠️  Replace with your machine's local IP (run `ipconfig` → IPv4 Address)
// Example: 'http://192.168.1.42:8000'
const GATEWAY_URL = 'http://192.168.1.4:8000';

// ─── THEME ──────────────────────────────────────────────────────────────────
const T = {
  bg:         '#F7F6F2',
  surface:    '#FFFFFF',
  surfaceAlt: '#F0EEE9',
  border:     '#E5E2DA',
  accent:     '#2D6A4F',      // deep forest green
  accentSoft: '#D8EDDF',
  accentDark: '#1B4332',
  coral:      '#E07A5F',
  coralSoft:  '#FDECEA',
  gold:       '#C49A3C',
  goldSoft:   '#FDF3DC',
  text:       '#1A1A1A',
  textMid:    '#555550',
  muted:      '#9A9690',
  danger:     '#C0392B',
  font:       Platform.OS === 'ios' ? 'Georgia' : 'serif',
  sans:       Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
};

// ─── API ─────────────────────────────────────────────────────────────────────
async function generatePlan({ source, destination, duration, budget, sessionId }) {
  const res = await fetch(`${GATEWAY_URL}/plans/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `Plan a ${duration} trip from ${source} to ${destination} under ${budget}`,
      session_id: sessionId, source, destination,
    }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();
}

async function fetchWeather(city) {
  const res = await fetch(`${GATEWAY_URL}/weather?city=${encodeURIComponent(city)}`);
  if (!res.ok) throw new Error(`Weather error ${res.status}`);
  return res.json();
}

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
function Tag({ label, bg = T.accentSoft, color = T.accent }) {
  return (
    <View style={[s.tag, { backgroundColor: bg }]}>
      <Text style={[s.tagText, { color }]}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function Card({ children, style, accent }) {
  return (
    <View style={[s.card, accent && { borderLeftWidth: 3, borderLeftColor: T.accent }, style]}>
      {children}
    </View>
  );
}

function Btn({ title, onPress, loading, disabled, variant = 'primary', small }) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isDanger  = variant === 'danger';
  const bg = isPrimary ? T.accent : isDanger ? T.coral : 'transparent';
  const border = isOutline ? T.accent : 'transparent';
  const textColor = (isPrimary || isDanger) ? '#fff' : T.accent;

  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: bg, borderColor: border, borderWidth: isOutline ? 1.5 : 0,
        opacity: disabled ? 0.4 : 1, paddingVertical: small ? 10 : 14 }]}
      onPress={onPress} disabled={disabled || loading} activeOpacity={0.75}
    >
      {loading
        ? <ActivityIndicator color={isPrimary ? '#fff' : T.accent} size="small" />
        : <Text style={[s.btnText, { color: textColor, fontSize: small ? 13 : 15 }]}>{title}</Text>}
    </TouchableOpacity>
  );
}

function Field({ label, hint, value, onChangeText, placeholder, keyboard = 'default', multiline }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.fieldWrap}>
      <View style={s.fieldHeader}>
        <Text style={s.fieldLabel}>{label}</Text>
        {hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
      </View>
      <TextInput
        style={[s.field, focused && s.fieldFocused, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={T.muted}
        keyboardType={keyboard} multiline={multiline}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
    </View>
  );
}

// ─── HOME ────────────────────────────────────────────────────────────────────
function HomeScreen({ navigation }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const tiles = [
    { icon: '✈️', label: 'Plan a Trip',    sub: 'AI-powered itinerary',  screen: 'PlanTrip', bg: T.accentSoft,  color: T.accent },
    { icon: '🌤️', label: 'Weather',        sub: 'Check any city',        screen: 'Weather',  bg: T.goldSoft,    color: T.gold },
    { icon: '📋', label: 'Trip History',   sub: 'Your saved plans',      screen: 'History',  bg: T.coralSoft,   color: T.coral },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      <ScrollView contentContainerStyle={s.homeWrap} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>

          {/* Header */}
          <View style={s.homeHeader}>
            <Text style={s.homeEyebrow}>Good day 👋</Text>
            <Text style={s.homeTitle}>Where to{'\n'}next?</Text>
            <Text style={s.homeSub}>Your AI travel companion</Text>
          </View>

          {/* Tiles */}
          <View style={s.tileGrid}>
            {tiles.map(t => (
              <TouchableOpacity
                key={t.screen}
                style={[s.tile, { backgroundColor: t.bg }]}
                onPress={() => navigation.navigate(t.screen)}
                activeOpacity={0.8}
              >
                <Text style={s.tileIcon}>{t.icon}</Text>
                <Text style={[s.tileLabel, { color: t.color }]}>{t.label}</Text>
                <Text style={s.tileSub}>{t.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tips */}
          <Card style={s.tipsCard}>
            <Text style={s.tipsHead}>💡 Tips</Text>
            <Divider />
            {[
              'Enter budget in ₹ for Indian trips',
              'Duration like "3 days" or "1 week"',
              'Weather updates every hour',
            ].map((tip, i) => (
              <View key={i} style={s.tipRow}>
                <View style={s.tipDot} />
                <Text style={s.tipText}>{tip}</Text>
              </View>
            ))}
          </Card>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── PLAN TRIP ───────────────────────────────────────────────────────────────
function PlanTripScreen({ navigation }) {
  const [source, setSource]           = useState('');
  const [destination, setDestination] = useState('');
  const [duration, setDuration]       = useState('');
  const [budget, setBudget]           = useState('');
  const [loading, setLoading]         = useState(false);
  const sessionId = useRef(`rn_${Date.now()}`).current;

  const canSubmit = source.trim() && destination.trim() && duration.trim() && budget.trim();

  const quickDurations = ['1 day', '3 days', '5 days', '1 week'];
  const quickBudgets   = ['5000', '10000', '25000', '50000'];

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generatePlan({ source, destination, duration, budget, sessionId });
      if (result.status !== 'success') throw new Error(result.message || 'Unknown error');
      navigation.navigate('Result', {
        plan: result.trip_plan,
        query: { source, destination, duration, budget },
      });
    } catch (e) {
      Alert.alert('Could not generate plan', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.screenWrap} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          <Text style={s.screenTitle}>Plan Your Trip</Text>
          <Text style={s.screenSub}>Fill in the details and let AI do the rest</Text>

          <Card accent>
            <Field label="From" value={source} onChangeText={setSource} placeholder="e.g. Bangalore" />
            <Divider />
            <Field label="To" value={destination} onChangeText={setDestination} placeholder="e.g. Goa" />
            <Divider />
            <Field label="Duration" hint="e.g. 3 days" value={duration} onChangeText={setDuration} placeholder="How long?" />
            <Divider />
            <Field label="Budget" hint="in ₹" value={budget} onChangeText={setBudget} placeholder="e.g. 15000" keyboard="numeric" />
          </Card>

          <Section title="Quick Duration">
            <View style={s.quickRow}>
              {quickDurations.map(d => (
                <TouchableOpacity key={d} onPress={() => setDuration(d)}>
                  <Tag label={d}
                    bg={duration === d ? T.accent : T.surfaceAlt}
                    color={duration === d ? '#fff' : T.textMid} />
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          <Section title="Quick Budget (₹)">
            <View style={s.quickRow}>
              {quickBudgets.map(b => (
                <TouchableOpacity key={b} onPress={() => setBudget(b)}>
                  <Tag label={`₹${b}`}
                    bg={budget === b ? T.accent : T.surfaceAlt}
                    color={budget === b ? '#fff' : T.textMid} />
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          <Btn title="Generate Itinerary ✨" onPress={handleGenerate} loading={loading} disabled={!canSubmit} />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── RESULT ──────────────────────────────────────────────────────────────────
function ResultScreen({ route, navigation }) {
  const { plan, query } = route.params;
  const itinerary = plan?.itinerary;
  const weather   = plan?.weather;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.screenWrap} showsVerticalScrollIndicator={false}>

        <Text style={s.screenTitle}>Your Itinerary</Text>

        {/* Route banner */}
        <Card style={s.routeBanner}>
          <View style={s.routeRow}>
            <View style={s.routeCity}>
              <Text style={s.routeCityLabel}>FROM</Text>
              <Text style={s.routeCityName}>{query.source}</Text>
            </View>
            <Text style={s.routeArrow}>→</Text>
            <View style={[s.routeCity, { alignItems: 'flex-end' }]}>
              <Text style={s.routeCityLabel}>TO</Text>
              <Text style={s.routeCityName}>{query.destination}</Text>
            </View>
          </View>
          <Divider />
          <View style={s.tagRow}>
            <Tag label={`⏱ ${query.duration}`} />
            <Tag label={`₹ ${plan?.estimated_budget ?? query.budget}`} bg={T.goldSoft} color={T.gold} />
          </View>
        </Card>

        {/* Weather */}
        {weather && (
          <Card>
            <Text style={s.cardHead}>🌤 Weather at {weather.city}</Text>
            <View style={s.weatherRow}>
              <Text style={s.weatherTemp}>{weather.temperature}</Text>
              <Text style={s.weatherCond}>{weather.condition}</Text>
            </View>
          </Card>
        )}

        {/* Budget advice */}
        {plan?.budget_advice && (
          <Card accent>
            <Text style={s.cardHead}>💡 Budget Tips</Text>
            <Text style={s.bodyText}>{plan.budget_advice}</Text>
          </Card>
        )}

        {/* Itinerary */}
        {itinerary && (
          <Card>
            <Text style={s.cardHead}>🗺 Day-by-Day</Text>
            {(Array.isArray(itinerary) ? itinerary : [String(itinerary)]).map((item, i) => (
              <View key={i} style={s.dayRow}>
                <View style={s.dayBadge}><Text style={s.dayBadgeText}>{i + 1}</Text></View>
                <Text style={s.dayText}>{item}</Text>
              </View>
            ))}
          </Card>
        )}

        <View style={s.resultBtns}>
          <Btn title="Plan Another Trip" onPress={() => navigation.navigate('PlanTrip')} variant="outline" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── WEATHER ─────────────────────────────────────────────────────────────────
function WeatherScreen() {
  const [city, setCity]     = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const popular = ['Mumbai', 'Delhi', 'Goa', 'Bangalore', 'Jaipur', 'Manali', 'Chennai', 'Kolkata'];

  async function handleFetch() {
    if (!city.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await fetchWeather(city.trim());
      setResult(data.weather ?? data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.screenWrap} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <Text style={s.screenTitle}>Weather Check</Text>
        <Text style={s.screenSub}>Live conditions for any city</Text>

        <Card>
          <Field label="City" value={city} onChangeText={setCity} placeholder="Enter city name" />
          <Btn title="Check Weather" onPress={handleFetch} loading={loading} disabled={!city.trim()} />
        </Card>

        <Section title="Popular Cities">
          <View style={s.quickRow}>
            {popular.map(c => (
              <TouchableOpacity key={c} onPress={() => setCity(c)}>
                <Tag label={c}
                  bg={city === c ? T.gold : T.surfaceAlt}
                  color={city === c ? '#fff' : T.textMid} />
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {error ? (
          <Card style={{ backgroundColor: T.coralSoft }}>
            <Text style={[s.bodyText, { color: T.danger }]}>❌ {error}</Text>
          </Card>
        ) : null}

        {result && (
          <Card style={s.weatherBig}>
            <Text style={s.weatherBigCity}>{result.city}</Text>
            <Text style={s.weatherBigTemp}>{result.temperature}</Text>
            <Tag label={result.condition} bg={T.accentSoft} color={T.accent} />
          </Card>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────
function HistoryScreen({ navigation }) {
  const demo = [
    { source: 'Bangalore', destination: 'Goa',    duration: '3 days', budget: '12000', date: '20 Mar 2026' },
    { source: 'Delhi',     destination: 'Manali', duration: '5 days', budget: '20000', date: '18 Mar 2026' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.screenWrap} showsVerticalScrollIndicator={false}>

        <Text style={s.screenTitle}>Trip History</Text>
        <Text style={s.screenSub}>{demo.length} saved trips</Text>

        {demo.map((h, i) => (
          <Card key={i} accent style={{ marginBottom: 12 }}>
            <View style={s.historyTop}>
              <Text style={s.historyRoute}>{h.source} → {h.destination}</Text>
              <Text style={s.historyDate}>{h.date}</Text>
            </View>
            <View style={s.tagRow}>
              <Tag label={`⏱ ${h.duration}`} />
              <Tag label={`₹ ${h.budget}`} bg={T.goldSoft} color={T.gold} />
            </View>
          </Card>
        ))}

        {demo.length === 0 && (
          <Card>
            <Text style={[s.bodyText, { textAlign: 'center', color: T.muted, paddingVertical: 20 }]}>
              No trips saved yet.{'\n'}Plan your first trip!
            </Text>
            <Btn title="Plan a Trip" onPress={() => navigation.navigate('PlanTrip')} variant="outline" />
          </Card>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: T.surface },
          headerTintColor: T.accent,
          headerTitleStyle: { fontFamily: T.font, fontWeight: '700', color: T.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: T.bg },
        }}
      >
        <Stack.Screen name="Home"     component={HomeScreen}     options={{ headerShown: false }} />
        <Stack.Screen name="PlanTrip" component={PlanTripScreen} options={{ title: 'Plan a Trip' }} />
        <Stack.Screen name="Result"   component={ResultScreen}   options={{ title: 'Itinerary' }} />
        <Stack.Screen name="Weather"  component={WeatherScreen}  options={{ title: 'Weather' }} />
        <Stack.Screen name="History"  component={HistoryScreen}  options={{ title: 'History' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: T.bg },

  // Home
  homeWrap:   { padding: 24, paddingTop: 56, paddingBottom: 40 },
  homeHeader: { marginBottom: 32 },
  homeEyebrow:{ fontFamily: T.sans, fontSize: 13, color: T.accent, fontWeight: '600',
                letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  homeTitle:  { fontFamily: T.font, fontSize: 44, fontWeight: '700', color: T.text,
                lineHeight: 50, marginBottom: 6 },
  homeSub:    { fontFamily: T.sans, fontSize: 14, color: T.muted },

  tileGrid:   { gap: 12, marginBottom: 24 },
  tile:       { borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tileIcon:   { fontSize: 28 },
  tileLabel:  { fontFamily: T.sans, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  tileSub:    { fontFamily: T.sans, fontSize: 12, color: T.textMid },

  tipsCard:   { marginTop: 4 },
  tipsHead:   { fontFamily: T.sans, fontSize: 13, fontWeight: '700', color: T.text, marginBottom: 10 },
  tipRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  tipDot:     { width: 5, height: 5, borderRadius: 3, backgroundColor: T.accent },
  tipText:    { fontFamily: T.sans, fontSize: 13, color: T.textMid, flex: 1 },

  // Screen shell
  screenWrap: { padding: 20, paddingBottom: 48 },
  screenTitle:{ fontFamily: T.font, fontSize: 28, fontWeight: '700', color: T.text, marginBottom: 4 },
  screenSub:  { fontFamily: T.sans, fontSize: 14, color: T.muted, marginBottom: 20 },

  // Card
  card:       { backgroundColor: T.surface, borderRadius: 14, padding: 16,
                marginBottom: 14, borderWidth: 1, borderColor: T.border },

  // Section
  section:    { marginBottom: 16 },
  sectionLabel:{ fontFamily: T.sans, fontSize: 11, fontWeight: '700', color: T.muted,
                 textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },

  // Divider
  divider:    { height: 1, backgroundColor: T.border, marginVertical: 12 },

  // Field
  fieldWrap:  { marginBottom: 4 },
  fieldHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  fieldLabel: { fontFamily: T.sans, fontSize: 12, fontWeight: '600', color: T.textMid,
                textTransform: 'uppercase', letterSpacing: 0.8 },
  fieldHint:  { fontFamily: T.sans, fontSize: 11, color: T.muted },
  field:      { backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.border,
                borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11,
                fontFamily: T.sans, fontSize: 15, color: T.text },
  fieldFocused:{ borderColor: T.accent, backgroundColor: T.surface },

  // Button
  btn:        { borderRadius: 10, paddingVertical: 14, alignItems: 'center',
                justifyContent: 'center', marginTop: 6 },
  btnText:    { fontFamily: T.sans, fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },

  // Tag / chip
  tag:        { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, marginBottom: 6 },
  tagText:    { fontFamily: T.sans, fontSize: 12, fontWeight: '600' },
  tagRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  quickRow:   { flexDirection: 'row', flexWrap: 'wrap' },

  // Result
  routeBanner:{ },
  routeRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeCity:  { flex: 1 },
  routeCityLabel: { fontFamily: T.sans, fontSize: 10, fontWeight: '700', color: T.muted,
                    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  routeCityName:  { fontFamily: T.font, fontSize: 20, fontWeight: '700', color: T.text },
  routeArrow: { fontFamily: T.sans, fontSize: 22, color: T.accent, paddingHorizontal: 12 },
  cardHead:   { fontFamily: T.sans, fontSize: 13, fontWeight: '700', color: T.textMid,
                textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  weatherRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  weatherTemp:{ fontFamily: T.font, fontSize: 36, fontWeight: '700', color: T.text },
  weatherCond:{ fontFamily: T.sans, fontSize: 15, color: T.muted },
  bodyText:   { fontFamily: T.sans, fontSize: 14, color: T.textMid, lineHeight: 22 },
  dayRow:     { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  dayBadge:   { width: 24, height: 24, borderRadius: 12, backgroundColor: T.accentSoft,
                alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  dayBadgeText:{ fontFamily: T.sans, fontSize: 11, fontWeight: '700', color: T.accent },
  dayText:    { fontFamily: T.sans, fontSize: 14, color: T.text, flex: 1, lineHeight: 21 },
  resultBtns: { gap: 8, marginTop: 4 },

  // Weather
  weatherBig:     { alignItems: 'center', paddingVertical: 24 },
  weatherBigCity: { fontFamily: T.font, fontSize: 24, fontWeight: '700', color: T.text, marginBottom: 6 },
  weatherBigTemp: { fontFamily: T.font, fontSize: 52, fontWeight: '700', color: T.accent, marginBottom: 12 },

  // History
  historyTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  historyRoute:{ fontFamily: T.font, fontSize: 17, fontWeight: '700', color: T.text, flex: 1 },
  historyDate: { fontFamily: T.sans, fontSize: 11, color: T.muted, marginTop: 2 },
});