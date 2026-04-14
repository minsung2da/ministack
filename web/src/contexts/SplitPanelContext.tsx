import { createContext, useContext, useState, type ReactNode } from 'react'

type SplitPanelState = {
  panel: ReactNode | null
  header: string
  isOpen: boolean
}

type SplitPanelActions = {
  setPanel: (panel: ReactNode, header: string) => void
  closePanel: () => void
}

type SplitPanelContextValue = SplitPanelState & SplitPanelActions

const SplitPanelContext = createContext<SplitPanelContextValue | null>(null)

export function SplitPanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SplitPanelState>({
    panel: null,
    header: '',
    isOpen: false,
  })

  const setPanel = (panel: ReactNode, header: string) => {
    setState({ panel, header, isOpen: true })
  }

  const closePanel = () => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }

  return (
    <SplitPanelContext.Provider value={{ ...state, setPanel, closePanel }}>
      {children}
    </SplitPanelContext.Provider>
  )
}

export function useSplitPanel(): SplitPanelContextValue {
  const ctx = useContext(SplitPanelContext)
  if (!ctx) {
    throw new Error('useSplitPanel must be used within a SplitPanelProvider')
  }
  return ctx
}
