import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, FlatList, ActivityIndicator, Platform, Animated,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { fetchRestaurants, REGION_VIEW, type Restaurant } from "../lib/api";
import { RestaurantCard } from "../components/RestaurantCard";

const REGIONS = [
  { value: "all",    label: "All"    },
  { value: "dmv",    label: "DMV"    },
  { value: "boston", label: "Boston" },
  { value: "nyc",    label: "NYC"    },
];

const CONFIDENCE = [
  { value: "",      label: "All"      },
  { value: "HIGH",  label: "Verified" },
  { value: "MEDIUM",label: "Likely"   },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<"map" | "list">("map");
  const [region, setRegion]           = useState("dmv");
  const [confidence, setConfidence]   = useState("");
  const [search, setSearch]           = useState("");
  const mapRef = useRef<MapView>(null);
  const currentRegion = useRef({
    latitude: REGION_VIEW.dmv.lat,
    longitude: REGION_VIEW.dmv.lng,
    latitudeDelta: REGION_VIEW.dmv.delta,
    longitudeDelta: REGION_VIEW.dmv.delta,
  });

  useEffect(() => {
    setLoading(true);
    fetchRestaurants({ state: region, confidence, search })
      .then(setRestaurants)
      .finally(() => setLoading(false));
  }, [region, confidence, search]);

  useEffect(() => {
    const v = REGION_VIEW[region] ?? REGION_VIEW.dmv;
    const r = { latitude: v.lat, longitude: v.lng, latitudeDelta: v.delta, longitudeDelta: v.delta };
    currentRegion.current = r;
    mapRef.current?.animateToRegion(r, 600);
  }, [region]);

  const zoomIn = () => {
    const r = {
      ...currentRegion.current,
      latitudeDelta:  Math.max(currentRegion.current.latitudeDelta  / 2, 0.002),
      longitudeDelta: Math.max(currentRegion.current.longitudeDelta / 2, 0.002),
    };
    currentRegion.current = r;
    mapRef.current?.animateToRegion(r, 250);
  };

  const zoomOut = () => {
    const r = {
      ...currentRegion.current,
      latitudeDelta:  Math.min(currentRegion.current.latitudeDelta  * 2, 60),
      longitudeDelta: Math.min(currentRegion.current.longitudeDelta * 2, 60),
    };
    currentRegion.current = r;
    mapRef.current?.animateToRegion(r, 250);
  };

  return (
    <View style={styles.root}>
      {/* ── Full-screen map (always rendered as background) ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: REGION_VIEW.dmv.lat,
          longitude: REGION_VIEW.dmv.lng,
          latitudeDelta: REGION_VIEW.dmv.delta,
          longitudeDelta: REGION_VIEW.dmv.delta,
        }}
        showsUserLocation
        onRegionChange={r => { currentRegion.current = r; }}
      >
        {restaurants.map(r =>
          r.lat && r.lng ? (
            <Marker
              key={r.place_id}
              coordinate={{ latitude: r.lat, longitude: r.lng }}
              onPress={() => router.push(`/restaurant/${r.place_id}`)}
            >
              <View style={[styles.pin, r.buffet_score >= 60 ? styles.pinHigh : styles.pinMed]}>
                <Text style={styles.pinEmoji}>🍛</Text>
              </View>
            </Marker>
          ) : null
        )}
      </MapView>

      {/* ── List view slides over the map ── */}
      {tab === "list" && (
        <View style={[styles.listOverlay, { paddingTop: insets.top + 60 }]}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#f97316" size="large" />
            </View>
          ) : (
            <FlatList
              data={restaurants}
              keyExtractor={r => r.place_id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <RestaurantCard
                  restaurant={item}
                  onPress={() => router.push(`/restaurant/${item.place_id}`)}
                />
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No buffets found.</Text>
              }
            />
          )}
        </View>
      )}

      {/* ── Floating header (always on top) ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {/* App title */}
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🍛</Text>
          <View>
            <Text style={styles.headerTitle}>BuffetFindr</Text>
            <Text style={styles.headerSub}>
              {loading ? "Loading…" : `${restaurants.length} buffets`}
            </Text>
          </View>
        </View>

        {/* Map / List toggle */}
        <View style={styles.segControl}>
          <TouchableOpacity
            style={[styles.segBtn, tab === "map" && styles.segBtnActive]}
            onPress={() => setTab("map")}
          >
            <Ionicons name="map-outline" size={14} color={tab === "map" ? "#fff" : "#8e8e93"} />
            <Text style={[styles.segText, tab === "map" && styles.segTextActive]}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segBtn, tab === "list" && styles.segBtnActive]}
            onPress={() => setTab("list")}
          >
            <Ionicons name="list-outline" size={14} color={tab === "list" ? "#fff" : "#8e8e93"} />
            <Text style={[styles.segText, tab === "list" && styles.segTextActive]}>List</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Filter bar (floating, below header) ── */}
      <View style={[styles.filterBar, { top: insets.top + 68 }]}>
        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={14} color="#8e8e93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants..."
            placeholderTextColor="#8e8e93"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {/* Region + confidence pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
          {REGIONS.map(r => (
            <TouchableOpacity
              key={r.value}
              style={[styles.pill, region === r.value && styles.pillActiveOrange]}
              onPress={() => setRegion(r.value)}
            >
              <Text style={[styles.pillText, region === r.value && styles.pillTextWhite]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.pillDivider} />
          {CONFIDENCE.map(c => (
            <TouchableOpacity
              key={c.value}
              style={[styles.pill, confidence === c.value && styles.pillActiveDark]}
              onPress={() => setConfidence(c.value)}
            >
              <Text style={[styles.pillText, confidence === c.value && styles.pillTextWhite]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Zoom buttons (map mode only) ── */}
      {tab === "map" && (
        <View style={[styles.zoomControls, { bottom: insets.bottom + 72 }]}>
          <TouchableOpacity style={styles.zoomBtn} onPress={zoomIn} activeOpacity={0.75}>
            <Ionicons name="add" size={22} color="#1c1c1e" />
          </TouchableOpacity>
          <View style={styles.zoomDivider} />
          <TouchableOpacity style={styles.zoomBtn} onPress={zoomOut} activeOpacity={0.75}>
            <Ionicons name="remove" size={22} color="#1c1c1e" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom tab bar ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab("map")}>
          <Ionicons name={tab === "map" ? "map" : "map-outline"} size={22}
            color={tab === "map" ? "#f97316" : "#8e8e93"} />
          <Text style={[styles.tabLabel, tab === "map" && styles.tabLabelActive]}>Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setTab("list")}>
          <Ionicons name={tab === "list" ? "list" : "list-outline"} size={22}
            color={tab === "list" ? "#f97316" : "#8e8e93"} />
          <Text style={[styles.tabLabel, tab === "list" && styles.tabLabelActive]}>List</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/submit")}>
          <Ionicons name="add-circle-outline" size={22} color="#8e8e93" />
          <Text style={styles.tabLabel}>Submit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: "#fafaf8" },

  // Header
  header:       { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8, backgroundColor: "rgba(250,250,248,0.92)" },
  headerLeft:   { flexDirection: "row", alignItems: "center", gap: 8 },
  headerEmoji:  { fontSize: 22 },
  headerTitle:  { fontSize: 15, fontWeight: "700", color: "#1c1c1e" },
  headerSub:    { fontSize: 10, color: "#8e8e93", marginTop: 1 },
  segControl:   { flexDirection: "row", borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#e5e5ea", backgroundColor: "#fff" },
  segBtn:       { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 6 },
  segBtnActive: { backgroundColor: "#f97316" },
  segText:      { fontSize: 12, fontWeight: "600", color: "#8e8e93" },
  segTextActive:{ color: "#fff" },

  // Filter bar
  filterBar:    { position: "absolute", left: 0, right: 0, zIndex: 20, paddingHorizontal: 12, gap: 6 },
  searchRow:    { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e5ea", paddingHorizontal: 10, height: 38, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  searchInput:  { flex: 1, fontSize: 14, color: "#1c1c1e" },
  pillScroll:   { flexDirection: "row" },
  pill:         { borderRadius: 20, borderWidth: 1, borderColor: "#e5e5ea", backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  pillActiveOrange: { backgroundColor: "#f97316", borderColor: "#f97316" },
  pillActiveDark:   { backgroundColor: "#1c1c1e", borderColor: "#1c1c1e" },
  pillText:     { fontSize: 12, fontWeight: "600", color: "#6b6b6b" },
  pillTextWhite:{ color: "#fff" },
  pillDivider:  { width: 1, backgroundColor: "#e5e5ea", marginHorizontal: 4, alignSelf: "center", height: 16 },

  // Map markers
  pin:          { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  pinHigh:      { backgroundColor: "#f97316" },
  pinMed:       { backgroundColor: "#fb923c" },
  pinEmoji:     { fontSize: 14 },

  // List overlay
  listOverlay:  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, backgroundColor: "#fafaf8" },
  listContent:  { paddingHorizontal: 12, paddingTop: 100, paddingBottom: 100, gap: 10 },
  centered:     { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 120 },
  emptyText:    { textAlign: "center", color: "#8e8e93", marginTop: 60, fontSize: 15 },

  // Zoom controls
  zoomControls: { position: "absolute", right: 14, zIndex: 25, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e5ea", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 6, overflow: "hidden" },
  zoomBtn:      { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  zoomDivider:  { height: 1, backgroundColor: "#e5e5ea", marginHorizontal: 8 },

  // Bottom tab bar
  tabBar:       { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 30, flexDirection: "row", backgroundColor: "rgba(255,255,255,0.97)", borderTopWidth: 1, borderTopColor: "#e5e5ea", paddingTop: 8 },
  tabItem:      { flex: 1, alignItems: "center", gap: 3 },
  tabLabel:     { fontSize: 10, fontWeight: "500", color: "#8e8e93" },
  tabLabelActive:{ color: "#f97316" },
});
