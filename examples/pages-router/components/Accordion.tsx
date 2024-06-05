import { IconType } from '@mintlify/models';
import slugify from '@sindresorhus/slugify';
import { isEqual } from 'lodash';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { useAnalyticsContext } from '@/hooks/useAnalyticsContext';
import { ComponentIcon } from '@/ui/Icon';
import { cn } from '@/utils/cn';
import { copyToClipboard } from '@/utils/copyToClipboard';

import AccordionCover from './AccordionCover';
import getAccordionStyleFromVariant from './getAccordionStyleFromType';

export function Accordion({
  title,
  description,
  defaultOpen = false,
  icon,
  iconType,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen: boolean;
  icon?: ReactNode | string;
  iconType?: IconType;
  children: ReactNode;
}) {
  const trackOpen = useAnalyticsContext('accordion_open');
  const trackClose = useAnalyticsContext('accordion_close');

  const onChange = (open: boolean) => {
    if (open) {
      trackOpen({ title }).catch(console.error);
    } else {
      trackClose({ title }).catch(console.error);
    }
  };

  const Icon =
    typeof icon === 'string' ? (
      <ComponentIcon icon={icon} iconType={iconType} className="w-4 h-4" />
    ) : (
      icon
    );
  return (
    <GenericAccordion
      title={title}
      description={description}
      defaultOpen={defaultOpen}
      onChange={onChange}
      icon={Icon}
    >
      {children}
    </GenericAccordion>
  );
}

const AccordionContext = createContext({ parentIds: [] as string[] });

function getInitialOpenState(
  hashes: string[] | undefined,
  id: string,
  parentIds: string[],
  defaultOpen: boolean
) {
  if (!hashes || hashes.length === 0 || defaultOpen) return defaultOpen;
  if (isEqual(parentIds, hashes.slice(0, hashes.indexOf(id)))) {
    return hashes.indexOf(id) === parentIds.length;
  }
  return false;
}

function GenericAccordion({
  title,
  description,
  defaultOpen = false,
  icon,
  onChange,
  variant = 'rounded',
  children,
}: {
  /** The main text of the Accordion shown in bold */
  title: string | ReactNode;

  /** Text under the title */
  description?: string;

  /** Whether the Accordion is open initially */
  defaultOpen?: boolean;

  /** Icon to display to the left */
  icon?: ReactNode;

  /** Callback when the Accordion is clicked with the new open state */
  onChange?: (open: boolean) => void;

  /** The Accordion UI style */
  variant?: 'rounded' | 'minimalist';

  /** The Accordion contents */
  children: ReactNode;
}) {
  const connectingCharacter = ':';
  const id =
    typeof title === 'string'
      ? slugify(title.replace(connectingCharacter, '-'), { decamelize: false })
      : undefined;

  const hashes =
    typeof window !== 'undefined'
      ? window.location.hash.substring(1).split(connectingCharacter)
      : undefined;

  const context = useContext(AccordionContext);

  const [open, setOpen] = useState<boolean>(() =>
    id ? getInitialOpenState(hashes, id, context.parentIds, defaultOpen) : false
  );

  // scroll to this accordion if it's the exact accordion being linked to
  useEffect(() => {
    if (id && open && hashes && hashes[hashes.length - 1] === id) {
      if (isEqual(context.parentIds, hashes.slice(0, hashes.indexOf(id)))) {
        const element = document.getElementById(id);
        if (element) {
          history.scrollRestoration = 'manual';
          element.scrollIntoView();
        }
      }
    }
    // diabling because scrolling should only happen once, on initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateAndCopyUrl(ids: string[], connectingCharacter: string) {
    const idsString = ids.join(connectingCharacter);
    void copyToClipboard(`https://${window.location.host}${window.location.pathname}#${idsString}`);
    window.history.pushState(null, '', `#${idsString}`);
  }

  const onClickOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && id) {
      updateAndCopyUrl([...context.parentIds, id], connectingCharacter);
    } else {
      if (context.parentIds.length > 0) {
        updateAndCopyUrl(context.parentIds, connectingCharacter);
      } else {
        window.history.pushState(null, '', ' ');
      }
    }
    if (onChange) {
      onChange(isOpen);
    }
  };

  const { parentClass, coverClass, contentClass } = getAccordionStyleFromVariant(variant);

  return (
    <AccordionContext.Provider
      value={{
        ...context,
        parentIds: [...context.parentIds, ...(id != undefined ? [id] : [])],
      }}
    >
      <div
        key={typeof title === 'string' ? title : 'accordion'}
        role="listitem"
        className={parentClass}
      >
        <AccordionCover
          id={id}
          title={title}
          description={description}
          open={open}
          setOpen={onClickOpen}
          icon={icon}
          coverClass={coverClass}
        />
        <div className={cn(contentClass, !open && 'hidden')}>{children}</div>
      </div>
    </AccordionContext.Provider>
  );
}
