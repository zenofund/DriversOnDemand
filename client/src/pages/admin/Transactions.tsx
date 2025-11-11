import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, DollarSign, TrendingUp, CreditCard, CheckCircle } from 'lucide-react';

export default function AdminTransactions() {
  const [, setLocation] = useLocation();
  const { user, role, isLoading } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isLoading) return;
    
    if (!user || role !== 'admin') {
      setLocation('/auth/login');
    }
  }, [isLoading, user, role, setLocation]);

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<any[]>({
    queryKey: ['/api/admin/transactions'],
    enabled: !!user && role === 'admin',
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.paystack_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.driver?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.driver?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: transactions.reduce((sum, tx) => sum + tx.amount, 0),
    platformShare: transactions.reduce((sum, tx) => sum + (tx.platform_share || 0), 0),
    driverShare: transactions.reduce((sum, tx) => sum + (tx.driver_share || 0), 0),
    settled: transactions.filter((tx) => tx.settled).length,
    pending: transactions.filter((tx) => !tx.settled).length,
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
                Transactions
              </h1>
              <p className="text-muted-foreground mt-1">
                Track all platform transactions and revenue
              </p>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by reference or driver..."
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
                  <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₦{stats.total.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-status-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-status-success">
                    ₦{stats.platformShare.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Driver Earnings</CardTitle>
                  <CreditCard className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₦{stats.driverShare.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Settled</CardTitle>
                  <CheckCircle className="h-4 w-4 text-status-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.settled}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <CreditCard className="h-4 w-4 text-status-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-status-warning">{stats.pending}</div>
                </CardContent>
              </Card>
            </div>

            {/* Transactions Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Driver Share</TableHead>
                          <TableHead>Platform Share</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              {new Date(tx.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {tx.paystack_ref}
                            </TableCell>
                            <TableCell>
                              <Badge variant={tx.transaction_type === 'verification' ? 'secondary' : 'default'}>
                                {tx.transaction_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {tx.driver ? (
                                <div>
                                  <div className="font-medium">{tx.driver.full_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {tx.driver.email}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              ₦{tx.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              ₦{(tx.driver_share || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-status-success">
                              ₦{(tx.platform_share || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {tx.settled ? (
                                <Badge variant="default">Settled</Badge>
                              ) : (
                                <Badge variant="secondary">Pending</Badge>
                              )}
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
    </DashboardLayout>
  );
}
