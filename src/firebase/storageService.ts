import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { getFirebaseApp } from "./config";
import type { MockUploadedFile } from "../types";

function getFirebaseStorage() {
  return getStorage(getFirebaseApp());
}

/** Prompts the user to pick an image/document from their library. */
export async function pickDocument(): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.85,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0];
}

/**
 * Opens the camera to take a photo. Falls back to library if camera is unavailable.
 * Returns the asset or null if cancelled.
 */
export async function takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
  const camPerm = await ImagePicker.requestCameraPermissionsAsync();
  if (camPerm.status === "granted") {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets.length > 0) return result.assets[0];
    return null;
  }
  // Camera not available — fall back to library
  const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (libPerm.status !== "granted") return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.9,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0];
}

/**
 * Uploads a vehicle inspection photo to Firebase Storage.
 * Returns the public download URL.
 */
export async function uploadInspectionPhoto(
  jobId: string,
  slotKey: string,
  asset: ImagePicker.ImagePickerAsset,
): Promise<string> {
  const storage = getFirebaseStorage();
  const ext = asset.uri.split(".").pop() ?? "jpg";
  const mime = asset.mimeType ?? `image/${ext}`;
  const storagePath = `jobs/${jobId}/inspection/${slotKey}.${ext}`;

  const response = await fetch(asset.uri);
  const blob = await response.blob();

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType: mime });
  return getDownloadURL(storageRef);
}

/**
 * Uploads a picked asset to Firebase Storage and returns a MockUploadedFile
 * (compatible with the existing OperatorProfile type) containing the download URL.
 */
export async function uploadOperatorDoc(
  uid: string,
  fieldKey: string,
  asset: ImagePicker.ImagePickerAsset,
): Promise<MockUploadedFile> {
  const storage = getFirebaseStorage();
  const ext = asset.uri.split(".").pop() ?? "jpg";
  const mime = asset.mimeType ?? `image/${ext}`;
  const fileName = `${fieldKey}.${ext}`;
  const storagePath = `operators/${uid}/${fileName}`;

  const response = await fetch(asset.uri);
  const blob = await response.blob();

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType: mime });
  const downloadUrl = await getDownloadURL(storageRef);

  return {
    fileName: downloadUrl,
    mime,
    uploadedAt: new Date().toISOString(),
  };
}
