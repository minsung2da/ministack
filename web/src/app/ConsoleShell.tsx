import { Outlet } from 'react-router-dom'
import AppLayout from '@cloudscape-design/components/app-layout'
import ContentLayout from '@cloudscape-design/components/content-layout'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { Breadcrumbs } from './Breadcrumbs'
import { useUiStore } from '../stores/uiStore'

export function ConsoleShell() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)

  return (
    <>
      <TopBar />
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
      />
    </>
  )
}
