import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DriverReviews } from '@/components/DriverReviews';
import type { Driver } from '@shared/schema';

interface DriverReviewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver;
}

export function DriverReviewsDialog({ open, onOpenChange, driver }: DriverReviewsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{driver.full_name}'s Reviews</DialogTitle>
          <DialogDescription>
            See what other clients say about this driver
          </DialogDescription>
        </DialogHeader>
        
        <DriverReviews
          driverId={driver.id}
          driverName={driver.full_name}
          averageRating={driver.rating}
          totalTrips={driver.total_trips}
        />
      </DialogContent>
    </Dialog>
  );
}
