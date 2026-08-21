import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ConfirmState {
  visible: boolean;
  options: ConfirmOptions;
  resolver: ((value: boolean) => void) | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
  close: () => void;
}

const DEFAULT_OPTIONS: ConfirmOptions = {
  title: 'Confirm Action',
  message: 'Are you sure you want to continue?',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  isDestructive: false,
  icon: undefined,
};

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  visible: false,
  options: DEFAULT_OPTIONS,
  resolver: null,

  confirm: (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      set({
        visible: true,
        options: {
          ...DEFAULT_OPTIONS,
          ...options,
        },
        resolver: resolve,
      });
    });
  },

  handleConfirm: () => {
    const { resolver, options } = get();
    set({ visible: false });
    if (options.onConfirm) {
      options.onConfirm();
    }
    if (resolver) {
      resolver(true);
      set({ resolver: null });
    }
  },

  handleCancel: () => {
    const { resolver, options } = get();
    set({ visible: false });
    if (options.onCancel) {
      options.onCancel();
    }
    if (resolver) {
      resolver(false);
      set({ resolver: null });
    }
  },

  close: () => {
    const { resolver } = get();
    set({ visible: false });
    if (resolver) {
      resolver(false);
      set({ resolver: null });
    }
  },
}));

export const confirmAction = (options: ConfirmOptions) => useConfirmStore.getState().confirm(options);
