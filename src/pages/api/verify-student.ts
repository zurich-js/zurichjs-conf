/**
 * Student/Unemployed Verification API Endpoint
 * Handles verification requests for discounted tickets
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { sendVerificationRequestEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

const log = logger.scope('Student Verification API');

/**
 * Verification request body
 */
interface VerificationRequest {
  name: string;
  email: string;
  verificationType: 'student' | 'unemployed';
  studentId?: string;
  university?: string;
  linkedInUrl?: string;
  ravRegistrationDate?: string;
  additionalInfo?: string;
  priceId: string;
}

/**
 * API response
 */
interface VerificationResponse {
  success: boolean;
  verificationId: string;
  message: string;
  error?: string;
}

/**
 * Generate a verification ID
 */
const generateVerificationId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `VER-${timestamp}-${randomStr}`.toUpperCase();
};

/**
 * Validate verification request
 */
const validateRequest = (body: VerificationRequest): string | null => {
  if (!body.name?.trim()) {
    return 'Name is required';
  }

  if (!body.email?.trim()) {
    return 'Email is required';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return 'Invalid email address';
  }

  if (!body.verificationType || !['student', 'unemployed'].includes(body.verificationType)) {
    return 'Invalid verification type';
  }

  if (body.verificationType === 'student') {
    if (!body.university?.trim()) {
      return 'University name is required';
    }
  }

  if (body.verificationType === 'unemployed') {
    if (!body.linkedInUrl?.trim()) {
      return 'LinkedIn profile URL is required';
    }
    if (!/^https?:\/\/(www\.)?linkedin\.com\/.+/.test(body.linkedInUrl)) {
      return 'Invalid LinkedIn profile URL';
    }
    // RAV registration date is optional (only for Switzerland)
  }

  if (!body.priceId?.trim()) {
    return 'Price ID is required';
  }

  return null;
};

/**
 * Store verification request (in production, this would save to a database)
 * For now, we'll just log it and send emails
 */
const storeVerificationRequest = async (
  verificationId: string,
  data: VerificationRequest
): Promise<void> => {
  // In production, you would:
  // 1. Save to database with status 'pending'
  // 2. Set up a review system for admins
  // 3. Track verification expiry dates

  log.info('Verification Request received', {
    verificationId,
    ...data,
    timestamp: new Date().toISOString(),
  });

  // TODO: Save to database
  // await db.verificationRequests.create({
  //   id: verificationId,
  //   name: data.name,
  //   email: data.email,
  //   verificationType: data.verificationType,
  //   studentId: data.studentId,
  //   university: data.university,
  //   linkedInUrl: data.linkedInUrl,
  //   additionalInfo: data.additionalInfo,
  //   priceId: data.priceId,
  //   status: 'pending',
  //   createdAt: new Date(),
  // });
};

/**
 * Send notification emails
 */
const sendNotifications = async (
  verificationId: string,
  data: VerificationRequest
): Promise<void> => {
  // Send confirmation email to user and detailed admin notification
  try {
    await sendVerificationRequestEmail({
      to: data.email,
      name: data.name,
      verificationId,
      verificationType: data.verificationType,
      // Student-specific fields
      university: data.university,
      studentId: data.studentId,
      // Unemployed-specific fields
      linkedInUrl: data.linkedInUrl,
      ravRegistrationDate: data.ravRegistrationDate,
      // Common optional field
      additionalInfo: data.additionalInfo,
    });
    log.info('Verification emails sent (user confirmation + admin notification)', { email: data.email });
  } catch (error) {
    log.error('Failed to send verification emails', error);
    // Don't fail the request if email fails
  }
};

/**
 * API Handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerificationResponse>
): Promise<void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      verificationId: '',
      message: 'Method not allowed',
      error: 'Only POST requests are allowed',
    });
    return;
  }

  try {
    const body = req.body as VerificationRequest;

    // Validate request
    const validationError = validateRequest(body);
    if (validationError) {
      res.status(400).json({
        success: false,
        verificationId: '',
        message: 'Validation failed',
        error: validationError,
      });
      return;
    }

    // Generate verification ID
    const verificationId = generateVerificationId();

    // Store the verification request
    await storeVerificationRequest(verificationId, body);

    // Send notification emails
    await sendNotifications(verificationId, body);

    // Return success response
    res.status(200).json({
      success: true,
      verificationId,
      message: 'Verification request submitted successfully. You will receive an email within 24 hours.',
    });
  } catch (error) {
    log.error('Error processing verification request', error);

    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    
    res.status(500).json({
      success: false,
      verificationId: '',
      message: 'Failed to process verification request',
      error: errorMessage,
    });
  }
}

