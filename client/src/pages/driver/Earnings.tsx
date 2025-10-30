import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { DollarSign, TrendingUp, Clock, CheckCircle, Download } from 'lucide-react';
import { format } from 'date-fns';

interface PendingSettlement {
  booking_id: number;
  total_fare: number;
  driver_share: number;
  platform_commission: number;
  created_at: string;
}

interface PayoutHistory {
  id: number;
  amount: number;
  status: string;
  created_at: string;
  paystack_reference?: string;
}

export default function Earnings() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLocation('/auth/login');
    }
  }, [user, setLocation]);

  const { data: pendingSettlementsData, isLoading: loadingPending } = useQuery<PendingSettlement[]>({
    queryKey: ['/api/payouts/pending'],
  });

  const { data: payoutHistoryData, isLoading: loadingHistory } = useQuery<PayoutHistory[]>({
    queryKey: ['/api/payouts/history'],
  });

  // Ensure data is always an array
  const pendingSettlements = Array.isArray(pendingSettlementsData) ? pendingSettlementsData : [];
  const payoutHistory = Array.isArray(payoutHistoryData) ? payoutHistoryData : [];

  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/payouts/request', {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Payout requested',
        description: 'Your payout request has been submitted',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payouts/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payouts/history'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Request failed',
        description: error.message || 'Failed to request payout',
        variant: 'destructive',
      });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    setLocation('/auth/login');
  };

  if (!user) {
    return null;
  }

  const totalPending = pendingSettlements.reduce((sum, s) => sum + s.driver_share, 0);
  const totalPaid = payoutHistory.reduce((sum, p) => p.status === 'completed' ? sum + p.amount : sum, 0);

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar role="driver" onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold font-heading text-foreground">
                Earnings
              </h1>
              <p className="text-muted-foreground mt-1">
                Track your earnings and payout history
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground" data-testid="text-pending-earnings">
                    ₦{totalPending.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pendingSettlements.length} settlement{pendingSettlements.length !== 1 ? 's' : ''} pending
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Paid Out</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground" data-testid="text-total-paid">
                    ₦{totalPaid.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    From completed trips
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pending Settlements */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Pending Settlements</CardTitle>
                    <CardDescription>
                      Earnings awaiting payout
                    </CardDescription>
                  </div>
                  {pendingSettlements.length > 0 && (
                    <Button
                      onClick={() => requestPayoutMutation.mutate()}
                      disabled={requestPayoutMutation.isPending}
                      data-testid="button-request-payout"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Request Payout
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingPending ? (
                  <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : pendingSettlements.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">No pending settlements</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingSettlements.map((settlement, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                        data-testid={`settlement-${index}`}
                      >
                        <div>
                          <p className="font-medium text-sm">Booking #{settlement.booking_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(settlement.created_at), 'PPp')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 dark:text-green-400">
                            +₦{settlement.driver_share.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            From ₦{settlement.total_fare.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payout History */}
            <Card>
              <CardHeader>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>
                  Your past payouts and withdrawals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : payoutHistory.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">No payout history yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payoutHistory.map((payout) => (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between p-3 rounded-md border"
                        data-testid={`payout-${payout.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">Payout #{payout.id}</p>
                            <Badge className={getPayoutStatusColor(payout.status)}>
                              {payout.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(payout.created_at), 'PPp')}
                          </p>
                          {payout.paystack_reference && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Ref: {payout.paystack_reference}
                            </p>
                          )}
                        </div>
                        <p className="font-bold text-lg">
                          ₦{payout.amount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
