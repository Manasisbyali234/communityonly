import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { API_BASE_URL } from '../api/config';
import { useAuthStore } from '../store/authStore';

const BASE = API_BASE_URL.replace('/api/v1', '');
const toAbs = (url: string | null): string | null =>
  url && url.startsWith('/') ? `${BASE}${url}` : url;

export interface PickedImage {
  localUri: string;
  filename: string;
  mimeType: string;
}

export async function pickImage(): Promise<PickedImage | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  const filename = asset.uri.split('/').pop() ?? 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = match ? `image/${match[1].toLowerCase().replace('jpg', 'jpeg')}` : 'image/jpeg';

  return { localUri: asset.uri, filename, mimeType };
}

export async function uploadImage(picked: PickedImage): Promise<string | null> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(picked.localUri);
    const blob = await response.blob();
    formData.append('file', new File([blob], picked.filename, { type: picked.mimeType }));
  } else {
    formData.append('file', { uri: picked.localUri, name: picked.filename, type: picked.mimeType } as any);
  }

  const res = await apiClient.post('/media/upload', formData);
  const url = res.data?.data?.url ?? res.data?.url ?? null;
  return toAbs(url);
}

async function _uploadToEndpoint(picked: PickedImage, endpoint: string): Promise<string | null> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(picked.localUri);
    const blob = await response.blob();
    formData.append('file', new File([blob], picked.filename, { type: picked.mimeType }));
  } else {
    formData.append('file', { uri: picked.localUri, name: picked.filename, type: picked.mimeType } as any);
  }

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
  onProgress?: (pct: number) => void
): Promise<string | null> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(picked.localUri);
    const blob = await response.blob();
    formData.append('file', new File([blob], picked.filename, { type: picked.mimeType }));
  } else {
    formData.append('file', { uri: picked.localUri, name: picked.filename, type: picked.mimeType } as any);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/api/v1/media/upload-post-video`);

    // Attach auth token
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
        } catch { reject(new Error('Invalid response')); }
      } else {
        try {
          const json = JSON.parse(xhr.responseText);
          reject(new Error(json?.message || 'Upload failed'));
        } catch { reject(new Error('Upload failed')); }
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
