import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UiState = {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  lastSelectedService: string | null
  setLastSelectedService: (key: string) => void
  ec2PageSize: number
  setEc2PageSize: (size: number) => void
  splitPanelSize: number
  setSplitPanelSize: (size: number) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      lastSelectedService: null,
      setLastSelectedService: (lastSelectedService) =>
        set({ lastSelectedService }),
      ec2PageSize: 10,
      setEc2PageSize: (ec2PageSize) => set({ ec2PageSize }),
      splitPanelSize: 280,
      setSplitPanelSize: (splitPanelSize) => set({ splitPanelSize }),
    }),
    { name: 'ministack:console' },
  ),
)
