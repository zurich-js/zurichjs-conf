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
  badge?: string;
  footer?: string;
  placeholder?: boolean;
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

type SpeakerCardStaticProps = SharedSpeakerCardProps & {
  to?: never;
  onClick?: never;
};

export type PublicSpeakerCardProps = SpeakerCardLinkProps | SpeakerCardButtonProps | SpeakerCardStaticProps;

function SpeakerCardInner({
  variant,
  header,
  avatar,
  name,
  title,
  badge,
  footer,
  placeholder = false,
}: SharedSpeakerCardProps) {
  const isCompact = variant === 'compact';
  const isDefault = variant === 'default';
  const isFull = variant === 'full';

  if (placeholder) {
    return (
      <div className="relative flex h-full min-h-48 items-center justify-center overflow-hidden rounded-2xl bg-brand-gray-lightest px-4 py-8">
        <p className="text-sm font-bold text-brand-gray-medium">To be announced</p>
      </div>
    );
  }

  return (
          <div className="relative bg-brand-white flex h-full flex-col rounded-2xl overflow-hidden transition-all duration-300
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
                    <div className="flex h-full w-full items-center justify-center bg-brand-white text-xl font-bold text-brand-gray-light">
                      <Image src="/icons/avatar-placeholder.svg" alt="Avatar placeholder" width={48} height={48} />
                    </div>
                  )}
                  </div>
              </div>

              <div
                  className={cn(
                      'relative transition-all duration-300 ease-out',
                      isFull ? 'flex justify-center p-2.5 text-center' : 'flex-1 p-2.5 text-center',
                  )}
              >
                  <div className={cn(isFull && 'flex max-w-full flex-col items-center justify-center')}>
                    <h2
                        className="line-clamp-2 font-bold text-md"
                    >
                        {name}
                    </h2>
                    {badge ? (
                      <span className="mt-2 inline-flex rounded-full bg-brand-yellow-main px-2.5 py-1 text-xs font-bold text-brand-black">
                        {badge}
                      </span>
                    ) : null}
                    {title ? (
                        <p className={cn(isCompact ? 'line-clamp-2' : 'line-clamp-3')}>
                            {title}
                        </p>
                    ) : null}
                  </div>

                  {isDefault && footer ? (
                    <div className="absolute inset-0 flex translate-x-full items-center bg-white p-2.5 pl-4 transition-transform duration-300 ease-out group-hover:translate-x-0 group-focus-within:translate-x-0">
                      <div className="flex w-full items-center justify-between gap-2.5">
                        <p className="font-bold">
                          {footer}
                        </p>
                        {(footer !== 'To be announced') ? (
                          <ChevronRight className="mb-1 size-4 shrink-0 text-black" aria-hidden="true" />
                        ) : null}
                      </div>
                    </div>
                  ) : null}
              </div>

        {isFull && !!footer ? (
          <div className="mt-auto flex p-2.5 pl-4">
                <div className="flex w-full items-center justify-between gap-2.5">
                  <p className="font-bold">
                    {footer}
                  </p>
                  {(footer !== 'To be announced') ? (
                    <ChevronRight className="mb-1 size-4 shrink-0 text-black" aria-hidden="true" />
                  ) : null}
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

  if (typeof props.onClick === 'function') {
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

  return (
    <div className={cn('group @container block w-full rounded-2xl', className)}>
      <SpeakerCardInner {...rest} />
    </div>
  );
}
