/**
 * Student Verification Hook
 * Manages the state and logic for student/unemployed verification modal
 */

import { useState, useCallback } from 'react';

export interface UseStudentVerificationReturn {
  /**
   * Whether the verification modal is open
   */
  isModalOpen: boolean;
  /**
   * Open the verification modal with a specific price ID
   */
  openModal: (priceId: string) => void;
  /**
   * Close the verification modal
   */
  closeModal: () => void;
  /**
   * Handle successful verification submission
   */
  handleVerificationSubmit: (email: string, verificationId: string) => void;
  /**
   * Current price ID for verification
   */
  currentPriceId: string | null;
  /**
   * Whether the success dialog is open
   */
  isSuccessDialogOpen: boolean;
  /**
   * Close the success dialog
   */
  closeSuccessDialog: () => void;
  /**
   * Email address from successful verification
   */
  verifiedEmail: string | null;
  /**
   * Verification ID from successful verification
   */
  verificationId: string | null;
}

/**
 * Hook to manage student/unemployed verification modal state
 */
export const useStudentVerification = (): UseStudentVerificationReturn => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPriceId, setCurrentPriceId] = useState<string | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);

  const openModal = useCallback((priceId: string) => {
    setCurrentPriceId(priceId);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    // Don't clear priceId immediately to avoid flash during close animation
    setTimeout(() => setCurrentPriceId(null), 300);
  }, []);

  const closeSuccessDialog = useCallback(() => {
    setIsSuccessDialogOpen(false);
    // Clear verification data after close animation
    setTimeout(() => {
      setVerifiedEmail(null);
      setVerificationId(null);
    }, 300);
  }, []);

  const handleVerificationSubmit = useCallback(
    (email: string, verificationId: string) => {
      // Close the verification modal
      setIsModalOpen(false);
      
      // Store verification data and open success dialog
      setVerifiedEmail(email);
      setVerificationId(verificationId);
      
      // Delay opening success dialog slightly for smoother transition
      setTimeout(() => {
        setIsSuccessDialogOpen(true);
      }, 300);

      // Clear the price ID
      setTimeout(() => setCurrentPriceId(null), 300);
    },
    []
  );

  return {
    isModalOpen,
    openModal,
    closeModal,
    handleVerificationSubmit,
    currentPriceId,
    isSuccessDialogOpen,
    closeSuccessDialog,
    verifiedEmail,
    verificationId,
  };
};

