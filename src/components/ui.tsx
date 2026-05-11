import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { colors, radii, space } from "../theme/tokens";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function RLButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        isPrimary && styles.btnPrimary,
        variant === "ghost" && styles.btnGhost,
        isDanger && styles.btnDanger,
        (disabled || loading) && styles.btnDisabled,
        pressed && styles.btnPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.orange} />
      ) : (
        <Text
          style={[
            styles.btnText,
            isPrimary && styles.btnTextOnPrimary,
            variant === "ghost" && styles.btnTextGhost,
            isDanger && styles.btnTextOnPrimary,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

type FieldProps = TextInputProps & {
  label: string;
};

export function RLField({ label, style, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

export function RLSectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: space.md,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  btnPrimary: {
    backgroundColor: colors.orange,
    borderColor: colors.borderOrange,
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderColor: colors.border,
  },
  btnDanger: {
    backgroundColor: colors.red,
    borderColor: "transparent",
  },
  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.88 },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  btnTextOnPrimary: { color: colors.white },
  btnTextGhost: { color: colors.orange },
  field: { marginBottom: space.md },
  fieldLabel: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: space.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    color: colors.text,
    fontSize: 16,
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: space.sm,
  },
});
