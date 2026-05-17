import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const BASE = "https://buffetfindr-asw9k6p3s-arpan-ghoshs-projects-d7c4c085.vercel.app";
const STATES = ["MD", "VA", "DC", "MA", "NY"];

export default function SubmitScreen() {
  const [form, setForm] = useState({ name: "", city: "", state: "MD", phone: "", website: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const submit = async () => {
    if (!form.name.trim() || !form.city.trim()) {
      Alert.alert("Missing info", "Restaurant name and city are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      Alert.alert(
        "Thanks! 🎉",
        `We'll review ${form.name} and add it if it checks out.`,
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch {
      Alert.alert("Error", "Couldn't submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={22} color="#1c1c1e" />
          </TouchableOpacity>
          <Text style={styles.title}>Submit a buffet</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>Know a buffet we&apos;re missing? Let us know.</Text>

          <Field label="Restaurant name *" value={form.name} onChangeText={set("name")} placeholder="e.g. Bombay Palace" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="City *" value={form.city} onChangeText={set("city")} placeholder="e.g. Rockville" />
            </View>
            <View style={styles.stateField}>
              <Text style={styles.label}>State</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statePills}>
                {STATES.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statePill, form.state === s && styles.statePillActive]}
                    onPress={() => set("state")(s)}
                  >
                    <Text style={[styles.statePillText, form.state === s && styles.statePillTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Phone" value={form.phone} onChangeText={set("phone")} placeholder="(301) 555-0123" keyboardType="phone-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Website" value={form.website} onChangeText={set("website")} placeholder="https://..." keyboardType="url" />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>How do you know it has a buffet?</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.notes}
              onChangeText={set("notes")}
              placeholder="e.g. I go every Sunday for their $13.99 lunch buffet"
              placeholderTextColor="#8e8e93"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (!form.name.trim() || !form.city.trim()) && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={submitting || !form.name.trim() || !form.city.trim()}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>Submit for review</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>Submissions are reviewed before appearing on the map.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; keyboardType?: "default" | "phone-pad" | "url";
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8e8e93"
        keyboardType={keyboardType ?? "default"}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#fafaf8" },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  title:        { fontSize: 16, fontWeight: "700", color: "#1c1c1e" },
  form:         { padding: 20, gap: 14 },
  subtitle:     { fontSize: 14, color: "#8e8e93", marginBottom: 4 },
  row:          { flexDirection: "row", gap: 10 },
  fieldGroup:   { gap: 5 },
  label:        { fontSize: 11, fontWeight: "600", color: "#8e8e93", textTransform: "uppercase", letterSpacing: 0.5 },
  input:        { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e5ea", paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#1c1c1e" },
  textArea:     { minHeight: 80, paddingTop: 11 },
  stateField:   { flex: 1, gap: 5 },
  statePills:   { flexDirection: "row" },
  statePill:    { borderRadius: 8, borderWidth: 1, borderColor: "#e5e5ea", backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 8, marginRight: 5 },
  statePillActive: { backgroundColor: "#f97316", borderColor: "#f97316" },
  statePillText:   { fontSize: 12, fontWeight: "600", color: "#8e8e93" },
  statePillTextActive: { color: "#fff" },
  submitBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f97316", borderRadius: 14, paddingVertical: 14, marginTop: 8 },
  submitBtnDisabled: { backgroundColor: "#d1d1d6" },
  submitBtnText:{ color: "#fff", fontSize: 16, fontWeight: "700" },
  note:         { textAlign: "center", fontSize: 12, color: "#8e8e93" },
});
