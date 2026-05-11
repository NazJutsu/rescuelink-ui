/** Time-of-day salutation only (caller adds name etc.). Uses local timezone. */
export function greetingSalutation(reference = new Date()): string {
  const hour = reference.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
