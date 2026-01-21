/**
 * Empty Cart State Component
 */

import Head from 'next/head';
import Link from 'next/link';
import { TicketXIcon } from 'lucide-react';
import { Button } from '@/components/atoms';
import { PageHeader } from '@/components/organisms';

export function EmptyCartState() {
  return (
    <>
      <Head>
        <title>No Tickets Selected | ZurichJS Conference 2026</title>
      </Head>

      <PageHeader />

      <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-full flex justify-center">
            <TicketXIcon size={48} className="stroke-brand-red" />
          </div>
          <h1 className="text-3xl font-bold text-brand-white mb-3">No Tickets Selected</h1>
          <p className="text-brand-gray-light mb-8">
            Choose your tickets to get started with your conference registration.
          </p>
          <Link href="/#tickets">
            <Button variant="primary" asChild>
              View Tickets
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
