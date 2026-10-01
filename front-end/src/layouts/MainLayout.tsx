import { matchPath, Outlet, useLocation } from 'react-router-dom';

import { AppSidebar } from '@/components/app-sidebar';
import { RestaurantOrderChat } from '@/components/restaurant-order-chat';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/useAuth';
import { ROUTES } from '@/routes/constants';

const HIDE_CHROME_HEADER_PATTERNS = [
  ROUTES.REQUESTER_ORDER_NEW,
  ROUTES.REQUESTER_ORDER_WIZARD,
  ROUTES.REQUESTER_ORDER_EDIT,
] as const;

export function MainLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const hideChromeHeader = HIDE_CHROME_HEADER_PATTERNS.some((pattern) =>
    matchPath({ path: pattern, end: true }, pathname),
  );
  const showRestaurantChat =
    user?.role === 'RESTAURANT' || user?.role === 'SUPER_ADMIN';

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className='min-w-0 bg-transparent'>
        {hideChromeHeader ? null : (
          <header className='flex h-12 shrink-0 items-center px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-10'>
            <SidebarTrigger className='-ml-1' />
          </header>
        )}
        <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 pt-0'>
          <Outlet />
        </div>
      </SidebarInset>
      {showRestaurantChat ? <RestaurantOrderChat /> : null}
    </SidebarProvider>
  );
}
