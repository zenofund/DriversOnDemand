import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Shield, 
  AlertTriangle,
  Clock,
  User,
  Phone,
  Mail,
  Hash,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface PendingVerification {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  nin_verification_state: string;
  nin_verified_at: string | null;
  last_attempt_at: string | null;
  nin_attempts_count: number;
  nin_last_confidence: number | null;
  nin_reference_id: string | null;
  created_at: string;
  latest_verification: {
    id: string;
    nin_hash: string;
    selfie_storage_path: string | null;
    status: string;
    confidence_score: number | null;
    request_metadata: any;
    response_metadata: any;
    failure_reason: string | null;
    created_at: string;
  } | null;
}

export default function AdminNINVerifications() {
  const [, setLocation] = useLocation();
  const { user, role, isLoading } = useAuthStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVerification, setSelectedVerification] = useState<PendingVerification | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (isLoading) return;
    
    if (!user || role !== 'admin') {
      setLocation('/auth/login');
    }
  }, [isLoading, user, role, setLocation]);

  const { data: pendingVerifications = [], isLoading: isLoadingVerifications } = useQuery<PendingVerification[]>({
    queryKey: ['/api/admin/nin-verifications/pending'],
    enabled: !!user && role === 'admin',
    refetchInterval: 30000,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ clientId, action, notes }: { clientId: string; action: 'approve' | 'reject'; notes: string }) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`/api/admin/nin-verifications/${clientId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action, notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to review verification');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/nin-verifications/pending'] });
      setSelectedVerification(null);
      setReviewNotes('');
      toast({
        title: variables.action === 'approve' ? 'Verification Approved' : 'Verification Rejected',
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Review Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  const handleApprove = () => {
    if (!selectedVerification) return;
    reviewMutation.mutate({
      clientId: selectedVerification.id,
      action: 'approve',
      notes: reviewNotes,
    });
  };

  const handleReject = () => {
    if (!selectedVerification) return;
    reviewMutation.mutate({
      clientId: selectedVerification.id,
      action: 'reject',
      notes: reviewNotes,
    });
  };

  const filteredVerifications = pendingVerifications.filter(
    (verification) =>
      verification.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      verification.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      verification.phone.includes(searchTerm)
  );

  const stats = {
    total: pendingVerifications.length,
    locked: pendingVerifications.filter((v) => v.nin_verification_state === 'locked').length,
    pending_manual: pendingVerifications.filter((v) => v.nin_verification_state === 'pending_manual').length,
  };

  if (!user || role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout role="admin" onLogout={handleLogout}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold font-heading text-foreground">
                  NIN Verification Review
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manually review and approve locked NIN verification accounts
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Locked Accounts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{stats.locked}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Manual Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">{stats.pending_manual}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pending NIN Verifications</CardTitle>
              <CardDescription>
                Review and approve or reject client identity verifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingVerifications ? (
                <div className="text-center py-8 text-muted-foreground">Loading verifications...</div>
              ) : filteredVerifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No verifications match your search' : 'No pending verifications'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Last Attempt</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVerifications.map((verification) => (
                        <TableRow key={verification.id}>
                          <TableCell className="font-medium">{verification.full_name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span>{verification.email}</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{verification.phone}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {verification.nin_verification_state === 'locked' ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Locked
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Pending Review
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {verification.nin_attempts_count} / 3
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {verification.last_attempt_at
                              ? format(new Date(verification.last_attempt_at), 'MMM d, yyyy HH:mm')
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {verification.nin_last_confidence !== null ? (
                              <Badge 
                                variant={verification.nin_last_confidence >= 80 ? 'default' : 'secondary'}
                              >
                                {verification.nin_last_confidence}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => setSelectedVerification(verification)}
                            >
                              Review
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

      <Dialog open={!!selectedVerification} onOpenChange={() => setSelectedVerification(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Review NIN Verification
            </DialogTitle>
            <DialogDescription>
              Review the verification details and approve or reject this client's identity verification
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Full Name
                  </Label>
                  <p className="font-medium">{selectedVerification.full_name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <p className="font-medium">{selectedVerification.email}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </Label>
                  <p className="font-medium">{selectedVerification.phone}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Registered
                  </Label>
                  <p className="font-medium">
                    {format(new Date(selectedVerification.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold">Verification Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Status</Label>
                    <div>
                      {selectedVerification.nin_verification_state === 'locked' ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Locked (3 failed attempts)
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pending Manual Review
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Attempts</Label>
                    <p className="font-medium">{selectedVerification.nin_attempts_count} / 3</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Last Confidence Score</Label>
                    <p className="font-medium">
                      {selectedVerification.nin_last_confidence !== null
                        ? `${selectedVerification.nin_last_confidence}%`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Last Attempt</Label>
                    <p className="font-medium">
                      {selectedVerification.last_attempt_at
                        ? format(new Date(selectedVerification.last_attempt_at), 'MMM d, yyyy HH:mm')
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {selectedVerification.latest_verification && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      YouVerify Reference
                    </Label>
                    <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                      {selectedVerification.nin_reference_id || 'N/A'}
                    </p>
                  </div>
                )}

                {selectedVerification.latest_verification?.failure_reason && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Failure Reason</Label>
                    <p className="text-sm bg-destructive/10 p-3 rounded border border-destructive/20">
                      {selectedVerification.latest_verification.failure_reason}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <Label htmlFor="review-notes">Admin Notes</Label>
                <Textarea
                  id="review-notes"
                  placeholder="Add notes about your decision (optional but recommended)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Notes will be logged in the audit trail
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedVerification(null);
                setReviewNotes('');
              }}
              disabled={reviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={reviewMutation.isPending}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={reviewMutation.isPending}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
