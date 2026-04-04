import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type SharedSpeakerCardProps = {
  variant: 'compact' | 'default' | 'full';
  header?: string;
  avatar: string;
  name: string;
  title?: string;
  footer?: string;
  className?: string;
};

type SpeakerCardLinkProps = SharedSpeakerCardProps & {
  to: string;
  onClick?: never;
};

type SpeakerCardButtonProps = SharedSpeakerCardProps & {
  onClick: () => void;
  to?: never;
};

export type PublicSpeakerCardProps = SpeakerCardLinkProps | SpeakerCardButtonProps;

function SpeakerCardInner({
  variant,
  header,
  avatar,
  name,
  title,
  footer,
}: SharedSpeakerCardProps) {
  const isCompact = variant === 'compact';
  const isDefault = variant === 'default';
  const isFull = variant === 'full';
  const hasFooter = !isCompact && !!footer;
  const showHeader = !isCompact && !!header;

  return (
      <div className="group p-2.5">
          <div className="bg-white relative rounded-2xl overflow-hidden shadow-lg">
              {showHeader ? (
                  <div
                      className={cn(
                          "relative w-full h-auto overflow-hidden border-b-2 border-brand-gray-lightest transition-all duration-300",
                          isFull ? 'aspect-[10/4]' : 'aspect-[10/3]'
                      )}
                  >
                      <Image
                          src={header}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 21rem, 22rem"
                      />
                  </div>
              ) : null}

              <div
                  className={cn(
                      'relative z-10 flex justify-center transition-all duration-300 ease-out',
                      isCompact ? 'p-2.5 pb-0' : '-mt-16'
                  )}
              >
              <div
                  className={cn(
                          'relative overflow-hidden rounded-full border-2 border-brand-gray-lightest transition-all duration-300',
                          isCompact ? 'size-24' : 'size-32'
                  )}
              >
                          <Image
                              src={avatar}
                              alt={`${name} avatar`}
                              fill
                              className="object-cover"
                              sizes={isCompact ? '(max-width: 640px) 6rem, 7rem' : '(max-width: 640px) 8rem, 10rem'}
                          />
                  </div>
              </div>

              <div
                  className={cn(
                      'transition-all duration-300 ease-out',
                      'p-2.5 text-center',
                  )}
              >
                  <h2
                      className="font-bold text-md"
                  >
                      {name}
                  </h2>
                  {title ? (
                      <p>
                          {title}
                      </p>
                  ) : null}
              </div>

        {!isCompact && hasFooter ? (
          <div
            className={cn(
              'transition-all duration-300 ease-out',
                isDefault ? 'absolute bottom-0 left-0 right-0' : 'relative',
            )}
          >

              <div className={cn(
                "p-2.5 pl-4 transition-transform duration-300 ease-out bg-white",
                isFull && 'translate-x-0',
                isDefault && 'translate-x-full group-hover:translate-x-0 group-focus-within:translate-x-0',
              )}>
                <div className="flex items-center justify-between gap-2.5">
                  <p className="font-bold">
                    {footer}
                  </p>
                  <ChevronRight className="mb-1 size-4 shrink-0 text-black" aria-hidden="true" />
                </div>
              </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SpeakerCard(props: PublicSpeakerCardProps) {
  const { className, ...rest } = props;

  if (typeof props.to === 'string') {
    return (
      <Link
        href={props.to}
        className={cn('block w-full max-w-[21rem] rounded-[2rem] focus-visible:outline-none sm:max-w-[22rem]', className)}
      >
        <SpeakerCardInner {...rest} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn('block w-full max-w-[21rem] rounded-[2rem] bg-transparent text-left focus-visible:outline-none sm:max-w-[22rem]', className)}
    >
      <SpeakerCardInner {...rest} />
    </button>
  );
}
