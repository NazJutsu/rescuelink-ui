import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { colors, radii, space } from "../theme/tokens";

type FieldDef = TextInputProps & {
  label: string;
};

type Props = {
  fields: FieldDef[];
};

/**
 * Renders multiple related fields inside a single grouped card,
 * separated by thin divider lines.
 */
export function FieldGroup({ fields }: Props) {
  return (
    <View style={styles.card}>
      {fields.map((field, i) => {
        const { label, style, ...inputProps } = field;
        return (
          <React.Fragment key={label}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.row}>
              <Text style={styles.label}>{label.toUpperCase()}</Text>
              <TextInput
                placeholderTextColor={colors.textFaint}
                style={[styles.input, style]}
                {...inputProps}
              />
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: space.md,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm + 2,
    paddingBottom: space.sm + 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: space.lg,
  },
  label: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  input: {
    color: colors.text,
    fontSize: 16,
    paddingVertical: 2,
  },
});
