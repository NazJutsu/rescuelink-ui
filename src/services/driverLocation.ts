import * as Location from "expo-location";
import { updateDriverLocation } from "../firebase/jobService";

const UPDATE_INTERVAL_MS = 5000;
const MIN_DISTANCE_M = 15;

/**
 * Starts broadcasting the driver's GPS to the active job doc in Firestore.
 * Returns a cleanup function that stops the watch.
 */
export async function startDriverLocationBroadcast(
  jobId: string,
): Promise<() => void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return () => {};

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: UPDATE_INTERVAL_MS,
      distanceInterval: MIN_DISTANCE_M,
    },
    (location) => {
      void updateDriverLocation(
        jobId,
        location.coords.latitude,
        location.coords.longitude,
      );
    },
  );

  return () => subscription.remove();
}
