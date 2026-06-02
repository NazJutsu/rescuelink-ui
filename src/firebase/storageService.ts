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
