import type {

  ComponentPropsWithoutRef,

  ForwardRefExoticComponent,

  HTMLAttributes,

  RefAttributes,

} from 'react';

import {

  BookOpen,

  Building2,

  ChefHat,

  CircleDollarSign,

  ClipboardList,

  ScrollText,

  Sparkles,

  UserPlus,

  Users,

} from 'lucide-react';

import { HomeIcon } from 'lucide-animated';

import { ROUTES } from '@/routes/constants';

import { lucideSidebarIcon } from '@/config/sidebar-static-icon';



export type AnimatedIconHandle = {

  startAnimation: () => void;

  stopAnimation: () => void;

};



export type SidebarIcon = ForwardRefExoticComponent<

  {

    size?: number;

    className?: string;

    animateOnHover?: boolean;

  } & HTMLAttributes<HTMLDivElement> &

    RefAttributes<AnimatedIconHandle>

>;



export type SidebarIconProps = ComponentPropsWithoutRef<SidebarIcon>;



export interface SidebarNavChild {

  path: string;

  label: string;

  icon?: SidebarIcon;

}



export interface SidebarNavItem {

  path: string;

  label: string;

  icon: SidebarIcon;

  children?: SidebarNavChild[];

}



export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [

  { path: ROUTES.REQUESTER_HOME, label: 'Início', icon: HomeIcon },

  { path: ROUTES.REQUESTER_ORDERS, label: 'Pedidos', icon: lucideSidebarIcon(ClipboardList) },

  { path: ROUTES.DASHBOARD_RH, label: 'Home', icon: HomeIcon },

  {

    path: ROUTES.DASHBOARD_RESTAURANT,

    label: 'Operação',

    icon: lucideSidebarIcon(ChefHat),

  },

  { path: ROUTES.ORDERS, label: 'Pedidos', icon: lucideSidebarIcon(ClipboardList) },

  {
    path: ROUTES.SPECIAL_ORDER_NEW,
    label: 'Solicitação especial',
    icon: lucideSidebarIcon(Sparkles),
  },

  { path: ROUTES.MENUS, label: 'Cardápios', icon: lucideSidebarIcon(BookOpen) },

  {

    path: ROUTES.COMPANIES,

    label: 'Empresas',

    icon: lucideSidebarIcon(Building2),

  },

  {

    path: ROUTES.MEAL_PRICES,

    label: 'Preços',

    icon: lucideSidebarIcon(CircleDollarSign),

  },

  {

    path: ROUTES.REGISTRATIONS,

    label: 'Solicitações',

    icon: lucideSidebarIcon(UserPlus),

  },

  { path: ROUTES.USUARIOS, label: 'Usuários', icon: lucideSidebarIcon(Users) },

  {

    path: ROUTES.AUDIT,

    label: 'Auditoria',

    icon: lucideSidebarIcon(ScrollText),

  },

];


