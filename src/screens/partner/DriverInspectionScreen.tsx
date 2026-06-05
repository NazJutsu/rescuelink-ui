import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RLButton } from "../../components/ui";
import { DevPageBadge } from "../../dev/DevPageBadge";
import { DEV_PAGES } from "../../dev/pageNumbers";
import { colors, radii, space } from "../../theme/tokens";
import type { CombinedStackParamList } from "../../navigation/types";
import { isFirebaseConfigured } from "../../firebase/config";
import { takePhoto, uploadInspectionPhoto } from "../../firebase/storageService";
import { saveInspectionPhotos } from "../../firebase/jobService";

type Props = RouteProp<CombinedStackParamList, "DriverInspection">;

const SLOTS = [
  { key: "front",  label: "Front",  required: true },
  { key: "rear",   label: "Rear",   required: true },
  { key: "side",   label: "Side",   required: true },
  { key: "extra",  label: "Extra",  required: false },
] as const;

type SlotKey = typeof SLOTS[number]["key"];

const STEPS = [
  { n: 1, title: "Front photo",         hint: "Full front of the vehicle." },
  { n: 2, title: "Rear photo",          hint: "Include number plate and rear condition." },
  { n: 3, title: "Side / damage photo", hint: "Show wheels, dents, scratches, or any recovery issue." },
];

const REQUIRED_KEYS = SLOTS.filter((s) => s.required).map((s) => s.key);

export function DriverInspectionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const route = useRoute<Props>();
  const jobId = route.params?.jobId;

  const [photos, setPhotos] = useState<Partial<Record<SlotKey, string>>>({});
  const [uploading, setUploading] = useState<SlotKey | null>(null);
  const [sending, setSending] = useState(false);

  const captureSlot = async (slotKey: SlotKey) => {
    if (!isFirebaseConfigured() || !jobId) {
      setPhotos((prev) => ({ ...prev, [slotKey]: "mock" }));
      return;
    }
    const asset = await takePhoto();
    if (!asset) return;
    setUploading(slotKey);
    try {
      const url = await uploadInspectionPhoto(jobId, slotKey, asset);
      setPhotos((prev) => ({ ...prev, [slotKey]: url }));
    } catch {
      Alert.alert("Upload failed", "Could not upload photo. Please try again.");
    } finally {
      setUploading(null);
    }
  };

  const requiredDone = REQUIRED_KEYS.every((k) => Boolean(photos[k]));

  const handleSend = async () => {
    if (!requiredDone) return;
    const photoUrls = SLOTS.map((s) => photos[s.key] ?? "").filter(Boolean);

    if (!isFirebaseConfigured() || !jobId) {
      Alert.alert(
        "Sent (demo)",
        "In a live job the customer would receive the photos on their tracking screen.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
      return;
    }
    setSending(true);
    try {
      await saveInspectionPhotos(jobId, photoUrls, "");
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Could not send photos. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.orange} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>ARRIVAL WORKFLOW</Text>
          <Text style={styles.headerTitle}>Take photos first</Text>
          <Text style={styles.headerSubtitle}>
            The driver must capture the car's condition before loading, moving, or starting the job.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Arrived card ── */}
        <View style={styles.arrivedCard}>
          <View style={styles.arrivedCardTop}>
            <View>
              <Text style={styles.arrivedTitle}>Arrived at pickup</Text>
              <Text style={styles.arrivedSub}>Photos required before next step</Text>
            </View>
            <View style={styles.lockBadge}>
              <Text style={styles.lockBadgeText}>Photo lock</Text>
            </View>
          </View>
          <Text style={styles.arrivedNote}>
            This protects the driver and customer if damage is disputed later.
          </Text>
        </View>

        {/* ── Numbered steps ── */}
        <View style={styles.stepsList}>
          {STEPS.map((step) => (
            <View key={step.n} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{step.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepHint}>{step.hint}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Photo slots row ── */}
        <View style={styles.slotsRow}>
          {SLOTS.map((slot) => {
            const uri = photos[slot.key];
            const isUploading = uploading === slot.key;
            const captured = Boolean(uri);

            return (
              <Pressable
                key={slot.key}
                style={[styles.slot, captured && styles.slotDone]}
                onPress={() => void captureSlot(slot.key)}
                disabled={isUploading}
              >
                {captured && uri !== "mock" ? (
                  <Image source={{ uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                ) : null}

                <View style={[styles.slotOverlay, captured && styles.slotOverlayDone]}>
                  {isUploading ? (
                    <Ionicons name="cloud-upload-outline" size={22} color={colors.orange} />
                  ) : captured ? (
                    <Ionicons name="checkmark" size={22} color={colors.white} />
                  ) : (
                    <Text style={styles.slotPlus}>+</Text>
                  )}
                  <Text style={[styles.slotLabel, captured && styles.slotLabelDone]}>
                    {slot.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Locked section ── */}
        <View style={styles.lockedSection}>
          <Text style={styles.lockedTitle}>
            {requiredDone ? "Photos complete — ready to proceed" : "Locked until required photos are added"}
          </Text>
          <View style={styles.lockedItem}>
            <Ionicons
              name={requiredDone ? "checkmark-circle" : "lock-closed-outline"}
              size={16}
              color={requiredDone ? colors.green : colors.textFaint}
            />
            <Text style={[styles.lockedItemText, requiredDone && styles.lockedItemTextUnlocked]}>
              Load vehicle onto truck
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky bottom button ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Pressable
          style={[styles.actionBtn, !requiredDone && styles.actionBtnLocked]}
          onPress={requiredDone ? () => void handleSend() : undefined}
          disabled={!requiredDone || sending}
        >
          <Text style={[styles.actionBtnText, !requiredDone && styles.actionBtnTextLocked]}>
            {sending ? "Sending to customer…" : requiredDone ? "Send photos to customer →" : "Add required photos first"}
          </Text>
        </Pressable>
        {!requiredDone ? (
          <Text style={styles.footerHint}>
            Once Front, Rear, and Side photos are uploaded, the action button unlocks automatically.
          </Text>
        ) : null}
      </View>

      <DevPageBadge {...DEV_PAGES.driverInspection} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
  },
  backBtn: { paddingTop: 2 },
  headerLabel: {
    color: colors.orange,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 30,
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  scroll: { paddingHorizontal: space.xl },

  // ── Arrived card ──
  arrivedCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.xl,
  },
  arrivedCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  arrivedTitle: { color: colors.white, fontWeight: "800", fontSize: 15 },
  arrivedSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  lockBadge: {
    backgroundColor: colors.orange,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  lockBadgeText: { color: colors.white, fontWeight: "800", fontSize: 12 },
  arrivedNote: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },

  // ── Steps ──
  stepsList: {
    gap: space.md,
    marginBottom: space.xl,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.orangeFaint,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: colors.orange, fontWeight: "800", fontSize: 13 },
  stepTitle: { color: colors.white, fontWeight: "700", fontSize: 14 },
  stepHint: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  // ── Slots row ──
  slotsRow: {
    flexDirection: "row",
    gap: space.sm,
    marginBottom: space.xl,
  },
  slot: {
    flex: 1,
    aspectRatio: 0.9,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  slotDone: {
    borderColor: colors.green,
    backgroundColor: "#0d2b1a",
  },
  slotOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  slotOverlayDone: {
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  slotPlus: {
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: "300",
    lineHeight: 26,
  },
  slotLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  slotLabelDone: { color: colors.white },

  // ── Locked section ──
  lockedSection: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.lg,
  },
  lockedTitle: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 14,
    marginBottom: space.md,
  },
  lockedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  lockedItemText: {
    color: colors.textFaint,
    fontWeight: "600",
    fontSize: 14,
  },
  lockedItemTextUnlocked: { color: colors.green },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    paddingTop: space.md,
    paddingHorizontal: space.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    backgroundColor: colors.orange,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  actionBtnLocked: {
    backgroundColor: colors.surface,
  },
  actionBtnText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },
  actionBtnTextLocked: { color: colors.textFaint },
  footerHint: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: "center",
    marginTop: space.sm,
    lineHeight: 17,
  },
});
