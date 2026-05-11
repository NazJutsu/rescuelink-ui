import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { seedNotifications } from "../../mock/notificationsSeed";
import type { RootStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.close}>Close</Text>
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 52 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + space.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.disclaimer}>
          Demo inbox — alerts will connect to your account once the RescueLink backend is live.
        </Text>
        {seedNotifications.map((n, idx) => (
          <View
            key={n.id}
            style={[
              styles.row,
              n.unread && styles.rowUnread,
              idx < seedNotifications.length - 1 && { marginBottom: space.sm },
            ]}
          >
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>{n.title}</Text>
              <Text style={styles.rowTime}>{n.timeLabel}</Text>
            </View>
            <Text style={styles.rowBody}>{n.body}</Text>
            {n.unread ? (
              <View style={styles.unreadTag}>
                <Text style={styles.unreadTagText}>New</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  close: { color: colors.orange, fontWeight: "700", fontSize: 16 },
  title: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 17,
  },
  scrollContent: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: space.md,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  rowUnread: {
    borderColor: colors.borderOrange,
    backgroundColor: colors.orangeFaint,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: space.md,
    marginBottom: space.xs,
  },
  rowTitle: {
    flex: 1,
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
  },
  rowTime: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 0,
  },
  rowBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  unreadTag: {
    alignSelf: "flex-start",
    marginTop: space.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.orange,
  },
  unreadTagText: {
    color: colors.bg,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
