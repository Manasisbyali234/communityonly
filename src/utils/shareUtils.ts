import { Platform, Share } from 'react-native';
import { apiClient } from '../api/client';

const DOWNLOAD_PAGE_URL = 'https://community-api.metromindz.com/download';

export function getAppDownloadLink(referrerId?: string): string {
  const base = DOWNLOAD_PAGE_URL;
  return referrerId ? `${base}?ref=${referrerId}` : base;
}

export async function trackShare(sharerId: string, sharedWith = 'Shared via system share', sharedEmail?: string) {
  try {
    await apiClient.post('/referral/share', { sharedWith, sharedEmail });
  } catch { /* non-blocking */ }
}

export async function shareAppLink(displayName: string, referrerId?: string): Promise<boolean> {
  const link = getAppDownloadLink(referrerId);
  const message = `Hey! ${displayName} has invited you to join the GowdaCommunity app. Connect with family and community members, stay updated on events, and more!\n\nGet the app: ${link}`;

  return shareUrl(message, link, referrerId);
}

// Shares the exact supplied content. The previous compatibility wrapper
// discarded both arguments and sent a generic invite instead.
export async function shareUrl(message: string, url?: string, sharerId?: string): Promise<boolean> {
  const shareText = url && !message.includes(url) ? `${message}\n\n${url}` : message;
  if (Platform.OS !== 'web') {
    try {
      // url field is iOS-only — Android crashes if both message and url are passed
      const content = Platform.OS === 'ios'
        ? { message: shareText, url }
        : { message: shareText };
      await Share.share(content);
      if (sharerId) trackShare(sharerId);
      return true;
    } catch {
      return false;
    }
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: 'GowdaCommunity', text: shareText, url });
      if (sharerId) trackShare(sharerId);
      return true;
    }
  } catch { /* dismissed */ }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText);
      if (sharerId) trackShare(sharerId);
      return true;
    }
  } catch { /* unavailable on HTTP */ }

  // execCommand fallback — works on plain HTTP
  try {
    const el = document.createElement('textarea');
    el.value = shareText;
    el.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    if (ok && sharerId) trackShare(sharerId);
    return ok;
  } catch {
    return false;
  }
}
