import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  driverName: string;
}

export function RatingDialog({ open, onOpenChange, bookingId, driverName }: RatingDialogProps) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const { toast } = useToast();

  const submitRatingMutation = useMutation({
    mutationFn: async (data: { booking_id: string; rating: number; review: string }) => {
      return apiRequest('/api/ratings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Rating submitted',
        description: 'Thank you for your feedback!',
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      onOpenChange(false);
      setRating(5);
      setReview('');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to submit rating',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    submitRatingMutation.mutate({
      booking_id: bookingId,
      rating,
      review,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-rating">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            How was your experience with {driverName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110"
                  data-testid={`button-star-${star}`}
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoveredStar || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {rating === 5 && 'Excellent'}
              {rating === 4 && 'Good'}
              {rating === 3 && 'Average'}
              {rating === 2 && 'Below Average'}
              {rating === 1 && 'Poor'}
            </p>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <label htmlFor="review" className="text-sm font-medium">
              Share your experience (optional)
            </label>
            <Textarea
              id="review"
              placeholder="Tell us about your trip..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              data-testid="textarea-review"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitRatingMutation.isPending}
              data-testid="button-cancel-rating"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitRatingMutation.isPending}
              data-testid="button-submit-rating"
            >
              {submitRatingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
