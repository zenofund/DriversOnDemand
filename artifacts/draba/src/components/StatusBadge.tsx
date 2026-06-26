import { Badge } from '@/components/ui/badge';
import type { BookingStatus as BookingStatusType, PaymentStatus as PaymentStatusType } from '@shared/schema';
import { BookingStatus, PaymentStatus } from '@shared/schema';

interface StatusBadgeProps {
  status: BookingStatusType | PaymentStatusType;
  type: 'booking' | 'payment';
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  if (type === 'booking') {
    const bookingStatus = status as BookingStatusType;
    
    const config = {
      [BookingStatus.PENDING]: { 
        label: 'Pending', 
        className: 'bg-muted text-muted-foreground'
      },
      [BookingStatus.ACCEPTED]: { 
        label: 'Accepted', 
        className: 'bg-status-online/10 text-status-online border-status-online/20'
      },
      [BookingStatus.ONGOING]: { 
        label: 'Ongoing', 
        className: 'bg-primary/10 text-primary border-primary/20'
      },
      [BookingStatus.COMPLETED]: { 
        label: 'Completed', 
        className: 'bg-muted text-muted-foreground'
      },
      [BookingStatus.CANCELLED]: { 
        label: 'Cancelled', 
        className: 'bg-destructive/10 text-destructive border-destructive/20'
      },
    };

    const { label, className } = config[bookingStatus];
    
    return (
      <Badge 
        variant="outline" 
        className={`${className} rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase`}
        data-testid={`badge-booking-${bookingStatus}`}
      >
        {label}
      </Badge>
    );
  }

  const paymentStatus = status as PaymentStatusType;
  
  const config = {
    [PaymentStatus.PENDING]: { 
      label: 'Payment Pending', 
      className: 'bg-muted text-muted-foreground'
    },
    [PaymentStatus.PAID]: { 
      label: 'Paid', 
      className: 'bg-status-online/10 text-status-online border-status-online/20'
    },
    [PaymentStatus.FAILED]: { 
      label: 'Failed', 
      className: 'bg-destructive/10 text-destructive border-destructive/20'
    },
    [PaymentStatus.REFUNDED]: { 
      label: 'Refunded', 
      className: 'bg-muted text-muted-foreground'
    },
  };

  const { label, className } = config[paymentStatus];
  
  return (
    <Badge 
      variant="outline" 
      className={`${className} rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase`}
      data-testid={`badge-payment-${paymentStatus}`}
    >
      {label}
    </Badge>
  );
}
