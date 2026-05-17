import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Restaurant } from "../lib/api";
import { photoUrl } from "../lib/api";

interface Props {
  restaurant: Restaurant;
  onPress: () => void;
}

export function RestaurantCard({ restaurant: r, onPress }: Props) {
  const photo = r.photo_refs?.[0] ? photoUrl(r.photo_refs[0], 200) : null;
  const city  = r.address?.split(",").slice(-3, -2)[0]?.trim() ?? r.address;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
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
        </View>
        <View style={styles.badgeRow}>
          {r.rating && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color="#fbbf24" />
              <Text style={styles.ratingText}>{r.rating}</Text>
              {r.review_count && <Text style={styles.reviewCount}>({r.review_count.toLocaleString()})</Text>}
            </View>
          )}
          <View style={[styles.badge, r.buffet_confidence === "HIGH" ? styles.badgeHigh : styles.badgeMed]}>
            <Text style={styles.badgeText}>
              {r.buffet_confidence === "HIGH" ? "Verified" : "Likely"} Buffet
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:           { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, padding: 12, gap: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  thumb:          { width: 80, height: 80, borderRadius: 12, overflow: "hidden" },
  thumbImg:       { width: 80, height: 80 },
  thumbPlaceholder:{ backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center" },
  content:        { flex: 1, justifyContent: "space-between", paddingVertical: 2 },
  name:           { fontSize: 15, fontWeight: "600", color: "#1c1c1e" },
  addressRow:     { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  address:        { fontSize: 12, color: "#8e8e93", flex: 1 },
  badgeRow:       { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  ratingRow:      { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText:     { fontSize: 12, fontWeight: "600", color: "#1c1c1e" },
  reviewCount:    { fontSize: 11, color: "#8e8e93" },
  badge:          { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeHigh:      { backgroundColor: "#fff7ed" },
  badgeMed:       { backgroundColor: "#fffbeb" },
  badgeText:      { fontSize: 11, fontWeight: "600", color: "#ea580c" },
});
