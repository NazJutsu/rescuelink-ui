import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RLButton, RLField } from "../../components/ui";
import { MobileField } from "../../components/MobileField";
import { RoleBanner } from "../../components/RoleBanner";
import { useApp } from "../../state/AppContext";
import { colors, radii, space } from "../../theme/tokens";
import { isFirebaseConfigured } from "../../firebase/config";
import { authErrorMessage } from "../../firebase/authErrors";
import type { UserRole } from "../../types";
import type { CombinedStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<CombinedStackParamList, "Register">;

const ROLE_CHIPS: { value: UserRole; label: string; emoji: string }[] = [
  { value: "customer", label: "Customer", emoji: "🚗" },
  { value: "operator", label: "Driver", emoji: "🚛" },
];

export function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { register } = useApp();
  const firebaseActive = isFirebaseConfigured();

  const [role, setRole] = useState<UserRole>("customer");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength =
    password.length === 0
      ? 0
      : password.length < 8
        ? 1
        : password.length < 12
          ? 2
          : 3;

  const passwordsMatch = confirm.length > 0 && password === confirm;

  const openLegal = (kind: "terms" | "privacy" | "operator_contract") =>
    navigation.navigate("Legal", { kind });

  const handleCreate = async () => {
    setError(null);

    if (!accepted) {
      Alert.alert("Consent required", "Please accept the Terms, Privacy Policy, and any applicable frameworks.");
      return;
    }
    if (password !== confirm) {
      setError("Password and confirmation do not match.");
      return;
    }
    if (firebaseActive) {
      if (!firstName.trim()) { setError("Please enter your first name."); return; }
      if (!email.trim()) { setError("Please enter your email address."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    }

    setLoading(true);
    try {
      await register(
        {
          firstName: firstName.trim() || "Alex",
          lastName: lastName.trim() || "Rivera",
          email: email.trim() || "new@example.com",
          phone: phone.trim() || "+44 7700 900321",
          role,
        },
        password,
      );
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(authErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.orange} />
        </Pressable>
        <Text style={styles.headerLabel}>CHOOSE A REGISTRATION TYPE</Text>
        <Text style={styles.headerTitle}>Create account</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Role toggle ── */}
        <View style={styles.roleRow}>
          {ROLE_CHIPS.map(({ value, label, emoji }) => {
            const selected = role === value;
            return (
              <Pressable
                key={value}
                onPress={() => { setRole(value); setError(null); }}
                style={[styles.roleChip, selected && styles.roleChipOn]}
              >
                <Text style={styles.roleEmoji}>{emoji}</Text>
                <Text style={[styles.roleChipText, selected && styles.roleChipTextOn]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Role confirmation banner ── */}
        <RoleBanner role={role} />

        {/* ── Driver approval notice ── */}
        {role === "operator" ? (
          <View style={styles.driverNotice}>
            <View style={styles.driverNoticeHeader}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.green} />
              <Text style={styles.driverNoticeTitle}>Driver approval required</Text>
            </View>
            <Text style={styles.driverNoticeBody}>
              After registering you'll complete a short onboarding — vehicle details, insurance
              certificates and a licence check. Your account goes live once our team approves
              your application.
            </Text>
          </View>
        ) : null}

        {/* ── Name row ── */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <RLField
              label="First name"
              placeholder="James"
              value={firstName}
              onChangeText={(t) => { setFirstName(t); setError(null); }}
            />
          </View>
          <View style={styles.fieldHalf}>
            <RLField
              label="Last name"
              placeholder="Smith"
              value={lastName}
              onChangeText={(t) => { setLastName(t); setError(null); }}
            />
          </View>
        </View>

        {/* ── Email ── */}
        <RLField
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(null); }}
        />

        {/* ── Mobile ── */}
        <MobileField value={phone} onChange={setPhone} />

        {/* ── Password ── */}
        <View style={styles.passwordWrap}>
          <RLField
            label="Password"
            placeholder="Create a password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(null); }}
          />
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            style={styles.eyeBtn}
            hitSlop={8}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        </View>

        {/* ── Confirm password ── */}
        <View style={styles.passwordWrap}>
          <RLField
            label="Confirm password"
            placeholder="Repeat your password"
            secureTextEntry={!showConfirm}
            value={confirm}
            onChangeText={(t) => { setConfirm(t); setError(null); }}
          />
          <Pressable
            onPress={() => setShowConfirm((s) => !s)}
            style={styles.eyeBtn}
            hitSlop={8}
          >
            <Ionicons
              name={showConfirm ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        </View>

        {/* ── Validation hints ── */}
        <View style={styles.hintsRow}>
          <View style={styles.hintItem}>
            <Ionicons
              name={password.length >= 8 ? "checkmark-circle" : "checkmark-circle-outline"}
              size={14}
              color={password.length >= 8 ? colors.green : colors.textFaint}
            />
            <Text style={[styles.hintText, password.length >= 8 && styles.hintOk]}>
              8+ characters
            </Text>
          </View>
          <View style={styles.hintItem}>
            <Ionicons
              name={passwordsMatch ? "checkmark-circle" : "checkmark-circle-outline"}
              size={14}
              color={passwordsMatch ? colors.green : colors.textFaint}
            />
            <Text style={[styles.hintText, passwordsMatch && styles.hintOk]}>
              Passwords match
            </Text>
          </View>
        </View>

        {/* ── Password strength meter ── */}
        <View style={styles.meterRow}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.meterSeg,
                strength > i && {
                  backgroundColor:
                    strength >= 3 ? colors.green : strength === 2 ? colors.orange : colors.red,
                },
              ]}
            />
          ))}
        </View>

        {/* ── Consent ── */}
        <Pressable
          style={styles.checkRow}
          onPress={() => setAccepted((a) => !a)}
        >
          <View style={[styles.checkBox, accepted && styles.checkBoxOn]} />
          <Text style={styles.checkLabel}>
            I have read and agree to the{" "}
            <Text style={styles.legalLink} onPress={() => openLegal("terms")}>Terms of Service</Text>
            {" "}and{" "}
            <Text style={styles.legalLink} onPress={() => openLegal("privacy")}>Privacy Policy</Text>
            {role === "operator" ? (
              <>
                {" "}and{" "}
                <Text style={styles.legalLink} onPress={() => openLegal("operator_contract")}>
                  Operator Framework
                </Text>
              </>
            ) : null}
          </Text>
        </Pressable>

        {/* ── Error ── */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Submit ── */}
        <RLButton
          label="Create account"
          onPress={handleCreate}
          style={styles.cta}
          loading={loading}
        />

        <Pressable onPress={() => navigation.navigate("Login")} style={styles.signInRow}>
          <Text style={styles.signInText}>
            Already have an account?{" "}
            <Text style={styles.signInBold}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },

  // ── Header ──
  header: {
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
    gap: 4,
  },
  backBtn: { alignSelf: "flex-start", marginBottom: space.xs },
  headerLabel: {
    color: colors.orange,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  // ── Scroll body ──
  scroll: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },

  // ── Role chips ──
  roleRow: {
    flexDirection: "row",
    gap: space.sm,
    marginBottom: space.md,
  },
  roleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: space.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleChipOn: {
    borderColor: colors.borderOrange,
    backgroundColor: colors.orangeFaint,
  },
  roleEmoji: { fontSize: 16 },
  roleChipText: { color: colors.textMuted, fontWeight: "700", fontSize: 15 },
  roleChipTextOn: { color: colors.white },

  // ── Driver notice ──
  driverNotice: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.30)",
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.lg,
    gap: space.xs,
  },
  driverNoticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  driverNoticeTitle: {
    color: colors.green,
    fontWeight: "800",
    fontSize: 14,
  },
  driverNoticeBody: {
    color: colors.textMuted,
    lineHeight: 20,
    fontSize: 13,
  },

  // ── Side-by-side fields ──
  fieldRow: { flexDirection: "row", gap: space.sm },
  fieldHalf: { flex: 1 },

  // ── Password with eye ──
  passwordWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute",
    right: space.md,
    bottom: space.md + space.sm + 2,
  },

  // ── Hints ──
  hintsRow: {
    flexDirection: "row",
    gap: space.lg,
    marginBottom: space.sm,
    marginTop: -space.xs,
  },
  hintItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  hintText: { color: colors.textFaint, fontSize: 12 },
  hintOk: { color: colors.green },

  // ── Strength meter ──
  meterRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: space.lg,
  },
  meterSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface3,
  },

  // ── Consent ──
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: space.lg,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    backgroundColor: colors.surface2,
    marginTop: 2,
    flexShrink: 0,
  },
  checkBoxOn: { backgroundColor: colors.orange },
  checkLabel: { flex: 1, color: colors.textMuted, lineHeight: 22 },
  legalLink: { color: colors.orange, fontWeight: "700" },

  // ── Error ──
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.md,
  },
  errorText: { color: "#f87171", fontSize: 14, lineHeight: 20 },

  // ── CTAs ──
  cta: { marginBottom: space.md },
  signInRow: { alignItems: "center", paddingVertical: space.sm },
  signInText: { color: colors.textMuted, fontSize: 14 },
  signInBold: { color: colors.orange, fontWeight: "700" },
});
