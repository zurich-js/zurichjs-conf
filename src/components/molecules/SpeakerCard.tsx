import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type SharedSpeakerCardProps = {
  variant: 'compact' | 'default' | 'full';
  header?: string | null;
  avatar?: string | null;
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
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
          <div className="bg-white relative rounded-2xl overflow-hidden h-full transition-all duration-300
          shadow-md shadow-brand-black/10 group-hover:shadow-brand-black/20 focus-within:shadow-brand-black/20
          group-hover:shadow-lg group-focus-within:shadow-lg
          group-hover:-translate-y-0.5 group-focus-within:-translate-y-0.5
          ">
              {!isCompact ? (
                  <div className="relative w-full h-auto aspect-[5/2] overflow-hidden border-b-2 border-brand-gray-lightest transition-all duration-300">
                      {header ? (
                        <Image
                            src={header}
                            alt=""
                            fill
                            className="object-cover object-bottom"
                            sizes="(max-width: 640px) 21rem, 22rem"
                        />
                      ) : (
                        <div className="h-full w-full bg-brand-gray-lightest" aria-hidden="true" />
                      )}
                  </div>
              ) : null}

              <div
                  className={cn(
                      'relative z-10 flex justify-center transition-all duration-300 ease-out',
                      isCompact ? 'p-2.5 pb-0' : '-mt-16'
                  )}
              >
              <div
                  className="relative overflow-hidden rounded-full border-2 border-brand-gray-lightest transition-all duration-300 size-20 @6xs:size-24 @5xs:size-28 @4xs:size-32 @3xs:size-36 @2xs:size-40 @xs:size-48"
              >
                  {avatar ? (
                          <Image
                              src={avatar}
                              alt={`${name} avatar`}
                              fill
                              className="object-cover"
                              sizes={isCompact ? '(max-width: 640px) 6rem, 7rem' : '(max-width: 640px) 8rem, 10rem'}
                          />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-brand-gray-darkest text-xl font-bold text-brand-white">
                      {initials || '?'}
                    </div>
                  )}
                  </div>
              </div>

              <div
                  className={cn(
                      'transition-all duration-300 ease-out flex-1',
                      'p-2.5 text-center',
                  )}
              >
                  <h2
                      className="font-bold text-md"
                  >
                      {name}
                  </h2>
                  {title ? (
                      <p className={cn(!isCompact && 'line-clamp-2 min-h-[3rem]')}>
                          {title}
                      </p>
                  ) : null}
              </div>

        {!isCompact && !!footer ? (
          <div
            className={cn(
              'flex-1 transition-all duration-300 ease-out',
                isDefault ? 'absolute bottom-0 left-0 right-0' : 'relative',
            )}
          >

              <div className={cn(
                "transition-transform duration-300 ease-out bg-white",
                isFull && 'p-2.5 pl-4 translate-x-0',
                isDefault && 'p-2.5 pl-4 pt-0 translate-x-full group-hover:translate-x-0 group-focus-within:translate-x-0',
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
  );
}

export function SpeakerCard(props: PublicSpeakerCardProps) {
  const { className, ...rest } = props;

  if (typeof props.to === 'string') {
    return (
      <Link
        href={props.to}
        className={cn('group @container block w-full rounded-2xl focus-visible:outline-none', className)}
      >
        <SpeakerCardInner {...rest} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn('group @container block w-full rounded-2xl bg-transparent text-left focus-visible:outline-none', className)}
    >
      <SpeakerCardInner {...rest} />
    </button>
  );
}
