import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, FlatList, ActivityIndicator, Platform,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { fetchRestaurants, REGION_VIEW, type Restaurant } from "../lib/api";
import { RestaurantCard } from "../components/RestaurantCard";

const REGIONS = [
  { value: "all",    label: "All" },
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
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState<"map" | "list">("map");
  const [region, setRegion]           = useState("dmv");
  const [confidence, setConfidence]   = useState("");
  const [search, setSearch]           = useState("");
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    setLoading(true);
    fetchRestaurants({ state: region, confidence, search })
      .then(setRestaurants)
      .finally(() => setLoading(false));
  }, [region, confidence, search]);

  // Pan map when region changes
  useEffect(() => {
    const v = REGION_VIEW[region] ?? REGION_VIEW.dmv;
    mapRef.current?.animateToRegion({
      latitude: v.lat,
      longitude: v.lng,
      latitudeDelta: v.delta,
      longitudeDelta: v.delta,
    }, 600);
  }, [region]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🍛</Text>
          <View>
            <Text style={styles.headerTitle}>BuffetFindr</Text>
            <Text style={styles.headerSub}>
              {loading ? "Loading…" : `${restaurants.length} buffets`}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push("/submit")} style={styles.submitBtn}>
            <Ionicons name="add" size={16} color="#1c1c1e" />
            <Text style={styles.submitBtnText}>Submit</Text>
          </TouchableOpacity>
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, view === "map" && styles.toggleActive]}
              onPress={() => setView("map")}
            >
              <Ionicons name="map" size={13} color={view === "map" ? "#fff" : "#8e8e93"} />
              <Text style={[styles.toggleText, view === "map" && styles.toggleTextActive]}>Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, view === "list" && styles.toggleActive]}
              onPress={() => setView("list")}
            >
              <Ionicons name="list" size={13} color={view === "list" ? "#fff" : "#8e8e93"} />
              <Text style={[styles.toggleText, view === "list" && styles.toggleTextActive]}>List</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={15} color="#8e8e93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants..."
            placeholderTextColor="#8e8e93"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
          {REGIONS.map(r => (
            <TouchableOpacity
              key={r.value}
              style={[styles.pill, region === r.value && styles.pillActive]}
              onPress={() => setRegion(r.value)}
            >
              <Text style={[styles.pillText, region === r.value && styles.pillTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.pillDivider} />
          {CONFIDENCE.map(c => (
            <TouchableOpacity
              key={c.value}
              style={[styles.pill, styles.pillDark, confidence === c.value && styles.pillDarkActive]}
              onPress={() => setConfidence(c.value)}
            >
              <Text style={[styles.pillText, confidence === c.value && styles.pillTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Map view */}
      {view === "map" && (
        <View style={StyleSheet.absoluteFillObject}>
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
          >
            {restaurants.map(r => (
              r.lat && r.lng ? (
                <Marker
                  key={r.place_id}
                  coordinate={{ latitude: r.lat, longitude: r.lng }}
                  onPress={() => router.push(`/restaurant/${r.place_id}`)}
                >
                  <View style={[styles.markerPin, r.buffet_score >= 60 ? styles.markerHigh : styles.markerMed]}>
                    <Text style={styles.markerEmoji}>🍛</Text>
                  </View>
                </Marker>
              ) : null
            ))}
          </MapView>
        </View>
      )}

      {/* List view */}
      {view === "list" && (
        loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#f97316" size="large" />
          </View>
        ) : (
          <FlatList
            data={restaurants}
            keyExtractor={r => r.place_id}
            contentContainerStyle={styles.list}
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
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#fafaf8" },
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fafaf8" },
  headerLeft:     { flexDirection: "row", alignItems: "center", gap: 8 },
  headerEmoji:    { fontSize: 24 },
  headerTitle:    { fontSize: 16, fontWeight: "700", color: "#1c1c1e" },
  headerSub:      { fontSize: 11, color: "#8e8e93", marginTop: 1 },
  headerRight:    { flexDirection: "row", alignItems: "center", gap: 8 },
  submitBtn:      { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 20, borderWidth: 1, borderColor: "#e5e5ea", backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 5 },
  submitBtnText:  { fontSize: 12, fontWeight: "600", color: "#1c1c1e" },
  toggle:         { flexDirection: "row", borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#e5e5ea", backgroundColor: "#fff" },
  toggleBtn:      { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  toggleActive:   { backgroundColor: "#f97316" },
  toggleText:     { fontSize: 11, fontWeight: "600", color: "#8e8e93" },
  toggleTextActive: { color: "#fff" },
  filterBar:      { backgroundColor: "#fafaf8", paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  searchRow:      { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e5ea", paddingHorizontal: 10, height: 40 },
  searchIcon:     { marginRight: 6 },
  searchInput:    { flex: 1, fontSize: 14, color: "#1c1c1e" },
  pillRow:        { flexDirection: "row" },
  pill:           { borderRadius: 20, borderWidth: 1, borderColor: "#e5e5ea", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
  pillActive:     { backgroundColor: "#f97316", borderColor: "#f97316" },
  pillDark:       { borderColor: "#e5e5ea" },
  pillDarkActive: { backgroundColor: "#1c1c1e", borderColor: "#1c1c1e" },
  pillText:       { fontSize: 12, fontWeight: "600", color: "#8e8e93" },
  pillTextActive: { color: "#fff" },
  pillDivider:    { width: 1, backgroundColor: "#e5e5ea", marginHorizontal: 4, alignSelf: "center", height: 16 },
  markerPin:      { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  markerHigh:     { backgroundColor: "#f97316" },
  markerMed:      { backgroundColor: "#fb923c" },
  markerEmoji:    { fontSize: 14 },
  list:           { padding: 12, gap: 10 },
  centered:       { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText:      { textAlign: "center", color: "#8e8e93", marginTop: 40, fontSize: 15 },
});
