import {

  SidebarMenu,

  SidebarMenuButton,

  SidebarMenuItem,

} from '@/components/ui/sidebar';



type SidebarAppBrandProps = {

  name: string;

  subtitle: string;

  logo: React.ReactNode;

};



/** Cabeçalho estático da sidebar (sem seletor de app). */

export function SidebarAppBrand({ name, subtitle, logo }: SidebarAppBrandProps) {

  return (

    <SidebarMenu>

      <SidebarMenuItem>

        <SidebarMenuButton

          size='lg'

          className='pointer-events-none cursor-default hover:bg-transparent active:bg-transparent'

        >

          <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>

            {logo}

          </div>

          <div className='sidebar-brand-text grid flex-1 text-left text-sm leading-tight'>

            <span className='truncate font-medium'>{name}</span>

            <span className='truncate text-xs text-sidebar-foreground/70'>{subtitle}</span>

          </div>

        </SidebarMenuButton>

      </SidebarMenuItem>

    </SidebarMenu>

  );

}


