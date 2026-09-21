import { Outlet } from 'react-router-dom';

import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

export function MainLayout() {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className='min-w-0 bg-transparent'>
        <header className='flex h-12 shrink-0 items-center px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-10'>
          <SidebarTrigger className='-ml-1' />
        </header>
        <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 pt-0'>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
