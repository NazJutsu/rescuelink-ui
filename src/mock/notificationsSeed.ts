export type InAppNotificationItem = {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  unread: boolean;
};

export const seedNotifications: InAppNotificationItem[] = [
  {
    id: "n1",
    title: "Driver ETA update",
    body: "We'll remind you five minutes before your operator arrives.",
    timeLabel: "Just now",
    unread: true,
  },
  {
    id: "n2",
    title: "Job receipt",
    body: "Your last recovery was invoiced successfully (demo).",
    timeLabel: "Yesterday",
    unread: true,
  },
  {
    id: "n3",
    title: "RescueLink",
    body: "Push alerts aren’t wired to a server yet — this list is demo data.",
    timeLabel: "System",
    unread: false,
  },
];

export function unreadNotificationsCount(items: InAppNotificationItem[]): number {
  return items.reduce((acc, n) => acc + (n.unread ? 1 : 0), 0);
}
