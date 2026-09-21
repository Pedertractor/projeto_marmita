import * as React from 'react';
import { NavMain } from '@/components/nav-main';
import { MesaSoupIcon } from '@/components/mesa-soup-icon';
import { NavUser } from '@/components/nav-user';
import { SidebarAppBrand } from '@/components/team-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/useAuth';
import { getSidebarNavItemsForRole } from '@/config/roleAccess';
import { formattedRoles } from '@/utils/roles';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();

  const navItems = user
    ? getSidebarNavItemsForRole(user.role).map((item) => ({
        title: item.label,
        url: item.path,
        icon: item.icon,
        items: item.children?.map((child) => ({
          title: child.label,
          url: child.path,
          icon: child.icon,
        })),
      }))
    : [];

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ME';

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <SidebarAppBrand
          name='Mesa'
          subtitle={user?.role ? formattedRoles[user.role] : 'App'}
          logo={<MesaSoupIcon size={16} />}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user?.name ?? 'Usuário',
            email: user?.email ?? '',
            avatar: '',
            initials,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
