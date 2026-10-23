import * as React from 'react';
import { NavMain } from '@/components/nav-main';
import { MarmitaSoupIcon } from '@/components/marmita-soup-icon';
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
import { getInitials } from '@/utils/get-initials';
import { resolveAvatarUrl } from '@/utils/avatar-url';

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

  const initials = user?.name ? getInitials(user.name, 'ME') : 'ME';

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <SidebarAppBrand
          name='Marmita'
          subtitle={user?.role ? formattedRoles[user.role] : 'App'}
          logo={<MarmitaSoupIcon size={16} />}
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
            avatar: resolveAvatarUrl(user?.avatarUrl) ?? '',
            initials,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
