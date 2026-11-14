import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, FlatList, ActivityIndicator, Alert, Linking,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Image as RNImage } from "react-native";
import { fetchRestaurantPage, clearRestaurantCache, type Restaurant } from "../lib/api";
import { ALL_REGION_KEY, ALL_VIEW, regionLabel, regionView } from "../lib/regions";
import { clusterRestaurants, regionForCluster, distanceMiles, type ViewRegion } from "../lib/cluster";
import { RestaurantCard } from "../components/RestaurantCard";
import { RegionPicker } from "../components/RegionPicker";

const CONFIDENCE = [
  { value: "",      label: "All"      },
  { value: "HIGH",  label: "Verified" },
  { value: "MEDIUM",label: "Likely"   },
];

// Same options as the web filter bar; only offered while "Buffets" is on.
const SCHEDULES = [
  { value: "",             label: "Any day" },
  { value: "WEEKEND_ONLY", label: "Weekend" },
  { value: "WEEKDAY_ONLY", label: "Weekday" },
  { value: "BOTH",         label: "Daily"   },
];

const INITIAL_VIEW: ViewRegion = {
  latitude: ALL_VIEW.lat,
  longitude: ALL_VIEW.lng,
  latitudeDelta: ALL_VIEW.delta,
  longitudeDelta: ALL_VIEW.delta,
};

/** Map span (degrees) used when centring on the user. */
const NEAR_ME_DELTA = 0.6;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const openRestaurant = (placeId: string) => router.push(`/restaurant/${placeId}`);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [total, setTotal]             = useState(0);
  const [truncated, setTruncated]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [reloadTick, setReloadTick]   = useState(0);
  const [tab, setTab]                 = useState<"map" | "list">("map");
  const [region, setRegion]           = useState(ALL_REGION_KEY);
  const [confidence, setConfidence]   = useState("");
  const [search, setSearch]           = useState("");
  const [buffetsOnly, setBuffetsOnly] = useState(true);
  const [schedule, setSchedule]       = useState("");
  const [pickerOpen, setPickerOpen]   = useState(false);
  const [nearMe, setNearMe]           = useState(false);
  const [locating, setLocating]       = useState(false);
  const [userLoc, setUserLoc]         = useState<{ lat: number; lng: number } | null>(null);
  const [view, setView]               = useState<ViewRegion>(INITIAL_VIEW);
  const mapRef = useRef<MapView>(null);
  const currentRegion = useRef<ViewRegion>(INITIAL_VIEW);

  // ── Data ──────────────────────────────────────────────────────────────────
  // One download per (region, buffets-only). Confidence, search and schedule are
  // applied on the device, so typing or flipping a pill never hits the network.
  // The exception is a result the server truncated (e.g. "All restaurants" across
  // every region): there the search/confidence must run server-side to be complete.
  const debouncedSearch  = useDebounced(search.trim().toLowerCase(), 400);
  const serverSearch     = truncated ? debouncedSearch : "";
  const serverConfidence = truncated ? confidence : "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const base = await fetchRestaurantPage({ state: region, buffetsOnly });
      const isTruncated = base.total > base.restaurants.length;
      const page = isTruncated && (serverSearch || serverConfidence)
        ? await fetchRestaurantPage({ state: region, buffetsOnly, search: serverSearch, confidence: serverConfidence })
        : base;
      if (cancelled) return;
      setTruncated(isTruncated);
      setRestaurants(page.restaurants);
      setTotal(page.total);
    })()
      .catch(() => {
        if (!cancelled) setError("Couldn't load restaurants. Check your connection.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [region, buffetsOnly, serverSearch, serverConfidence, reloadTick]);

  const retry = () => { clearRestaurantCache(); setReloadTick(t => t + 1); };

  const distances = useMemo(() => {
    if (!userLoc) return null;
    const m = new Map<string, number>();
    for (const r of restaurants) {
      if (r.lat != null && r.lng != null) m.set(r.place_id, distanceMiles(userLoc.lat, userLoc.lng, r.lat, r.lng));
    }
    return m;
  }, [restaurants, userLoc]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = restaurants.filter(r =>
      (!confidence || r.buffet_confidence === confidence) &&
      (!schedule || r.buffet_schedule === schedule) &&
      (!q || r.name?.toLowerCase().includes(q) || r.address?.toLowerCase().includes(q))
    );
    if (nearMe && distances) {
      list.sort((a, b) => (distances.get(a.place_id) ?? Infinity) - (distances.get(b.place_id) ?? Infinity));
    }
    return list;
  }, [restaurants, confidence, schedule, search, nearMe, distances]);

  // ── Map ───────────────────────────────────────────────────────────────────
  const flyTo = useCallback((r: ViewRegion, ms = 600) => {
    currentRegion.current = r;
    mapRef.current?.animateToRegion(r, ms);
  }, []);

  const selectRegion = (key: string) => {
    setPickerOpen(false);
    setNearMe(false);
    setRegion(key);
    const v = regionView(key);
    flyTo({ latitude: v.lat, longitude: v.lng, latitudeDelta: v.delta, longitudeDelta: v.delta });
  };

  const goNearMe = async () => {
    if (locating) return;
    setLocating(true);
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Location is off",
          "Allow location access for BuffetFindr in Settings to see the buffets closest to you.",
          [{ text: "Not now", style: "cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() }],
        );
        return;
      }
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 })) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const { latitude, longitude } = pos.coords;
      setUserLoc({ lat: latitude, lng: longitude });
      // Search every region so metro borders don't hide a closer buffet.
      setRegion(ALL_REGION_KEY);
      setNearMe(true);
      setPickerOpen(false);
      flyTo({ latitude, longitude, latitudeDelta: NEAR_ME_DELTA, longitudeDelta: NEAR_ME_DELTA });
    } catch {
      Alert.alert("Couldn't get your location", "Please try again, or pick a region instead.");
    } finally {
      setLocating(false);
    }
  };

  const zoomBy = (factor: number) => {
    const cur = currentRegion.current;
    flyTo({
      ...cur,
      latitudeDelta:  Math.min(Math.max(cur.latitudeDelta  * factor, 0.002), 60),
      longitudeDelta: Math.min(Math.max(cur.longitudeDelta * factor, 0.002), 60),
    }, 250);
  };

  // Markers are built only for the visible area and clustered, then memoised so
  // unrelated state changes (typing, opening the picker) don't touch the map.
  const markers = useMemo(() => {
    return clusterRestaurants(displayed, view).map(item =>
      item.type === "pin" ? (
        <Marker
          key={item.key}
          coordinate={{ latitude: item.restaurant.lat, longitude: item.restaurant.lng }}
          tracksViewChanges={false}
          onPress={() => openRestaurant(item.restaurant.place_id)}
        >
          <View style={[styles.pin, item.restaurant.buffet_score >= 60 ? styles.pinHigh : styles.pinMed]}>
            <Text style={styles.pinEmoji}>🍛</Text>
          </View>
        </Marker>
      ) : (
        <Marker
          key={item.key}
          coordinate={{ latitude: item.lat, longitude: item.lng }}
          tracksViewChanges={false}
          onPress={() => flyTo(regionForCluster(item, currentRegion.current), 350)}
        >
          <View style={[styles.cluster, item.count >= 100 && styles.clusterWide, item.hasHigh ? styles.pinHigh : styles.pinMed]}>
            <Text style={styles.clusterText}>{item.count}</Text>
          </View>
        </Marker>
      )
    );
  }, [displayed, view, flyTo]);

  const renderItem = useCallback(
    ({ item }: { item: Restaurant }) => (
      <RestaurantCard
        restaurant={item}
        onPress={openRestaurant}
        distanceMi={distances?.get(item.place_id) ?? null}
      />
    ),
    [distances],
  );

  const noun = buffetsOnly ? "buffets" : "restaurants";
  const countLabel =
    error && restaurants.length === 0 ? "Offline"
    : loading && restaurants.length === 0 ? "Loading…"
    : truncated && displayed.length === restaurants.length && total > displayed.length
      ? `Top ${displayed.length.toLocaleString()} of ${total.toLocaleString()} ${noun}`
      : `${displayed.length.toLocaleString()} ${noun}`;
  const regionButtonLabel = nearMe ? "Near me" : regionLabel(region);
  const filtersActive = !!(confidence || schedule || search.trim());

  return (
    <View style={styles.root}>
      {/* ── Full-screen map (always rendered as background) ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={INITIAL_VIEW}
        showsUserLocation
        onRegionChange={r => { currentRegion.current = r; }}
        onRegionChangeComplete={r => { currentRegion.current = r; setView(r); }}
      >
        {markers}
      </MapView>

      {/* ── List view slides over the map ── */}
      {tab === "list" && (
        <View style={[styles.listOverlay, { paddingTop: insets.top + 60 }]}>
          {loading && restaurants.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#C94A1F" size="large" />
            </View>
          ) : error && restaurants.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="cloud-offline-outline" size={36} color="#8e8e93" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={retry}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={displayed}
              keyExtractor={r => r.place_id}
              contentContainerStyle={styles.listContent}
              renderItem={renderItem}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={9}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {filtersActive ? `No ${noun} match these filters.` : `No ${noun} found.`}
                </Text>
              }
            />
          )}
        </View>
      )}

      {/* ── Floating header (always on top) ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {/* App title */}
        <View style={styles.headerLeft}>
          <RNImage source={require("../assets/icon.png")} style={styles.headerIcon} />
          <View>
            <Text style={styles.headerTitle}>BuffetFindr</Text>
            <Text style={styles.headerSub}>{countLabel}</Text>
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
        <View style={styles.topRow}>
          {/* Region button → searchable picker */}
          <TouchableOpacity
            style={styles.regionBtn}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Region: ${regionButtonLabel}. Tap to change.`}
          >
            <Ionicons name={nearMe ? "navigate" : "location"} size={14} color="#fff" />
            <Text style={styles.regionBtnText} numberOfLines={1}>{regionButtonLabel}</Text>
            <Ionicons name="chevron-down" size={14} color="#fff" />
          </TouchableOpacity>

          {/* Search */}
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={14} color="#8e8e93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search restaurants..."
              placeholderTextColor="#8e8e93"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          </View>
        </View>

        {/* Confidence + buffets + schedule pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll} keyboardShouldPersistTaps="handled">
          {CONFIDENCE.map(c => (
            <TouchableOpacity
              key={c.value}
              style={[styles.pill, confidence === c.value && styles.pillActiveDark]}
              onPress={() => setConfidence(c.value)}
            >
              <Text style={[styles.pillText, confidence === c.value && styles.pillTextWhite]}>{c.label}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.pillDivider} />

          <TouchableOpacity
            style={[styles.pill, buffetsOnly ? styles.pillActiveGold : undefined]}
            onPress={() => {
              // Schedule only applies to buffets — clear it when leaving buffet mode.
              if (buffetsOnly) setSchedule("");
              setBuffetsOnly(!buffetsOnly);
            }}
          >
            <Text style={[styles.pillText, buffetsOnly && styles.pillTextWhite]}>
              {buffetsOnly ? "🍛 Buffets" : "🍽️ All restaurants"}
            </Text>
          </TouchableOpacity>

          {buffetsOnly && (
            <>
              <View style={styles.pillDivider} />
              {SCHEDULES.map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.pill, schedule === s.value && styles.pillActiveGold]}
                  onPress={() => setSchedule(s.value)}
                >
                  <Text style={[styles.pillText, schedule === s.value && styles.pillTextWhite]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>

        {/* Loading / error status (map mode; the list has its own states) */}
        {tab === "map" && error ? (
          <TouchableOpacity style={[styles.statusChip, styles.statusChipError]} onPress={retry} activeOpacity={0.85}>
            <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
            <Text style={styles.statusTextLight}>Couldn't load. Tap to retry</Text>
          </TouchableOpacity>
        ) : tab === "map" && loading ? (
          <View style={styles.statusChip}>
            <ActivityIndicator color="#C94A1F" size="small" />
            <Text style={styles.statusText}>Loading {noun}…</Text>
          </View>
        ) : null}
      </View>

      {/* ── Map controls (map mode only) ── */}
      {tab === "map" && (
        <View style={[styles.mapControls, { bottom: insets.bottom + 72 }]}>
          <TouchableOpacity
            style={[styles.zoomControls, styles.zoomBtn]}
            onPress={goNearMe}
            activeOpacity={0.75}
            accessibilityLabel="Show buffets near me"
          >
            {locating
              ? <ActivityIndicator color="#C94A1F" size="small" />
              : <Ionicons name={nearMe ? "navigate" : "navigate-outline"} size={19} color={nearMe ? "#C94A1F" : "#1c1c1e"} />}
          </TouchableOpacity>
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomBy(0.5)} activeOpacity={0.75} accessibilityLabel="Zoom in">
              <Ionicons name="add" size={22} color="#1c1c1e" />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomBy(2)} activeOpacity={0.75} accessibilityLabel="Zoom out">
              <Ionicons name="remove" size={22} color="#1c1c1e" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Bottom tab bar ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab("map")}>
          <Ionicons name={tab === "map" ? "map" : "map-outline"} size={22}
            color={tab === "map" ? "#C94A1F" : "#8e8e93"} />
          <Text style={[styles.tabLabel, tab === "map" && styles.tabLabelActive]}>Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setTab("list")}>
          <Ionicons name={tab === "list" ? "list" : "list-outline"} size={22}
            color={tab === "list" ? "#C94A1F" : "#8e8e93"} />
          <Text style={[styles.tabLabel, tab === "list" && styles.tabLabelActive]}>List</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/submit")}>
          <Ionicons name="add-circle-outline" size={22} color="#8e8e93" />
          <Text style={styles.tabLabel}>Submit</Text>
        </TouchableOpacity>
      </View>

      <RegionPicker
        visible={pickerOpen}
        selected={region}
        nearMe={nearMe}
        locating={locating}
        onSelect={selectRegion}
        onNearMe={goNearMe}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: "#fafaf8" },

  // Header
  header:       { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8, backgroundColor: "rgba(250,250,248,0.92)" },
  headerLeft:   { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIcon:   { width: 34, height: 34, borderRadius: 8 },
  headerTitle:  { fontSize: 15, fontWeight: "700", color: "#1c1c1e" },
  headerSub:    { fontSize: 10, color: "#8e8e93", marginTop: 1 },
  segControl:   { flexDirection: "row", borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#e5e5ea", backgroundColor: "#fff" },
  segBtn:       { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 6 },
  segBtnActive: { backgroundColor: "#C94A1F" },
  segText:      { fontSize: 12, fontWeight: "600", color: "#8e8e93" },
  segTextActive:{ color: "#fff" },

  // Filter bar
  filterBar:    { position: "absolute", left: 0, right: 0, zIndex: 20, paddingHorizontal: 12, gap: 6 },
  topRow:       { flexDirection: "row", alignItems: "center", gap: 8 },
  regionBtn:    { flexDirection: "row", alignItems: "center", gap: 5, maxWidth: 170, height: 38, borderRadius: 12, backgroundColor: "#C94A1F", paddingHorizontal: 11, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  regionBtnText:{ flexShrink: 1, fontSize: 13, fontWeight: "700", color: "#fff" },
  statusChip:   { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4, backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  statusChipError: { backgroundColor: "#1c1c1e" },
  statusText:   { fontSize: 12, fontWeight: "600", color: "#1c1c1e" },
  statusTextLight: { fontSize: 12, fontWeight: "600", color: "#fff" },
  searchRow:    { flex: 1, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e5ea", paddingHorizontal: 10, height: 38, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  searchInput:  { flex: 1, fontSize: 14, color: "#1c1c1e" },
  pillScroll:   { flexDirection: "row" },
  pill:         { borderRadius: 20, borderWidth: 1, borderColor: "#e5e5ea", backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  pillActiveOrange: { backgroundColor: "#C94A1F", borderColor: "#C94A1F" },
  pillActiveDark:   { backgroundColor: "#1c1c1e", borderColor: "#1c1c1e" },
  pillActiveGold:   { backgroundColor: "#D4891A", borderColor: "#D4891A" },
  pillText:     { fontSize: 12, fontWeight: "600", color: "#6b6b6b" },
  pillTextWhite:{ color: "#fff" },
  pillDivider:  { width: 1, backgroundColor: "#e5e5ea", marginHorizontal: 4, alignSelf: "center", height: 16 },

  // Map markers
  pin:          { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  pinHigh:      { backgroundColor: "#C94A1F" },
  pinMed:       { backgroundColor: "#D4891A" },
  pinEmoji:     { fontSize: 14 },
  cluster:      { minWidth: 38, height: 38, borderRadius: 19, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
  clusterWide:  { minWidth: 46, height: 46, borderRadius: 23 },
  clusterText:  { color: "#fff", fontSize: 13, fontWeight: "800" },

  // List overlay
  listOverlay:  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, backgroundColor: "#fafaf8" },
  listContent:  { paddingHorizontal: 12, paddingTop: 100, paddingBottom: 100, gap: 10 },
  centered:     { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 120, paddingHorizontal: 32, gap: 10 },
  errorText:    { textAlign: "center", color: "#6b6b6b", fontSize: 15, lineHeight: 21 },
  retryBtn:     { backgroundColor: "#C94A1F", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText:    { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyText:    { textAlign: "center", color: "#8e8e93", marginTop: 60, fontSize: 15 },

  // Zoom controls
  mapControls:  { position: "absolute", right: 14, zIndex: 25, gap: 10 },
  zoomControls: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e5ea", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 6, overflow: "hidden" },
  zoomBtn:      { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  zoomDivider:  { height: 1, backgroundColor: "#e5e5ea", marginHorizontal: 8 },

  // Bottom tab bar
  tabBar:       { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 30, flexDirection: "row", backgroundColor: "rgba(255,255,255,0.97)", borderTopWidth: 1, borderTopColor: "#e5e5ea", paddingTop: 8 },
  tabItem:      { flex: 1, alignItems: "center", gap: 3 },
  tabLabel:     { fontSize: 10, fontWeight: "500", color: "#8e8e93" },
  tabLabelActive:{ color: "#C94A1F" },
});
