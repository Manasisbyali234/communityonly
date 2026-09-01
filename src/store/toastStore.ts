import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  message: string;
  type: ToastType;
  visible: boolean;
  duration?: number;
}

interface ToastState {
  toast: Toast;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toast: {
    message: '',
    type: 'info',
    visible: false,
    duration: 3200,
  },
  showToast: (message, type = 'info', duration = 3200) =>
    set({
      toast: { message, type, visible: true, duration },
    }),
  hideToast: () =>
    set((state) => ({
      toast: { ...state.toast, visible: false },
    })),
}));

