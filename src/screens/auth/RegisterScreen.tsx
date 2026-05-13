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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RLButton, RLField, RLSectionLabel } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { colors, radii, space } from "../../theme/tokens";
import type { UserRole } from "../../mock/types";
import type { CombinedStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<CombinedStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useApp();
  const [role, setRole] = useState<UserRole>("customer");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);

  const strength =
    password.length === 0
      ? 0
      : password.length < 8
        ? 1
        : password.length < 12
          ? 2
          : 3;

  const openLegal = (kind: "terms" | "privacy" | "operator_contract") => {
    navigation.navigate("Legal", { kind });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>Create account</Text>
        <Text style={styles.screenSub}>
          Drivers complete compliance first, then use the Partner panel (Home · Jobs · Earnings ·
          More)—no passenger map. Customers use the map home screen.
        </Text>
        <RLSectionLabel>Role</RLSectionLabel>
        <View style={styles.roleRow}>
          {(
            [
              ["customer", "Customer"],
              ["operator", "Driver"],
            ] as const
          ).map(([value, label]) => {
            const selected = role === value;
            return (
              <Pressable
                key={value}
                onPress={() => setRole(value)}
                style={[styles.roleChip, selected && styles.roleChipOn]}
              >
                <Text
                  style={[styles.roleChipText, selected && styles.roleChipTextOn]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {role === "operator" ? (
          <View style={styles.driverCallout}>
            <Text style={styles.driverCalloutTitle}>Driver signup path</Text>
            <Text style={styles.driverCalloutBody}>
              You complete verification first, wait for approval, then unlock the Partner tabs:
              availability & offers on Home, Jobs, earnings tab, and account on More.
              You won’t see the passenger map unless you also create a customer account.
            </Text>
          </View>
        ) : null}

        <RLField label="First name" value={firstName} onChangeText={setFirstName} />
        <RLField label="Last name" value={lastName} onChangeText={setLastName} />
        <RLField
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <RLField
          label="Phone (SMS notifications)"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <RLField
          label="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <RLField
          label="Confirm password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        <RLSectionLabel>Password strength</RLSectionLabel>
        <View style={styles.meterRow}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.meterSeg,
                strength > i && {
                  backgroundColor:
                    strength >= 3
                      ? colors.green
                      : strength === 2
                        ? colors.orange
                        : colors.red,
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.meterHint}>
          {password.length === 0
            ? "Start typing a password"
            : strength >= 3
              ? "Strong"
              : strength === 2
                ? "Good"
                : "Weak"}
        </Text>

        <Pressable
          style={styles.checkRow}
          onPress={() => setAccepted((a) => !a)}
        >
          <View style={[styles.checkBox, accepted && styles.checkBoxOn]} />
          <Text style={styles.checkLabel}>
            Tap the links below, then checkbox to acknowledge you read them (placeholder copy).
          </Text>
        </Pressable>

        <View style={styles.legalLinks}>
          <Pressable onPress={() => openLegal("terms")}>
            <Text style={styles.linkBtn}>Terms of service</Text>
          </Pressable>
          <Pressable onPress={() => openLegal("privacy")}>
            <Text style={styles.linkBtn}>Privacy notice</Text>
          </Pressable>
          {role === "operator" ? (
            <Pressable onPress={() => openLegal("operator_contract")}>
              <Text style={styles.linkBtn}>Operator framework</Text>
            </Pressable>
          ) : null}
        </View>

        <RLButton
          label="Create account"
          onPress={() => {
            if (!accepted) {
              Alert.alert(
                "Consent required",
                "Please accept Terms, Privacy, and frameworks that apply.",
              );
              return;
            }
            if (password !== confirm) {
              Alert.alert("Passwords", "Password and confirmation do not match.");
              return;
            }
            register({
              firstName: firstName || "Alex",
              lastName: lastName || "Rivera",
              email: email || "new@example.com",
              phone: phone || "+44 7700 900321",
              role,
            });
          }}
          style={styles.cta}
        />

        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Already have an account? Sign in</Text>
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
    paddingBottom: 48,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.white,
    marginBottom: space.xs,
  },
  screenSub: { color: colors.textMuted, marginBottom: space.xl, lineHeight: 22 },
  roleRow: { flexDirection: "row", gap: space.sm, marginBottom: space.lg },
  roleChip: {
    flex: 1,
    paddingVertical: space.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  roleChipOn: {
    borderColor: colors.borderOrange,
    backgroundColor: colors.orangeFaint,
  },
  roleChipText: { color: colors.textMuted, fontWeight: "600" },
  roleChipTextOn: { color: colors.white },
  driverCallout: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.lg,
  },
  driverCalloutTitle: {
    color: colors.green,
    fontWeight: "800",
    marginBottom: space.xs,
  },
  driverCalloutBody: { color: colors.textMuted, lineHeight: 20, fontSize: 14 },
  meterRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  meterSeg: {
    flex: 1,
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.surface3,
  },
  meterHint: { color: colors.textMuted, fontSize: 13, marginBottom: space.lg },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: space.lg },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    backgroundColor: colors.surface2,
    marginTop: 2,
  },
  checkBoxOn: { backgroundColor: colors.orange },
  checkLabel: { flex: 1, color: colors.textMuted, lineHeight: 20 },
  legalLinks: {
    gap: space.sm,
    marginBottom: space.xl,
  },
  linkBtn: { color: colors.orange, fontWeight: "700", paddingVertical: 4 },
  cta: { marginBottom: space.md },
  back: { color: colors.orange, fontWeight: "600", textAlign: "center" },
});
