import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Image, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fetchRestaurants, photoUrl, mapsUrl, submitFeedback, type Restaurant } from "../../lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DAY_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const BUFFET_STAPLES = ["Butter Chicken","Chana Masala","Dal Makhani","Saag Paneer","Biryani","Tandoori Chicken","Naan","Samosa","Raita","Gulab Jamun","Kheer","Aloo Gobi"];

function isOpenNow(hours: string[]): boolean | null {
  if (!hours?.length) return null;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const line = hours.find(h => h.startsWith(today));
  if (!line || line.includes("Closed")) return false;
  const m = line.match(/(\d+:\d+\s*[AP]M)\s*[–-]\s*(\d+:\d+\s*[AP]M)/i);
  if (!m) return null;
  const parse = (t: string) => {
    const [time, period] = t.trim().split(/\s+/);
    let [h, min] = time.split(":").map(Number);
    if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
    if (period?.toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + min;
  };
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= parse(m[1]) && cur <= parse(m[2]);
}

export default function RestaurantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [visited, setVisited]       = useState(false);
  const [myVote, setMyVote]         = useState<"up"|"down"|null>(null);
  const [votes, setVotes]           = useState({ up: 0, down: 0 });

  useEffect(() => {
    fetchRestaurants().then(list => {
      const r = list.find(x => x.place_id === id);
      setRestaurant(r ?? null);
    });
    AsyncStorage.getItem(`visited_${id}`).then(v => setVisited(v === "true"));
    AsyncStorage.getItem(`vote_${id}`).then(v => setMyVote(v as "up"|"down"|null));
  }, [id]);

  const toggleVisited = async () => {
    const next = !visited;
    setVisited(next);
    await AsyncStorage.setItem(`visited_${id}`, String(next));
  };

  const vote = async (v: "up"|"down") => {
    const prev = myVote;
    const next = prev === v ? null : v;
    setMyVote(next);
    if (next) await AsyncStorage.setItem(`vote_${id}`, next);
    else      await AsyncStorage.removeItem(`vote_${id}`);
    await submitFeedback(id!, v, prev);
  };

  if (!restaurant) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#C94A1F" size="large" />
      </View>
    );
  }

  const r = restaurant;
  const open = isOpenNow(r.hours);
  const photo = r.photo_refs?.[0] ? photoUrl(r.photo_refs[0]) : null;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero photo */}
      <View style={styles.hero}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.heroImg} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImg, styles.heroPlaceholder]}>
            <Text style={{ fontSize: 60 }}>🍛</Text>
          </View>
        )}
        <View style={styles.heroBadges}>
          {open === true  && <View style={styles.badgeOpen}><Text style={styles.badgeText}>Open Now</Text></View>}
          {open === false && <View style={styles.badgeClosed}><Text style={styles.badgeText}>Closed</Text></View>}
          {r.buffet_confidence === "HIGH" && <View style={styles.badgeHigh}><Text style={styles.badgeText}>Verified Buffet</Text></View>}
        </View>
      </View>

      <View style={styles.body}>
        {/* Name + rating */}
        <Text style={styles.name}>{r.name}</Text>
        <View style={styles.ratingRow}>
          {r.rating && (
            <View style={styles.stars}>
              <Ionicons name="star" size={13} color="#fbbf24" />
              <Text style={styles.ratingText}>{r.rating}</Text>
              {r.review_count && <Text style={styles.reviewCount}>({r.review_count.toLocaleString()})</Text>}
            </View>
          )}
          <View style={[styles.scoreBadge, r.buffet_confidence === "HIGH" ? styles.scoreHigh : styles.scoreMed]}>
            <Text style={styles.scoreText}>{r.buffet_score}% match</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => Linking.openURL(mapsUrl(r.address))}>
            <Ionicons name="navigate" size={15} color="#fff" />
            <Text style={styles.btnPrimaryText}>Directions</Text>
          </TouchableOpacity>
          {r.phone && (
            <TouchableOpacity style={styles.btnSecondary} onPress={() => Linking.openURL(`tel:${r.phone}`)}>
              <Ionicons name="call" size={15} color="#1c1c1e" />
              <Text style={styles.btnSecondaryText}>Call</Text>
            </TouchableOpacity>
          )}
          {r.website && (
            <TouchableOpacity style={styles.btnSecondary} onPress={() => Linking.openURL(r.website!)}>
              <Ionicons name="globe-outline" size={15} color="#1c1c1e" />
            </TouchableOpacity>
          )}
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Ionicons name="location-outline" size={16} color="#8e8e93" />
          <Text style={styles.sectionText}>{r.address}</Text>
        </View>

        {/* What you'll find */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What you'll typically find 🍽️</Text>
          <View style={styles.staples}>
            {BUFFET_STAPLES.map(dish => (
              <View key={dish} style={styles.staplePill}>
                <Text style={styles.stapleText}>{dish}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.disclaimer}>Common at Indian buffets — varies by restaurant.</Text>
        </View>

        {/* Hours */}
        {r.hours?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Hours</Text>
            {DAY_ORDER.map(day => {
              const line = r.hours.find(h => h.startsWith(day)) ?? `${day}: Closed`;
              const [d, ...rest] = line.split(": ");
              return (
                <View key={day} style={styles.hoursRow}>
                  <Text style={[styles.hoursDay, d === today && styles.hoursDayToday]}>{d.slice(0,3)}</Text>
                  <Text style={[styles.hoursTime, d === today && styles.hoursDayToday]}>{rest.join(": ") || "Closed"}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Been here */}
        <View style={styles.card}>
          <View style={styles.beenHereRow}>
            <View>
              <Text style={styles.cardTitle}>{visited ? "You've been here! 🎉" : "Have you visited?"}</Text>
              <Text style={styles.beenHereSub}>{visited ? "Saved on this device" : "Track buffets you've tried"}</Text>
            </View>
            <TouchableOpacity
              style={[styles.visitedBtn, visited && styles.visitedBtnActive]}
              onPress={toggleVisited}
            >
              <Ionicons name={visited ? "checkmark-circle" : "ellipse-outline"} size={16} color={visited ? "#fff" : "#8e8e93"} />
              <Text style={[styles.visitedText, visited && styles.visitedTextActive]}>
                {visited ? "Visited" : "Mark visited"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feedback */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Is this buffet info accurate?</Text>
          <Text style={styles.feedbackSub}>Help us confirm or remove false results.</Text>
          <View style={styles.voteRow}>
            <TouchableOpacity style={[styles.voteBtn, myVote === "up" && styles.voteBtnUp]} onPress={() => vote("up")}>
              <Ionicons name="thumbs-up" size={16} color={myVote === "up" ? "#fff" : "#8e8e93"} />
              <Text style={[styles.voteText, myVote === "up" && styles.voteTextActive]}>
                Yes{votes.up > 0 ? ` (${votes.up})` : ""}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.voteBtn, myVote === "down" && styles.voteBtnDown]} onPress={() => vote("down")}>
              <Ionicons name="thumbs-down" size={16} color={myVote === "down" ? "#fff" : "#8e8e93"} />
              <Text style={[styles.voteText, myVote === "down" && styles.voteTextActive]}>
                No buffet{votes.down > 0 ? ` (${votes.down})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sourceNote}>Data sourced from Google Places · {r.state}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#fafaf8" },
  content:        { paddingBottom: 40 },
  centered:       { flex: 1, alignItems: "center", justifyContent: "center" },
  hero:           { height: 220, position: "relative" },
  heroImg:        { width: "100%", height: 220 },
  heroPlaceholder:{ backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center" },
  heroBadges:     { position: "absolute", bottom: 12, left: 12, flexDirection: "row", gap: 6 },
  badgeOpen:      { backgroundColor: "#22c55e", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeClosed:    { backgroundColor: "#ef4444", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeHigh:      { backgroundColor: "#C94A1F", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:      { color: "#fff", fontSize: 11, fontWeight: "600" },
  body:           { padding: 16, gap: 12 },
  name:           { fontSize: 22, fontWeight: "700", color: "#1c1c1e" },
  ratingRow:      { flexDirection: "row", alignItems: "center", gap: 10 },
  stars:          { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText:     { fontSize: 14, fontWeight: "600", color: "#1c1c1e" },
  reviewCount:    { fontSize: 12, color: "#8e8e93" },
  scoreBadge:     { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  scoreHigh:      { backgroundColor: "#fff7ed" },
  scoreMed:       { backgroundColor: "#fffbeb" },
  scoreText:      { fontSize: 11, fontWeight: "600", color: "#ea580c" },
  actions:        { flexDirection: "row", gap: 8 },
  btnPrimary:     { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#C94A1F", borderRadius: 12, paddingVertical: 11 },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnSecondary:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 12, borderWidth: 1, borderColor: "#e5e5ea", backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 11 },
  btnSecondaryText:{ fontWeight: "600", fontSize: 14, color: "#1c1c1e" },
  section:        { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  sectionText:    { flex: 1, fontSize: 14, color: "#1c1c1e", lineHeight: 20 },
  card:           { backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle:      { fontSize: 14, fontWeight: "700", color: "#1c1c1e" },
  staples:        { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  staplePill:     { backgroundColor: "#fffbeb", borderRadius: 20, borderWidth: 1, borderColor: "#fef3c7", paddingHorizontal: 10, paddingVertical: 4 },
  stapleText:     { fontSize: 12, color: "#92400e" },
  disclaimer:     { fontSize: 10, color: "#8e8e93" },
  hoursRow:       { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  hoursDay:       { fontSize: 13, color: "#8e8e93", width: 30 },
  hoursTime:      { fontSize: 13, color: "#8e8e93", textAlign: "right", flex: 1 },
  hoursDayToday:  { fontWeight: "700", color: "#1c1c1e" },
  beenHereRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  beenHereSub:    { fontSize: 12, color: "#8e8e93", marginTop: 2 },
  visitedBtn:     { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, borderWidth: 1, borderColor: "#e5e5ea", paddingHorizontal: 10, paddingVertical: 7 },
  visitedBtnActive:{ backgroundColor: "#22c55e", borderColor: "#22c55e" },
  visitedText:    { fontSize: 12, fontWeight: "600", color: "#8e8e93" },
  visitedTextActive:{ color: "#fff" },
  feedbackSub:    { fontSize: 12, color: "#8e8e93" },
  voteRow:        { flexDirection: "row", gap: 8 },
  voteBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1, borderColor: "#e5e5ea", paddingVertical: 9 },
  voteBtnUp:      { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  voteBtnDown:    { backgroundColor: "#ef4444", borderColor: "#ef4444" },
  voteText:       { fontSize: 13, fontWeight: "600", color: "#8e8e93" },
  voteTextActive: { color: "#fff" },
  sourceNote:     { textAlign: "center", fontSize: 11, color: "#8e8e93" },
});
