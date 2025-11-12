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
  const [isVerified, setIsVerified] = useState(true); // TEMPORARILY SET TO TRUE FOR TESTING

  useEffect(() => {
    const checkVerification = async () => {
      if (role !== 'client') {
        setIsChecking(false);
        return;
      }

      // TEMPORARILY DISABLED: NIN verification requirement
      // This allows clients to test booking features without verification
      // To re-enable: uncomment the code below and set isVerified default to false
      
      /*
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
      */
      
      setIsChecking(false);
    };

    checkVerification();
  }, [role, navigate]);

  return { isChecking, isVerified };
}
