import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, AlertCircle, CheckCircle2, XCircle, DollarSign, Ban, ShieldCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Dispute } from '@shared/schema';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdminDisputes() {
  const [, setLocation] = useLocation();
  const { user, role, isLoading } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [bookingActionReason, setBookingActionReason] = useState('');
  const [showForceCompleteDialog, setShowForceCompleteDialog] = useState(false);
  const [showForceCancelDialog, setShowForceCancelDialog] = useState(false);
  const [processRefund, setProcessRefund] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoading) return;
    
    if (!user || role !== 'admin') {
      setLocation('/auth/login');
    }
  }, [isLoading, user, role, setLocation]);

  const { data: disputes = [], isLoading: isLoadingDisputes } = useQuery<Dispute[]>({
    queryKey: ['/api/admin/disputes'],
    enabled: !!user && role === 'admin',
  });

  const updateDisputeMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`/api/admin/disputes/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data.updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update dispute');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/disputes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
      setSelectedDispute(null);
      setResolution('');
      setStatus('');
      setPriority('');
      setAdminNotes('');
      toast({
        title: 'Success',
        description: 'Dispute updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update dispute',
        variant: 'destructive',
      });
    },
  });

  const forceCompleteMutation = useMutation({
    mutationFn: async ({ bookingId, reason, disputeId }: { bookingId: string; reason: string; disputeId: string }) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`/api/admin/bookings/${bookingId}/force-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, dispute_id: disputeId }),
      });

      if (!response.ok) {
        throw new Error('Failed to force complete booking');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/disputes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
      setShowForceCompleteDialog(false);
      setBookingActionReason('');
      toast({
        title: 'Booking Completed',
        description: data.payout_triggered 
          ? 'Booking marked as completed and payout initiated successfully'
          : 'Booking marked as completed (payout failed - check logs)',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to force complete booking',
        variant: 'destructive',
      });
    },
  });

  const forceCancelMutation = useMutation({
    mutationFn: async ({ bookingId, reason, disputeId, processRefund }: { 
      bookingId: string; 
      reason: string; 
      disputeId: string;
      processRefund: boolean;
    }) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`/api/admin/bookings/${bookingId}/force-cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, dispute_id: disputeId, process_refund: processRefund }),
      });

      if (!response.ok) {
        throw new Error('Failed to force cancel booking');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/disputes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
      setShowForceCancelDialog(false);
      setBookingActionReason('');
      setProcessRefund(false);
      toast({
        title: 'Booking Cancelled',
        description: data.refund_processed 
          ? 'Booking cancelled and refund processed successfully'
          : 'Booking cancelled successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to force cancel booking',
        variant: 'destructive',
      });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  const handleUpdateDispute = () => {
    if (!selectedDispute) return;

    const updates: any = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (adminNotes) updates.admin_notes = adminNotes;
    if (resolution) updates.resolution = resolution;

    updateDisputeMutation.mutate({
      id: selectedDispute.id,
      updates,
    });
  };

  const filteredDisputes = disputes.filter(
    (dispute) =>
      dispute.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.dispute_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: disputes.length,
    open: disputes.filter((d) => d.status === 'open').length,
    investigating: disputes.filter((d) => d.status === 'investigating').length,
    resolved: disputes.filter((d) => d.status === 'resolved').length,
    urgent: disputes.filter((d) => d.priority === 'urgent').length,
  };

  if (!user || role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout role="admin" onLogout={handleLogout}>
      <div className="p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold font-heading text-foreground">
                Dispute Resolution
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage and resolve user disputes
              </p>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search disputes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Open</CardTitle>
                  <AlertCircle className="h-4 w-4 text-status-error" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-status-error">{stats.open}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Investigating</CardTitle>
                  <AlertCircle className="h-4 w-4 text-status-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-status-warning">{stats.investigating}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-status-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-status-success">{stats.resolved}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Urgent</CardTitle>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.urgent}</div>
                </CardContent>
              </Card>
            </div>

            {/* Disputes Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Disputes</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : filteredDisputes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No disputes found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reporter</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDisputes.map((dispute) => (
                          <TableRow key={dispute.id}>
                            <TableCell>
                              {new Date(dispute.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {dispute.dispute_type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-sm">
                                  {(dispute as any).reporter?.full_name || 'Unknown'}
                                </span>
                                <Badge variant="secondary" className="w-fit">
                                  {dispute.reported_by_role}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate">{dispute.description}</div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  dispute.priority === 'urgent'
                                    ? 'destructive'
                                    : dispute.priority === 'high'
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {dispute.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  dispute.status === 'resolved'
                                    ? 'default'
                                    : dispute.status === 'investigating'
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                {dispute.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedDispute(dispute);
                                  setStatus(dispute.status);
                                  setPriority(dispute.priority);
                                  setAdminNotes(dispute.admin_notes || '');
                                  setResolution(dispute.resolution || '');
                                }}
                              >
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      {/* Dispute Management Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Dispute</DialogTitle>
            <DialogDescription>
              Update the status and resolution of this dispute
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground">
                  {selectedDispute.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes about this dispute..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Resolution</label>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Describe how this dispute was resolved..."
                  rows={3}
                />
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Booking Actions</h4>
                <p className="text-sm text-muted-foreground">
                  Enforce your dispute resolution decision on the booking
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    variant="default"
                    className="justify-start"
                    onClick={() => setShowForceCompleteDialog(true)}
                    data-testid="button-force-complete"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Force Complete & Pay Driver
                  </Button>

                  <Button
                    variant="destructive"
                    className="justify-start"
                    onClick={() => setShowForceCancelDialog(true)}
                    data-testid="button-force-cancel"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel & Refund Client
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedDispute(null)}
            >
              Close
            </Button>
            <Button
              onClick={handleUpdateDispute}
              disabled={updateDisputeMutation.isPending}
            >
              {updateDisputeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Dispute'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Complete Confirmation Dialog */}
      <AlertDialog open={showForceCompleteDialog} onOpenChange={setShowForceCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Complete Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the booking as completed, override both driver and client confirmations, and trigger the driver payout automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (required)</label>
            <Textarea
              value={bookingActionReason}
              onChange={(e) => setBookingActionReason(e.target.value)}
              placeholder="Explain why you're forcing this booking to complete..."
              rows={3}
              data-testid="input-force-complete-reason"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingActionReason('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selectedDispute || !bookingActionReason || bookingActionReason.length < 10) {
                  toast({
                    title: 'Error',
                    description: 'Please provide a reason (at least 10 characters)',
                    variant: 'destructive',
                  });
                  return;
                }
                forceCompleteMutation.mutate({
                  bookingId: selectedDispute.booking_id,
                  reason: bookingActionReason,
                  disputeId: selectedDispute.id,
                });
              }}
              disabled={forceCompleteMutation.isPending}
              data-testid="button-confirm-force-complete"
            >
              {forceCompleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Complete & Pay
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force Cancel Confirmation Dialog */}
      <AlertDialog open={showForceCancelDialog} onOpenChange={setShowForceCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the booking. You can optionally process a refund to the client.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (required)</label>
              <Textarea
                value={bookingActionReason}
                onChange={(e) => setBookingActionReason(e.target.value)}
                placeholder="Explain why you're cancelling this booking..."
                rows={3}
                data-testid="input-force-cancel-reason"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="process-refund"
                checked={processRefund}
                onChange={(e) => setProcessRefund(e.target.checked)}
                className="h-4 w-4"
                data-testid="checkbox-process-refund"
              />
              <label htmlFor="process-refund" className="text-sm font-medium">
                Process refund to client (if payment was made)
              </label>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setBookingActionReason('');
              setProcessRefund(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selectedDispute || !bookingActionReason || bookingActionReason.length < 10) {
                  toast({
                    title: 'Error',
                    description: 'Please provide a reason (at least 10 characters)',
                    variant: 'destructive',
                  });
                  return;
                }
                forceCancelMutation.mutate({
                  bookingId: selectedDispute.booking_id,
                  reason: bookingActionReason,
                  disputeId: selectedDispute.id,
                  processRefund,
                });
              }}
              disabled={forceCancelMutation.isPending}
              data-testid="button-confirm-force-cancel"
            >
              {forceCancelMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Cancel Booking
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
