import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RLButton, RLField } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { colors, radii, space } from "../../theme/tokens";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useApp();
  const [email, setEmail] = useState("alex@example.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Customer</Text>
        </View>
        <Text style={styles.title}>
          Rescue<Text style={styles.titleAccent}>Link</Text>
        </Text>
        <Text style={styles.sub}>
          Sign in to request on-demand recovery with upfront pricing (mock
          data).
        </Text>

        <RLField
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <RLField
          label="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          placeholder="Any value works in demo"
        />
        <Pressable
          onPress={() => setShowPassword((s) => !s)}
          style={styles.toggleRow}
        >
          <Text style={styles.link}>{showPassword ? "Hide" : "Show"} password</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            Linking.openURL("https://docs.expo.dev/")
          }
        >
          <Text style={styles.linkMuted}>Forgot password?</Text>
        </Pressable>

        <RLButton
          label="Sign in"
          onPress={() => {
            login(email);
          }}
          style={styles.cta}
        />

        <RLButton
          label="Phone OTP (mock)"
          variant="ghost"
          onPress={() => {
            login(email);
          }}
        />

        <Pressable
          onPress={() => navigation.navigate("Register")}
          style={styles.footer}
        >
          <Text style={styles.footerText}>
            New here? <Text style={styles.footerAccent}>Create account</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: space.xl,
    paddingTop: 48,
    paddingBottom: 40,
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
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -1,
    marginBottom: space.sm,
  },
  titleAccent: { color: colors.orange },
  sub: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: space.xl,
  },
  toggleRow: { marginBottom: space.sm },
  link: { color: colors.orange, fontWeight: "600", fontSize: 14 },
  linkMuted: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: space.lg,
  },
  cta: { marginTop: space.md, marginBottom: space.sm },
  footer: { marginTop: space.xl, alignItems: "center" },
  footerText: { color: colors.textMuted, fontSize: 15 },
  footerAccent: { color: colors.orange, fontWeight: "700" },
});
