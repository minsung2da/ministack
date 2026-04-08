import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UiState = {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  lastSelectedService: string | null
  setLastSelectedService: (key: string) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      lastSelectedService: null,
      setLastSelectedService: (lastSelectedService) =>
        set({ lastSelectedService }),
    }),
    { name: 'ministack:console' },
  ),
)
