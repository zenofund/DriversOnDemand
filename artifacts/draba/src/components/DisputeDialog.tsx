import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface DisputeDialogProps {
  bookingId: string;
  trigger?: React.ReactNode;
}

export function DisputeDialog({ bookingId, trigger }: DisputeDialogProps) {
  const [open, setOpen] = useState(false);
  const [disputeType, setDisputeType] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createDisputeMutation = useMutation({
    mutationFn: async (data: { booking_id: string; dispute_type: string; description: string }) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create dispute');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/disputes'] });
      setOpen(false);
      setDisputeType('');
      setDescription('');
      toast({
        title: 'Dispute Filed',
        description: 'Your dispute has been submitted. Our team will review it shortly.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!disputeType || !description || description.length < 10) {
      toast({
        title: 'Incomplete Form',
        description: 'Please select a dispute type and provide a detailed description (at least 10 characters).',
        variant: 'destructive',
      });
      return;
    }

    createDisputeMutation.mutate({
      booking_id: bookingId,
      dispute_type: disputeType,
      description,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            Report Issue
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>File a Dispute</DialogTitle>
          <DialogDescription>
            Report an issue with this booking. Our support team will review your complaint.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dispute-type">Dispute Type</Label>
            <Select value={disputeType} onValueChange={setDisputeType}>
              <SelectTrigger id="dispute-type">
                <SelectValue placeholder="Select the type of issue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payment">Payment Issue</SelectItem>
                <SelectItem value="service_quality">Service Quality</SelectItem>
                <SelectItem value="cancellation">Cancellation Problem</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {description.length} / 10 characters minimum
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={createDisputeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createDisputeMutation.isPending}
          >
            {createDisputeMutation.isPending ? 'Submitting...' : 'Submit Dispute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
