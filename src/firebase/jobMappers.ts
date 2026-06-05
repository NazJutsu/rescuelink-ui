import type { PastJob } from "../types";
import type { JobDoc } from "./jobService";

export function jobDocToPastJob(job: JobDoc): PastJob {
  return {
    id: job.id,
    createdAt: job.createdAt,
    status: job.status,
    operatorName: job.driverName ?? "—",
    amountGbp: job.totalGbp,
    pickupLabel: job.pickupLabel,
    vehicleReg: job.vehicleLabel.split("·").pop()?.trim() ?? "—",
  };
}

export function sortJobsNewestFirst(jobs: JobDoc[]): JobDoc[] {
  return [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function jobTimestamp(job: JobDoc): Date {
  const iso = job.completedAt ?? job.createdAt;
  return new Date(iso);
}

/** Sum of completed job payouts since local midnight today. */
export function sumCompletedToday(jobs: JobDoc[]): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return jobs
    .filter((j) => j.status === "completed" && jobTimestamp(j) >= start)
    .reduce((sum, j) => sum + j.totalGbp, 0);
}

export function countCompleted(jobs: JobDoc[]): number {
  return jobs.filter((j) => j.status === "completed").length;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Completed earnings grouped by day for the current Mon–Sun week. */
export function earningsByDayThisWeek(
  jobs: JobDoc[],
): { day: string; amount: number }[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return { date, day: DAY_LABELS[date.getDay()], amount: 0 };
  });

  for (const job of jobs) {
    if (job.status !== "completed") continue;
    const created = jobTimestamp(job);
    for (const bucket of buckets) {
      if (sameDay(created, bucket.date)) {
        bucket.amount += job.totalGbp;
        break;
      }
    }
  }

  return buckets.map(({ day, amount }) => ({ day, amount }));
}

export function formatJobWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (sameDay(d, now)) return `Today · ${time}`;
    if (sameDay(d, yesterday)) return `Yesterday · ${time}`;
    const day = d.toLocaleDateString("en-GB", { weekday: "short" });
    return `${day} · ${time}`;
  } catch {
    return iso;
  }
}
