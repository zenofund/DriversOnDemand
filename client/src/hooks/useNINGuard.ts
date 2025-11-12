import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuthStore } from '@/store/authStore';

interface VerificationStatus {
  verified: boolean;
  state: string;
  attemptsRemaining: number;
}

export function useNINGuard() {
  const [, navigate] = useLocation();
  const { role } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const checkVerification = async () => {
      if (role !== 'client') {
        setIsChecking(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsChecking(false);
          return;
        }

        const response = await fetch('/api/clients/verification-status', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const status: VerificationStatus = await response.json();
          setIsVerified(status.verified);

          if (!status.verified && !window.location.pathname.includes('/verify-nin')) {
            navigate('/client/verify-nin');
          }
        }
      } catch (error) {
        console.error('Error checking NIN verification:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkVerification();
  }, [role, navigate]);

  return { isChecking, isVerified };
}
