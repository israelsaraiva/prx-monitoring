'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme='system'
      className='toaster group'
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success: '!bg-green-50 dark:!bg-green-950/20 !text-green-800 dark:!text-green-200 !border-green-200 dark:!border-green-800',
          error: '!bg-red-50 dark:!bg-red-950/20 !text-red-800 dark:!text-red-200 !border-red-200 dark:!border-red-800',
          info: '!bg-blue-50 dark:!bg-blue-950/20 !text-blue-800 dark:!text-blue-200 !border-blue-200 dark:!border-blue-800',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
