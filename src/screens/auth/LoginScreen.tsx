import React, { useState } from "react";
import {
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
import { useApp } from "../../state/AppContext";
import { colors, radii, space } from "../../theme/tokens";
import { isFirebaseConfigured } from "../../firebase/config";
import { authErrorMessage } from "../../firebase/authErrors";
import type { CombinedStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<CombinedStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const firebaseActive = isFirebaseConfigured();

  const [email, setEmail] = useState(firebaseActive ? "" : "alex@example.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);

    if (firebaseActive) {
      if (!email.trim()) { setError("Please enter your email address."); return; }
      if (!password) { setError("Please enter your password."); return; }
    }

    setLoading(true);
    try {
      await login(email, password);
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
        <Text style={styles.headerLabel}>WELCOME BACK</Text>
        <Text style={styles.headerTitle}>Sign in</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Firebase / Demo mode badge */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>{firebaseActive ? "Firebase" : "Demo"}</Text>
        </View>

        {!firebaseActive ? (
          <Text style={styles.sub}>
            Passenger app: use any normal email → map, booking, vehicles. Driver app:
            put <Text style={styles.monoHint}>operator</Text> in the email (
            try <Text style={styles.monoHint}>jamie.operator@test.com</Text>) to skip to an
            approved driver with the Partner panel.
          </Text>
        ) : null}

        <RLField
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(null); }}
        />

        {/* Password with show/hide */}
        <View style={styles.passwordWrap}>
          <RLField
            label="Password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(null); }}
            placeholder={firebaseActive ? undefined : "Any value works in demo"}
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

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <RLButton
          label="Sign in"
          onPress={handleSignIn}
          style={styles.cta}
          loading={loading}
        />

        <Pressable
          onPress={() => navigation.navigate("Register")}
          style={styles.footer}
        >
          <Text style={styles.footerText}>
            New here?{" "}
            <Text style={styles.footerAccent}>Create account</Text>
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
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.orangeFaint,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: space.lg,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orange,
  },
  badgeText: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sub: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: space.xl,
  },
  monoHint: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    color: colors.orange,
    fontWeight: "700",
    fontSize: 13,
  },

  // ── Password with eye ──
  passwordWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute",
    right: space.md,
    bottom: space.md + space.sm + 2,
  },

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
  cta: { marginTop: space.md, marginBottom: space.sm },
  footer: { marginTop: space.xl, alignItems: "center" },
  footerText: { color: colors.textMuted, fontSize: 15 },
  footerAccent: { color: colors.orange, fontWeight: "700" },
});
