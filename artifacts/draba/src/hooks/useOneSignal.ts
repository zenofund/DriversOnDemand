import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiRequest } from '@/lib/queryClient';

type OneSignalStatus = 'idle' | 'initializing' | 'ready' | 'error';
type NotificationPermission = 'default' | 'granted' | 'denied';

interface OneSignalState {
  status: OneSignalStatus;
  permission: NotificationPermission;
  playerId: string | null;
  error: string | null;
}

declare global {
  interface Window {
    OneSignalDeferred?: Promise<any>;
    OneSignal?: any;
  }
}

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export function useOneSignal() {
  const { user } = useAuthStore();
  const [state, setState] = useState<OneSignalState>({
    status: 'idle',
    permission: 'default',
    playerId: null,
    error: null,
  });
  const [retryCount, setRetryCount] = useState(0);

  // Register player ID with backend
  const registerPlayerId = useCallback(async (playerId: string) => {
    try {
      await apiRequest('POST', '/api/notifications/player-id', { player_id: playerId });
      console.log('OneSignal player ID registered:', playerId);
      return true;
    } catch (error: any) {
      // 409 or 304 means already registered - treat as success
      if (error.status === 409 || error.status === 304) {
        console.log('OneSignal player ID already registered');
        return true;
      }
      
      console.error('Failed to register player ID:', error);
      
      // Retry with exponential backoff
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          registerPlayerId(playerId);
        }, RETRY_DELAY * Math.pow(2, retryCount));
      }
      
      return false;
    }
  }, [retryCount]);

  // Unregister player ID on logout
  const unregisterPlayerId = useCallback(async () => {
    try {
      await apiRequest('DELETE', '/api/notifications/player-id');
      console.log('OneSignal player ID unregistered');
      
      // Logout from OneSignal
      if (window.OneSignal) {
        await window.OneSignal.logout();
      }
    } catch (error) {
      console.error('Failed to unregister player ID:', error);
    }
  }, []);

  // Initialize OneSignal
  useEffect(() => {
    if (!ONESIGNAL_APP_ID) {
      console.warn('OneSignal App ID not configured');
      return;
    }

    if (!user) {
      // User logged out - cleanup
      if (state.playerId) {
        unregisterPlayerId();
        setState({
          status: 'idle',
          permission: 'default',
          playerId: null,
          error: null,
        });
      }
      return;
    }

    if (state.status !== 'idle') {
      return;
    }

    async function initializeOneSignal() {
      try {
        setState(prev => ({ ...prev, status: 'initializing' }));

        // Load OneSignal SDK
        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.defer = true;
        document.head.appendChild(script);

        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load OneSignal SDK'));
        });

        // Wait for OneSignal to be available
        if (!window.OneSignalDeferred) {
          throw new Error('OneSignal SDK not loaded');
        }

        const OneSignal = await window.OneSignalDeferred;
        window.OneSignal = OneSignal;

        // Initialize OneSignal
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false,
          },
        });

        // Get current permission state
        const permission = await OneSignal.Notifications.permission;
        
        setState(prev => ({
          ...prev,
          status: 'ready',
          permission: permission as NotificationPermission,
        }));

        // Prompt for permission if not already granted
        if (permission !== 'granted') {
          try {
            await OneSignal.Slidedown.promptPush();
          } catch (error) {
            console.warn('User declined push notification permission');
          }
        }

        // Get player ID if subscribed
        const subscription = OneSignal.User.PushSubscription;
        if (subscription.id) {
          setState(prev => ({ ...prev, playerId: subscription.id }));
          await registerPlayerId(subscription.id);
        }

        // Listen for subscription changes
        subscription.addEventListener('change', (event: any) => {
          const newPlayerId = event.current.id;
          if (newPlayerId) {
            setState(prev => ({ ...prev, playerId: newPlayerId }));
            registerPlayerId(newPlayerId);
          }
        });

      } catch (error: any) {
        console.error('OneSignal initialization error:', error);
        setState(prev => ({
          ...prev,
          status: 'error',
          error: error.message || 'Failed to initialize notifications',
        }));
      }
    }

    initializeOneSignal();
  }, [user, state.status, registerPlayerId, unregisterPlayerId]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!window.OneSignal) {
      console.warn('OneSignal not initialized');
      return false;
    }

    try {
      await window.OneSignal.Slidedown.promptPush();
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }, []);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!window.OneSignal) {
      console.warn('OneSignal not initialized');
      return false;
    }

    try {
      await window.OneSignal.User.PushSubscription.optOut();
      await unregisterPlayerId();
      setState(prev => ({ ...prev, playerId: null }));
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }, [unregisterPlayerId]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
