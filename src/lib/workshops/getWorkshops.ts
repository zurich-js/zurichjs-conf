/**
 * Get Workshops
 * Fetch workshops with various filters
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type { WorkshopDetail, PublicWorkshop, WorkshopInstructor } from '@/lib/types/workshop';

export interface GetWorkshopsResult {
  success: boolean;
  workshops?: WorkshopDetail[];
  error?: string;
}

/**
 * Transform a raw workshop row into a PublicWorkshop with computed fields
 */
export function toPublicWorkshop(w: WorkshopDetail): PublicWorkshop {
  const seatsRemaining = Math.max(0, w.capacity - w.enrolled_count);
  const instructor: WorkshopInstructor | null = w.instructor_id
    ? {
        id: w.instructor_id,
        name: w.instructor_name || 'TBA',
        avatar_url: w.instructor_avatar_url,
        bio: w.instructor_bio,
        company: w.instructor_company,
        job_title: w.instructor_job_title,
        linkedin_url: w.instructor_linkedin_url,
        github_url: w.instructor_github_url,
        twitter_handle: w.instructor_twitter_handle,
      }
    : null;

  return {
    id: w.id,
    slug: w.slug,
    title: w.title,
    short_abstract: w.short_abstract,
    long_abstract: w.long_abstract,
    featured: w.featured,
    date: w.date,
    time_slot: w.time_slot,
    start_time: w.start_time,
    end_time: w.end_time,
    duration_minutes: w.duration_minutes,
    level: w.level,
    topic_tags: w.topic_tags,
    outcomes: w.outcomes,
    prerequisites: w.prerequisites,
    agenda: w.agenda,
    capacity: w.capacity,
    seats_remaining: seatsRemaining,
    is_sold_out: seatsRemaining <= 0,
    price: w.price,
    currency: w.currency,
    location: w.location,
    room: w.room,
    instructor,
  };
}

/**
 * Get all published workshops as public view
 */
export async function getPublishedWorkshops(): Promise<{
  success: boolean;
  workshops?: PublicWorkshop[];
  error?: string;
}> {
  const supabase = createServiceRoleClient();

  try {
    const { data: workshops, error } = await supabase
      .from('workshops')
      .select('*')
      .eq('status', 'published')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching published workshops:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      workshops: ((workshops || []) as unknown as WorkshopDetail[]).map(toPublicWorkshop),
    };
  } catch (error) {
    console.error('Error in getPublishedWorkshops:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a single workshop by ID
 */
export async function getWorkshopById(workshopId: string): Promise<{
  success: boolean;
  workshop?: WorkshopDetail;
  error?: string;
}> {
  const supabase = createServiceRoleClient();

  try {
    const { data: workshop, error } = await supabase
      .from('workshops')
      .select('*')
      .eq('id', workshopId)
      .single();

    if (error) {
      console.error('Error fetching workshop:', error);
      return { success: false, error: error.message };
    }

    if (!workshop) {
      return { success: false, error: 'Workshop not found' };
    }

    return { success: true, workshop: workshop as unknown as WorkshopDetail };
  } catch (error) {
    console.error('Error in getWorkshopById:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a single workshop by slug (public)
 */
export async function getWorkshopBySlug(slug: string): Promise<{
  success: boolean;
  workshop?: PublicWorkshop;
  error?: string;
}> {
  const supabase = createServiceRoleClient();

  try {
    const { data: workshop, error } = await supabase
      .from('workshops')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error) {
      console.error('Error fetching workshop by slug:', error);
      return { success: false, error: error.message };
    }

    if (!workshop) {
      return { success: false, error: 'Workshop not found' };
    }

    return {
      success: true,
      workshop: toPublicWorkshop(workshop as unknown as WorkshopDetail),
    };
  } catch (error) {
    console.error('Error in getWorkshopBySlug:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all workshops (admin only)
 */
export async function getAllWorkshops(): Promise<GetWorkshopsResult> {
  const supabase = createServiceRoleClient();

  try {
    const { data: workshops, error } = await supabase
      .from('workshops')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching all workshops:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      workshops: (workshops || []) as unknown as WorkshopDetail[],
    };
  } catch (error) {
    console.error('Error in getAllWorkshops:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
