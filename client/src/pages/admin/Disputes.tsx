import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardSidebar } from '@/components/DashboardSidebar';
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
import { Search, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Dispute } from '@shared/schema';

export default function AdminDisputes() {
  const [, setLocation] = useLocation();
  const { user, role } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!user || role !== 'admin') {
      setLocation('/auth/login');
    }
  }, [user, role, setLocation]);

  const { data: disputes = [], isLoading } = useQuery<Dispute[]>({
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
    <div className="flex h-screen bg-background">
      <DashboardSidebar role="admin" onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
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
                              <Badge variant="secondary">
                                {dispute.reported_by_role}
                              </Badge>
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
      </main>

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
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedDispute(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDispute}
              disabled={updateDisputeMutation.isPending}
            >
              Update Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
