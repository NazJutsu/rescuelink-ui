import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, space } from "../theme/tokens";

type Props = {
  value: string;
  onChange: (t: string) => void;
  editable?: boolean;
  placeholder?: string;
};

export function MobileField({
  value,
  onChange,
  editable = true,
  placeholder = "7700 900 123",
}: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>MOBILE NUMBER</Text>
      <View style={styles.row}>
        <View style={styles.flagChip}>
          <Text style={styles.flagText}>GB +44</Text>
        </View>
        <TextInput
          style={[styles.input, !editable && styles.inputDisabled]}
          value={value}
          onChangeText={onChange}
          keyboardType="phone-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          editable={editable}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: space.md },
  label: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  row: { flexDirection: "row", gap: space.sm },
  flagChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  flagText: { color: colors.text, fontWeight: "700", fontSize: 14 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    color: colors.text,
    fontSize: 16,
  },
  inputDisabled: { opacity: 0.55 },
});
