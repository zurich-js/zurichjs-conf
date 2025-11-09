/**
 * Workshop Detail Page
 * View workshop details and register
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Workshop } from '@/lib/types/database';
import { Layout } from '@/components/Layout';
import { Heading, Button } from '@/components/atoms';

export default function WorkshopDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  useEffect(() => {
    if (id) {
      loadWorkshop();
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadWorkshop = async () => {
    try {
      const { data } = await supabase
        .from('workshops')
        .select('*')
        .eq('id', id as string)
        .single();

      setWorkshop(data as Workshop | null);

      // Check if user already registered
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data) {
        const { data: registration } = await supabase
          .from('workshop_registrations')
          .select('id')
          .eq('user_id', user.id)
          .eq('workshop_id', data.id)
          .single();

        setAlreadyRegistered(!!registration);
      }
    } catch (error) {
      console.error('Error loading workshop:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  const handleRegister = () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/workshops/${id}`);
      return;
    }

    // TODO: Implement workshop registration checkout flow
    // This would create a Stripe checkout session similar to ticket purchase
    alert('Workshop registration checkout flow coming soon!');
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!workshop) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Heading level="h2">Workshop Not Found</Heading>
            <p className="mt-2 text-gray-600">The workshop you&apos;re looking for doesn&apos;t exist.</p>
            <Button onClick={() => router.push('/workshops')} className="mt-4">
              Back to Workshops
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const spotsLeft = workshop.capacity - workshop.enrolled_count;
  const isFull = spotsLeft <= 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <Link href="/workshops" className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-block">
            ← Back to workshops
          </Link>

          {/* Workshop Header */}
          <div className="bg-white shadow rounded-lg p-8 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <Heading level="h1">{workshop.title}</Heading>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                    Workshop
                  </span>
                  {isFull ? (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                      Sold Out
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                      {spotsLeft} spots left
                    </span>
                  )}
                  {alreadyRegistered && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                      ✓ You&apos;re registered
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {(workshop.price / 100).toFixed(2)} {workshop.currency}
                </div>
                <div className="text-sm text-gray-600 mt-1">per person</div>
              </div>
            </div>

            {/* Workshop Meta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6 border-y">
              <div>
                <div className="text-sm font-medium text-gray-500">Date</div>
                <div className="mt-1">
                  {new Date(workshop.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Time</div>
                <div className="mt-1">
                  {workshop.start_time} - {workshop.end_time}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Capacity</div>
                <div className="mt-1">
                  {workshop.enrolled_count} / {workshop.capacity} enrolled
                </div>
              </div>
            </div>

            {/* Workshop Description */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-3">About this Workshop</h2>
              <div className="prose prose-sm max-w-none text-gray-600">
                {workshop.description}
              </div>
            </div>
          </div>

          {/* Registration Section */}
          <div className="bg-white shadow rounded-lg p-8">
            <Heading level="h2" className="mb-4">
              Registration
            </Heading>

            {alreadyRegistered ? (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-green-800">
                  ✓ You&apos;re already registered for this workshop. Check your{' '}
                  <Link href="/account/workshops" className="underline font-medium">
                    account page
                  </Link>{' '}
                  for details.
                </p>
              </div>
            ) : isFull ? (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-red-800">
                  This workshop is currently sold out. Check back later or browse other workshops.
                </p>
                <Button onClick={() => router.push('/workshops')} variant="outline" className="mt-4">
                  Browse Other Workshops
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-6">
                  Register for this workshop and join other developers to learn together.
                  {!isAuthenticated && " You&apos;ll need to sign in or create an account first."}
                </p>

                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-600">Workshop Price</div>
                    <div className="text-2xl font-bold">
                      {(workshop.price / 100).toFixed(2)} {workshop.currency}
                    </div>
                  </div>
                  <Button onClick={handleRegister}>
                    {isAuthenticated ? 'Register Now' : 'Sign In to Register'}
                  </Button>
                </div>

                <p className="text-sm text-gray-500">
                  By registering, you agree to our terms and conditions. Refund policy applies.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
