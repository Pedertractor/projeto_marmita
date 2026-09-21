import { useRef, type ReactNode } from 'react';
import { ChevronRightIcon } from 'lucide-animated';
import { Link, useLocation } from 'react-router-dom';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import type { AnimatedIconHandle, SidebarIcon } from '@/config/sidebar';
import {
  pathMatchesNavExact,
  pathMatchesNavSegment,
} from '@/config/roleAccess';

const SIDEBAR_ICON_SIZE = 16;

function NavItemTitle({
  title,
  iconOnly,
}: {
  title: string;
  iconOnly: boolean;
}) {
  if (iconOnly) return null;
  return <span className='sidebar-nav-label'>{title}</span>;
}

function IconHoverTarget({
  icon: Icon,
  children,
}: {
  icon: SidebarIcon;
  children: (props: {
    icon: ReactNode;
    hoverProps: {
      onMouseEnter: () => void;
      onMouseLeave: () => void;
    };
  }) => ReactNode;
}) {
  const ref = useRef<AnimatedIconHandle>(null);

  return (
    <>
      {children({
        icon: (
          <Icon ref={ref} size={SIDEBAR_ICON_SIZE} className='shrink-0' />
        ),
        hoverProps: {
          onMouseEnter: () => ref.current?.startAnimation(),
          onMouseLeave: () => ref.current?.stopAnimation(),
        },
      })}
    </>
  );
}

export type NavMainItem = {
  title: string;
  url: string;
  icon?: SidebarIcon;
  items?: {
    title: string;
    url: string;
    icon?: SidebarIcon;
  }[];
};

export function NavMain({ items }: { items: NavMainItem[] }) {
  const { pathname } = useLocation();
  const { state, isMobile, closeSidebar } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;

  const closeOnNavigate = () => {
    closeSidebar();
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navegação</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasChildren = Boolean(item.items?.length);
          const parentActive = pathMatchesNavSegment(pathname, item.url);

          if (!hasChildren) {
            if (!item.icon) {
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={parentActive}
                  >
                    <Link to={item.url} onClick={closeOnNavigate}>
                      <NavItemTitle title={item.title} iconOnly={collapsed} />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }

            return (
              <SidebarMenuItem key={item.title}>
                <IconHoverTarget icon={item.icon}>
                  {({ icon, hoverProps }) => (
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={parentActive}
                    >
                      <Link to={item.url} onClick={closeOnNavigate} {...hoverProps}>
                        {icon}
                        <NavItemTitle title={item.title} iconOnly={collapsed} />
                      </Link>
                    </SidebarMenuButton>
                  )}
                </IconHoverTarget>
              </SidebarMenuItem>
            );
          }

          if (collapsed) {
            return (
              <SidebarMenuItem key={item.title}>
                <DropdownMenu>
                  {item.icon ? (
                    <IconHoverTarget icon={item.icon}>
                      {({ icon, hoverProps }) => (
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            isActive={parentActive}
                            {...hoverProps}
                          >
                            {icon}
                          </SidebarMenuButton>
                        </DropdownMenuTrigger>
                      )}
                    </IconHoverTarget>
                  ) : (
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={parentActive}
                      >
                        <NavItemTitle title={item.title} iconOnly={collapsed} />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                  )}
                  <DropdownMenuContent
                    className='w-52'
                    side='right'
                    align='start'
                    sideOffset={4}
                  >
                    <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                    {item.items!.map((sub) =>
                      sub.icon ? (
                        <IconHoverTarget key={sub.url} icon={sub.icon}>
                          {({ icon, hoverProps }) => (
                            <DropdownMenuItem asChild>
                              <Link
                                to={sub.url}
                                onClick={closeOnNavigate}
                                {...hoverProps}
                              >
                                {icon}
                                <span>{sub.title}</span>
                              </Link>
                            </DropdownMenuItem>
                          )}
                        </IconHoverTarget>
                      ) : (
                        <DropdownMenuItem key={sub.url} asChild>
                          <Link to={sub.url} onClick={closeOnNavigate}>
                            <span>{sub.title}</span>
                          </Link>
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={parentActive}
              className='group/collapsible'
            >
              <SidebarMenuItem>
                {item.icon ? (
                  <IconHoverTarget icon={item.icon}>
                    {({ icon, hoverProps }) => (
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={parentActive}
                          {...hoverProps}
                        >
                          {icon}
                          <NavItemTitle title={item.title} iconOnly={collapsed} />
                          <ChevronRightIcon
                            size={SIDEBAR_ICON_SIZE}
                            className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90'
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    )}
                  </IconHoverTarget>
                ) : (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={parentActive}
                    >
                      <NavItemTitle title={item.title} iconOnly={collapsed} />
                      <ChevronRightIcon
                        size={SIDEBAR_ICON_SIZE}
                        className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90'
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items!.map((sub) => (
                      <SidebarMenuSubItem key={sub.url}>
                        {sub.icon ? (
                          <IconHoverTarget icon={sub.icon}>
                            {({ icon, hoverProps }) => (
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathMatchesNavExact(
                                  pathname,
                                  sub.url,
                                )}
                              >
                                <Link
                                  to={sub.url}
                                  onClick={closeOnNavigate}
                                  {...hoverProps}
                                >
                                  {icon}
                                  <span>{sub.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            )}
                          </IconHoverTarget>
                        ) : (
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathMatchesNavExact(pathname, sub.url)}
                          >
                            <Link to={sub.url} onClick={closeOnNavigate}>
                              <span>{sub.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        )}
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
