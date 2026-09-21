import { useState } from 'react';

import { format } from 'date-fns';

import { ptBR } from 'date-fns/locale';

import { CalendarIcon } from 'lucide-react';



import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

import { Calendar } from '@/components/ui/calendar';

import {

  Popover,

  PopoverContent,

  PopoverTrigger,

} from '@/components/ui/popover';



export interface DatePickerProps {

  value?: Date;

  onChange: (date: Date | undefined) => void;

  placeholder?: string;

  id?: string;

  className?: string;

  disabled?: boolean;

}



export function DatePicker({

  value,

  onChange,

  placeholder = 'Selecione a data',

  id,

  className,

  disabled,

}: DatePickerProps) {

  const [open, setOpen] = useState(false);



  return (

    <Popover open={open} onOpenChange={setOpen}>

      <PopoverTrigger asChild>

        <Button

          type='button'

          id={id}

          variant='outline'

          size='sm'

          disabled={disabled}

          className={cn(

            'h-8 w-auto justify-start gap-2 px-3 text-left text-sm font-normal',

            !value && 'text-muted-foreground',

            className,

          )}

        >

          <CalendarIcon className='size-3.5 opacity-70' aria-hidden />

          {value

            ? format(value, 'dd/MM/yyyy', { locale: ptBR })

            : placeholder}

        </Button>

      </PopoverTrigger>

      <PopoverContent

        className='w-auto p-0'

        align='start'

        side='bottom'

        avoidCollisions

      >

        <Calendar

          mode='single'

          selected={value}

          onSelect={(date) => {

            onChange(date);

            setOpen(false);

          }}

          locale={ptBR}

          defaultMonth={value}

        />

      </PopoverContent>

    </Popover>

  );

}

