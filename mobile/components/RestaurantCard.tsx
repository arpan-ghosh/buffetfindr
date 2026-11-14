import { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Restaurant } from "../lib/api";
import { photoUrl, SCHEDULE_LABEL } from "../lib/api";

interface Props {
  restaurant: Restaurant;
  /** Receives the place_id so the parent can pass one stable callback to every card. */
  onPress: (placeId: string) => void;
  /** Distance from the user in miles, when known. */
  distanceMi?: number | null;
}

const SCHEDULE_STYLE = {
  BOTH:         { bg: "#f0fdf4", fg: "#15803d" },
  WEEKEND_ONLY: { bg: "#fffbeb", fg: "#b45309" },
  WEEKDAY_ONLY: { bg: "#eff6ff", fg: "#1d4ed8" },
} as const;

function formatDistance(mi: number) {
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

function RestaurantCardBase({ restaurant: r, onPress, distanceMi }: Props) {
  const photo = r.photo_refs?.[0] ? photoUrl(r.photo_refs[0], 200) : null;
  const city  = r.address?.split(",").slice(-3, -2)[0]?.trim() ?? r.address;

  // Same three badges as the web card (discontinued/unknown are only shown on the detail screen).
  const schedule = r.buffet_schedule;
  const scheduleStyle =
    schedule === "BOTH" || schedule === "WEEKEND_ONLY" || schedule === "WEEKDAY_ONLY"
      ? SCHEDULE_STYLE[schedule]
      : null;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(r.place_id)} activeOpacity={0.85}>
      {/* Thumbnail */}
      <View style={styles.thumb}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.thumbImg} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbImg, styles.thumbPlaceholder]}>
            <Text style={{ fontSize: 24 }}>🍛</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={11} color="#8e8e93" />
          <Text style={styles.address} numberOfLines={1}>{city}, {r.state}</Text>
          {distanceMi != null && <Text style={styles.distance}>{formatDistance(distanceMi)}</Text>}
        </View>
        <View style={styles.badgeRow}>
          {r.rating != null && r.rating > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color="#fbbf24" />
              <Text style={styles.ratingText}>{r.rating}</Text>
              {r.review_count != null && r.review_count > 0 && (
                <Text style={styles.reviewCount}>({r.review_count.toLocaleString()})</Text>
              )}
            </View>
          )}
          {r.is_buffet !== false && (
            <View style={[styles.badge, r.buffet_confidence === "HIGH" ? styles.badgeHigh : styles.badgeMed]}>
              <Text style={styles.badgeText}>
                {r.buffet_confidence === "HIGH" ? "Verified" : "Likely"} Buffet
              </Text>
            </View>
          )}
          {scheduleStyle && schedule && (
            <View style={[styles.badge, { backgroundColor: scheduleStyle.bg }]}>
              <Text style={[styles.badgeText, { color: scheduleStyle.fg }]}>
                {SCHEDULE_LABEL[schedule]?.short}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const RestaurantCard = memo(RestaurantCardBase);

const styles = StyleSheet.create({
  card:           { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, padding: 12, gap: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  thumb:          { width: 80, height: 80, borderRadius: 12, overflow: "hidden" },
  thumbImg:       { width: 80, height: 80 },
  thumbPlaceholder:{ backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center" },
  content:        { flex: 1, justifyContent: "space-between", paddingVertical: 2 },
  name:           { fontSize: 15, fontWeight: "600", color: "#1c1c1e" },
  addressRow:     { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  address:        { fontSize: 12, color: "#8e8e93", flex: 1 },
  distance:       { fontSize: 12, fontWeight: "600", color: "#C94A1F", marginLeft: 6 },
  badgeRow:       { flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 6, rowGap: 4, marginTop: 6 },
  ratingRow:      { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText:     { fontSize: 12, fontWeight: "600", color: "#1c1c1e" },
  reviewCount:    { fontSize: 11, color: "#8e8e93" },
  badge:          { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeHigh:      { backgroundColor: "#fff7ed" },
  badgeMed:       { backgroundColor: "#fffbeb" },
  badgeText:      { fontSize: 11, fontWeight: "600", color: "#ea580c" },
});
