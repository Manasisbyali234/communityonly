import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event } from '../types';

interface EventStore {
  localEvents: Event[];
  addEvent: (event: Event) => void;
  removeEvent: (id: string) => void;
}

export const useEventStore = create<EventStore>()(
  persist(
    (set) => ({
      localEvents: [],
      addEvent: (event) =>
        set((state) => ({
          localEvents: [event, ...state.localEvents.filter((e) => e.id !== event.id)],
        })),
      removeEvent: (id) =>
        set((state) => ({ localEvents: state.localEvents.filter((e) => e.id !== id) })),
    }),
    {
      name: 'local-events-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
