'use client';

// copied from fuma's approach for custom popup
// https://github.com/fuma-nama/fumadocs/blob/dev/packages/twoslash/src/ui/popup.tsx
import { Popover } from '@base-ui/react/popover';
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useMemo,
} from 'react';

const PopupContext = createContext<{ delay: number } | undefined>(undefined);

function Popup({ delay = 300, children }: { delay?: number; children: ReactNode }) {
  return (
    <Popover.Root>
      <PopupContext.Provider value={useMemo(() => ({ delay }), [delay])}>
        {children}
      </PopupContext.Provider>
    </Popover.Root>
  );
}

const PopupTrigger = ({
  children,
  href,
  target,
  rel,
  ...props
}: ComponentPropsWithoutRef<typeof Popover.Trigger> & {
  href?: string;
  target?: string;
  rel?: string;
}) => {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error('Missing Popup Context');

  const element = href ? (
    <a href={href} rel={rel} target={target}>
      <span className="twoslash-hover">{children}</span>
    </a>
  ) : (
    <span className="twoslash-hover">{children}</span>
  );

  return (
    <Popover.Trigger
      openOnHover
      delay={ctx.delay}
      closeDelay={ctx.delay}
      nativeButton={false}
      render={element}
      {...props}
    />
  );
};

const PopupContent = ({
  className,
  side = 'bottom',
  align = 'center',
  sideOffset = 4,
  ref,
  ...props
}: ComponentPropsWithoutRef<typeof Popover.Popup> &
  Pick<ComponentPropsWithoutRef<typeof Popover.Positioner>, 'side' | 'align' | 'sideOffset'> & {
    ref?: Ref<HTMLDivElement>;
  }) => {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error('Missing Popup Context');

  return (
    <Popover.Portal>
      <Popover.Positioner side={side} align={align} sideOffset={sideOffset}>
        <Popover.Popup
          ref={ref}
          className={['mint-twoslash-popover', className].filter(Boolean).join(' ')}
          initialFocus={false}
          finalFocus={false}
          {...props}
        />
      </Popover.Positioner>
    </Popover.Portal>
  );
};

export { Popup, PopupTrigger, PopupContent };
