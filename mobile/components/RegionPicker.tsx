import { useMemo, useState } from "react";
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput,
  SectionList, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ALL_REGION_KEY, REGIONS, searchRegions, type RegionDef } from "../lib/regions";

interface Props {
  visible: boolean;
  /** Currently selected region key ("all" included). */
  selected: string;
  /** True while the "Near me" view is active. */
  nearMe: boolean;
  /** True while the device location is being resolved. */
  locating: boolean;
  onSelect: (key: string) => void;
  onNearMe: () => void;
  onClose: () => void;
}

export function RegionPicker({ visible, selected, nearMe, locating, onSelect, onNearMe, onClose }: Props) {
  const [query, setQuery] = useState("");
  const sections = useMemo(() => searchRegions(query), [query]);
  const searching = query.trim().length > 0;

  const close = () => { setQuery(""); onClose(); };
  const pick  = (key: string) => { setQuery(""); onSelect(key); };

  const renderRow = (
    key: string,
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    hint: string | undefined,
    active: boolean,
    onPress: () => void,
    trailing?: React.ReactNode,
  ) => (
    <TouchableOpacity key={key} style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.rowIcon, active && styles.rowIconActive]}>
        <Ionicons name={icon} size={16} color={active ? "#fff" : "#C94A1F"} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{label}</Text>
        {hint ? <Text style={styles.rowHint} numberOfLines={1}>{hint}</Text> : null}
      </View>
      {trailing ?? (active ? <Ionicons name="checkmark" size={20} color="#C94A1F" /> : null)}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <SafeAreaView style={styles.sheet} edges={["bottom"]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Choose a region</Text>
            <TouchableOpacity onPress={close} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close-circle" size={28} color="#c7c7cc" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={15} color="#8e8e93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cities or states"
              placeholderTextColor="#8e8e93"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          </View>

          <SectionList<RegionDef>
            sections={sections}
            keyExtractor={r => r.key}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              searching ? null : (
                <View style={styles.group}>
                  {renderRow(
                    "nearme", "navigate", "Near me", "Closest buffets to your location",
                    nearMe, onNearMe,
                    locating ? <ActivityIndicator color="#C94A1F" /> : undefined,
                  )}
                  <View style={styles.separator} />
                  {renderRow(
                    ALL_REGION_KEY, "earth", "All regions", `${REGIONS.length} metro areas across the US`,
                    !nearMe && selected === ALL_REGION_KEY, () => pick(ALL_REGION_KEY),
                  )}
                </View>
              )
            }
            renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
            renderItem={({ item, index, section }) => (
              <View
                style={[
                  styles.groupItem,
                  index === 0 && styles.groupFirst,
                  index === section.data.length - 1 && styles.groupLast,
                ]}
              >
                {renderRow(
                  item.key, "location-outline", item.label, item.hint,
                  !nearMe && selected === item.key, () => pick(item.key),
                )}
                {index < section.data.length - 1 && <View style={styles.separator} />}
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                No region matches “{query.trim()}”.{"\n"}Know a buffet there? Submit it from the home screen.
              </Text>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1 },
  sheet:        { flex: 1, backgroundColor: "#fafaf8" },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 },
  title:        { fontSize: 20, fontWeight: "700", color: "#1c1c1e" },
  searchRow:    { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e5ea", marginHorizontal: 16, paddingHorizontal: 10, height: 40 },
  searchInput:  { flex: 1, fontSize: 15, color: "#1c1c1e" },
  listContent:  { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 },

  group:        { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e5e5ea", overflow: "hidden" },
  groupItem:    { backgroundColor: "#fff", borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#e5e5ea" },
  groupFirst:   { borderTopWidth: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden" },
  groupLast:    { borderBottomWidth: 1, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: "hidden" },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#8e8e93", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  separator:    { height: StyleSheet.hairlineWidth, backgroundColor: "#e5e5ea", marginLeft: 56 },

  row:          { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 11, minHeight: 54 },
  rowIcon:      { width: 32, height: 32, borderRadius: 16, backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center" },
  rowIconActive:{ backgroundColor: "#C94A1F" },
  rowBody:      { flex: 1 },
  rowLabel:     { fontSize: 15, fontWeight: "600", color: "#1c1c1e" },
  rowLabelActive:{ color: "#C94A1F" },
  rowHint:      { fontSize: 12, color: "#8e8e93", marginTop: 1 },
  empty:        { textAlign: "center", color: "#8e8e93", fontSize: 14, lineHeight: 20, marginTop: 40 },
});
