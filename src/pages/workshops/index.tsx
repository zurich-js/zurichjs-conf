/**
 * Workshops Catalog Page
 * Browse all available workshops
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import type { Workshop } from '@/lib/types/database';
import { Layout } from '@/components/Layout';
import { Heading, Button } from '@/components/atoms';

export default function WorkshopsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);

  useEffect(() => {
    loadWorkshops();
  }, []);

  const loadWorkshops = async () => {
    try {
      const { data } = await supabase
        .from('workshops')
        .select('*')
        .eq('status', 'published')
        .order('date', { ascending: true });

      setWorkshops((data || []) as Workshop[]);
    } catch (error) {
      console.error('Error loading workshops:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Heading level="h1">Conference Workshops</Heading>
            <p className="mt-4 text-lg text-gray-600">
              Hands-on workshops to deepen your JavaScript knowledge
            </p>
          </div>

          {/* Workshops Grid */}
          {workshops.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <p className="text-gray-500">No workshops available at the moment</p>
              <p className="text-sm text-gray-400 mt-2">Check back soon for updates!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workshops.map((workshop) => {
                const spotsLeft = workshop.capacity - workshop.enrolled_count;
                const isFull = spotsLeft <= 0;

                return (
                  <div key={workshop.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="p-6">
                      {/* Workshop Status Badge */}
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          Workshop
                        </span>
                        {isFull ? (
                          <span className="text-xs font-medium px-2 py-1 bg-red-100 text-red-800 rounded">
                            Sold Out
                          </span>
                        ) : spotsLeft <= 5 ? (
                          <span className="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                            {spotsLeft} spots left
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-800 rounded">
                            Available
                          </span>
                        )}
                      </div>

                      {/* Workshop Title */}
                      <h3 className="text-lg font-semibold mb-2">
                        {workshop.title}
                      </h3>

                      {/* Workshop Description */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {workshop.description}
                      </p>

                      {/* Workshop Meta */}
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          📅 {new Date(workshop.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="flex items-center">
                          🕐 {workshop.start_time} - {workshop.end_time}
                        </div>
                        <div className="flex items-center">
                          👥 {workshop.enrolled_count} / {workshop.capacity} enrolled
                        </div>
                      </div>

                      {/* Price & CTA */}
                      <div className="pt-4 border-t flex justify-between items-center">
                        <div className="text-lg font-bold">
                          {(workshop.price / 100).toFixed(2)} {workshop.currency}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => router.push(`/workshops/${workshop.id}`)}
                          disabled={isFull}
                        >
                          {isFull ? 'Sold Out' : 'View Details'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
