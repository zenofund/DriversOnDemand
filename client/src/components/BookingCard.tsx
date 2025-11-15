import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MapPin,
  Clock,
  DollarSign,
  User,
  Phone,
  Star,
  CheckCircle,
  XCircle,
  MessageCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

type BookingStatus = 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded';

interface BookingCardProps {
  booking: {
    id: string;
    start_location: string;
    destination: string;
    booking_status: BookingStatus;
    payment_status: PaymentStatus;
    total_cost: number;
    created_at: string;
    scheduled_time?: string;
    driver_confirmed?: boolean;
    client_confirmed?: boolean;
    client?: {
      full_name: string;
      phone: string;
    };
    driver?: {
      full_name: string;
      phone: string;
      rating?: number;
    };
  };
  role: 'driver' | 'client' | 'admin';
  viewMode?: 'active' | 'history';
  onAccept?: (bookingId: string) => void;
  onReject?: (bookingId: string) => void;
  onConfirmCompletion?: (bookingId: string) => void;
  onDeclineCompletion?: (bookingId: string) => void;
  onChat?: (bookingId: string) => void;
  isLoading?: boolean;
}

export function BookingCard({
  booking,
  role,
  viewMode = 'active',
  onAccept,
  onReject,
  onConfirmCompletion,
  onDeclineCompletion,
  onChat,
  isLoading = false,
}: BookingCardProps) {
  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'ongoing':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getPaymentColor = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'authorized':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'refunded':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const showDriverInfo = role === 'client' || role === 'admin';
  const showClientInfo = role === 'driver' || role === 'admin';
  const isPending = booking.booking_status === 'pending';
  const isOngoing = booking.booking_status === 'ongoing';
  const isAccepted = booking.booking_status === 'accepted';
  const canChat = (isAccepted || isOngoing) && viewMode === 'active';

  return (
    <Card data-testid={`booking-card-${booking.id}`}>
      <CardHeader className="pb-3">
        {/* Mobile-first: Stack title and badges vertically */}
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg">
                Booking #{booking.id.slice(0, 8)}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(booking.created_at), 'PPp')}
              </CardDescription>
            </div>
            {/* Badges: Wrap on mobile */}
            <div className="flex flex-wrap gap-2">
              <Badge className={getStatusColor(booking.booking_status)}>
                {booking.booking_status}
              </Badge>
              <Badge className={getPaymentColor(booking.payment_status)} variant="outline">
                {booking.payment_status}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Client/Driver Info - Mobile optimized */}
        {showClientInfo && booking.client && (
          <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{booking.client.full_name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{booking.client.phone}</span>
              </p>
            </div>
          </div>
        )}

        {showDriverInfo && booking.driver && (
          <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{booking.driver.full_name}</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{booking.driver.phone}</span>
                </span>
                {booking.driver.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    {booking.driver.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Location Info - Mobile optimized */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <MapPin className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Pickup</p>
              <p className="text-sm break-words">{booking.start_location || 'Not specified'}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <MapPin className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Destination</p>
              <p className="text-sm break-words">{booking.destination || 'Not specified'}</p>
            </div>
          </div>
        </div>

        {/* Cost & Scheduled Time - Mobile optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-semibold">₦{booking.total_cost.toLocaleString()}</span>
          </div>
          {booking.scheduled_time && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">
                {format(new Date(booking.scheduled_time), 'PPp')}
              </span>
            </div>
          )}
        </div>

        {/* Completion Confirmation Status - Mobile optimized */}
        {isOngoing && viewMode === 'active' && (
          <Alert
            className={
              booking.driver_confirmed && booking.client_confirmed
                ? 'border-green-600 bg-green-50 dark:bg-green-950/20'
                : 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
            }
          >
            <AlertCircle
              className={
                booking.driver_confirmed && booking.client_confirmed
                  ? 'h-4 w-4 text-green-600'
                  : 'h-4 w-4 text-blue-600'
              }
            />
            <AlertDescription className="text-xs sm:text-sm">
              {booking.driver_confirmed && booking.client_confirmed && (
                <span className="text-green-700 dark:text-green-400 font-medium">
                  Both parties confirmed. Payment processing...
                </span>
              )}
              {booking.driver_confirmed && !booking.client_confirmed && role === 'driver' && (
                <span className="text-blue-700 dark:text-blue-400">
                  You confirmed completion. Waiting for client confirmation.
                </span>
              )}
              {!booking.driver_confirmed && booking.client_confirmed && role === 'driver' && (
                <span className="text-blue-700 dark:text-blue-400">
                  Client confirmed completion. Please confirm on your end.
                </span>
              )}
              {booking.driver_confirmed && !booking.client_confirmed && role === 'client' && (
                <span className="text-blue-700 dark:text-blue-400">
                  Driver confirmed completion. Please approve or decline.
                </span>
              )}
              {!booking.driver_confirmed && booking.client_confirmed && role === 'client' && (
                <span className="text-blue-700 dark:text-blue-400">
                  You confirmed completion. Waiting for driver confirmation.
                </span>
              )}
              {!booking.driver_confirmed && !booking.client_confirmed && (
                <span className="text-blue-700 dark:text-blue-400">
                  Trip in progress. Confirm completion when finished.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons - Stack vertically on mobile, horizontal on larger screens */}
        {viewMode === 'active' && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {/* Driver Actions */}
            {role === 'driver' && isPending && (
              <>
                <Button
                  onClick={() => onAccept?.(booking.id)}
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                  data-testid="button-accept"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isLoading ? 'Accepting...' : 'Accept'}
                </Button>
                <Button
                  onClick={() => onReject?.(booking.id)}
                  disabled={isLoading}
                  variant="destructive"
                  className="w-full sm:w-auto"
                  data-testid="button-reject"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {isLoading ? 'Rejecting...' : 'Reject'}
                </Button>
              </>
            )}

            {role === 'driver' && isOngoing && !booking.driver_confirmed && (
              <Button
                onClick={() => onConfirmCompletion?.(booking.id)}
                disabled={isLoading}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                data-testid="button-confirm-completion"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isLoading ? 'Confirming...' : 'Confirm Completion'}
              </Button>
            )}

            {/* Client Actions - Only show when driver has already confirmed */}
            {role === 'client' && isOngoing && !booking.client_confirmed && booking.driver_confirmed && (
              <>
                <Button
                  onClick={() => onConfirmCompletion?.(booking.id)}
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                  data-testid="button-approve"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isLoading ? 'Approving...' : 'Approve Request'}
                </Button>
                <Button
                  onClick={() => onDeclineCompletion?.(booking.id)}
                  disabled={isLoading}
                  variant="destructive"
                  className="w-full sm:w-auto"
                  data-testid="button-decline"
                >
                  Decline Request
                </Button>
              </>
            )}

            {/* Chat Button - Available for both driver and client */}
            {canChat && onChat && (
              <Button
                onClick={() => onChat(booking.id)}
                variant="outline"
                className="w-full sm:w-auto sm:ml-auto"
                data-testid="button-chat"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
