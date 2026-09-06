import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { API_BASE_URL } from '../api/config';
import { useAuthStore } from '../store/authStore';

export const MAX_MEDIA_UPLOAD_SIZE_BYTES = 200 * 1024 * 1024;

export function assertWithinMediaUploadLimit(size?: number): void {
  if (typeof size === 'number' && size > MAX_MEDIA_UPLOAD_SIZE_BYTES) {
    throw new Error('File must be 200 MB or smaller.');
  }
}

async function compressImage(uri: string, mimeType: string): Promise<{ uri: string; mimeType: string }> {
  if (Platform.OS === 'web') return { uri, mimeType };

  const isJpeg = mimeType === 'image/jpeg' || mimeType === 'image/jpg';
  const format = isJpeg
    ? ImageManipulator.SaveFormat.WEBP
    : ImageManipulator.SaveFormat.JPEG;
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1920 } }],
    { compress: 0.75, format },
  );
  return {
    uri: result.uri,
    mimeType: isJpeg ? 'image/webp' : mimeType,
  };
}

const BASE = API_BASE_URL.replace('/api/v1', '');
const toAbs = (url: string | null): string | null =>
  url && url.startsWith('/') ? `${BASE}${url}` : url;

export interface PickedImage {
  localUri: string;
  filename: string;
  mimeType: string;
  size?: number;
}

export interface PickImageOptions {
  aspect?: [number, number];
  onPermissionDenied?: () => void;
}

async function jpegBlobToWebp(blob: Blob): Promise<Blob> {
  if (typeof document === 'undefined') return blob;

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not load image for conversion.'));
    });

    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2560 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    if (!context) return blob;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((converted) => {
        if (converted) resolve(converted);
        else reject(new Error('Could not convert image to WebP.'));
      }, 'image/webp', 0.82);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function appendPickedFile(formData: FormData, picked: PickedImage): Promise<void> {
  assertWithinMediaUploadLimit(picked.size);

  if (Platform.OS !== 'web') {
    formData.append('file', { uri: picked.localUri, name: picked.filename, type: picked.mimeType } as any);
    return;
  }

  const response = await fetch(picked.localUri);
  let blob = await response.blob();
  assertWithinMediaUploadLimit(blob.size);

  let filename = picked.filename;
  let mimeType = picked.mimeType || blob.type || 'application/octet-stream';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    blob = await jpegBlobToWebp(blob);
    assertWithinMediaUploadLimit(blob.size);
    filename = filename.replace(/\.(jpe?g)$/i, '.webp') || `${filename}.webp`;
    mimeType = 'image/webp';
  }

  formData.append('file', new File([blob], filename, { type: mimeType }));
}

export async function pickImage(options?: PickImageOptions): Promise<PickedImage | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    options?.onPermissionDenied?.();
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: options?.aspect,
    quality: 0.8,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  assertWithinMediaUploadLimit(asset.fileSize);
  const filename = asset.uri.split('/').pop() ?? 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const rawMime = match ? `image/${match[1].toLowerCase().replace('jpg', 'jpeg')}` : 'image/jpeg';
  const { uri: compressedUri, mimeType } = await compressImage(asset.uri, rawMime);
  const finalFilename = mimeType === 'image/webp'
    ? filename.replace(/\.(jpg|jpeg)$/i, '.webp')
    : filename;
  return { localUri: compressedUri, filename: finalFilename, mimeType, size: asset.fileSize };
}

export async function takePhoto(options?: PickImageOptions): Promise<PickedImage | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    options?.onPermissionDenied?.();
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: options?.aspect,
    quality: 0.8,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  assertWithinMediaUploadLimit(asset.fileSize);
  const filename = asset.uri.split('/').pop() ?? 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const rawMime = match ? `image/${match[1].toLowerCase().replace('jpg', 'jpeg')}` : 'image/jpeg';
  const { uri: compressedUri, mimeType } = await compressImage(asset.uri, rawMime);
  const finalFilename = mimeType === 'image/webp'
    ? filename.replace(/\.(jpg|jpeg)$/i, '.webp')
    : filename;
  return { localUri: compressedUri, filename: finalFilename, mimeType, size: asset.fileSize };
}

export async function uploadImage(picked: PickedImage): Promise<string | null> {
  const formData = new FormData();
  await appendPickedFile(formData, picked);

  const res = await apiClient.post('/media/upload', formData);
  const url = res.data?.data?.url ?? res.data?.url ?? null;
  return toAbs(url);
}

async function _uploadToEndpoint(picked: PickedImage, endpoint: string): Promise<string | null> {
  const formData = new FormData();
  await appendPickedFile(formData, picked);

  const res = await apiClient.post(endpoint, formData);
  const url = res.data?.data?.url ?? res.data?.url ?? null;
  return toAbs(url);
}

export async function uploadProfilePhoto(picked: PickedImage): Promise<string | null> {
  return _uploadToEndpoint(picked, '/media/upload-profile-photo');
}

export async function uploadCoverPhoto(picked: PickedImage): Promise<string | null> {
  return _uploadToEndpoint(picked, '/media/upload-cover-photo');
}

export async function uploadPostImage(picked: PickedImage): Promise<string | null> {
  return _uploadToEndpoint(picked, '/media/upload-post-image');
}

export async function uploadPostVideo(
  picked: PickedImage,
  onProgress?: (pct: number) => void,
): Promise<string | null> {
  const formData = new FormData();
  await appendPickedFile(formData, picked);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/api/v1/media/upload-post-video`);

    const { token } = useAuthStore.getState();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          const url = json?.data?.url ?? null;
          resolve(url && url.startsWith('/') ? `${BASE}${url}` : url);
        } catch {
          reject(new Error('Invalid response'));
        }
      } else {
        try {
          const json = JSON.parse(xhr.responseText);
          reject(new Error(json?.message || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

/** @deprecated use pickImage + uploadImage separately */
export async function pickAndSaveImage(): Promise<string | null> {
  const picked = await pickImage();
  if (!picked) return null;
  return uploadImage(picked);
}
