import { Outlet } from 'react-router-dom'
import AppLayout from '@cloudscape-design/components/app-layout'
import ContentLayout from '@cloudscape-design/components/content-layout'
import SplitPanel from '@cloudscape-design/components/split-panel'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { Breadcrumbs } from './Breadcrumbs'
import { useUiStore } from '../stores/uiStore'
import {
  SplitPanelProvider,
  useSplitPanel,
} from '../contexts/SplitPanelContext'

function ConsoleShellInner() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const ctx = useSplitPanel()

  return (
    <AppLayout
      navigation={<Sidebar />}
      navigationOpen={sidebarOpen}
      onNavigationChange={({ detail }) => setSidebarOpen(detail.open)}
      toolsHide
      breadcrumbs={<Breadcrumbs />}
      content={
        <ContentLayout>
          <Outlet />
        </ContentLayout>
      }
      headerSelector="#top-nav"
      splitPanel={
        ctx.isOpen ? (
          <SplitPanel header={ctx.header}>{ctx.panel}</SplitPanel>
        ) : null
      }
      splitPanelOpen={ctx.isOpen}
      onSplitPanelToggle={({ detail }) => {
        if (!detail.open) {
          ctx.closePanel()
        }
      }}
      splitPanelPreferences={{ position: 'bottom' }}
      onSplitPanelPreferencesChange={() => {}}
    />
  )
}

export function ConsoleShell() {
  return (
    <>
      <TopBar />
      <SplitPanelProvider>
        <ConsoleShellInner />
      </SplitPanelProvider>
    </>
  )
}
