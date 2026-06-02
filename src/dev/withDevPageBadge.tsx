import React from "react";
import { View, StyleSheet } from "react-native";
import { DevPageBadge } from "./DevPageBadge";
import type { DevPageRef } from "./pageNumbers";

export function withDevPageBadge<P extends object>(
  Wrapped: React.ComponentType<P>,
  page: DevPageRef,
): React.ComponentType<P> {
  const name = Wrapped.displayName ?? Wrapped.name ?? "Screen";
  function ScreenWithDevPageBadge(props: P) {
    return (
      <View style={styles.root}>
        <Wrapped {...props} />
        <DevPageBadge id={page.id} label={page.label} />
      </View>
    );
  }
  ScreenWithDevPageBadge.displayName = `DevPage(${name})`;
  return ScreenWithDevPageBadge;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
