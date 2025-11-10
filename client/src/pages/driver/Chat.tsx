import { useEffect, useState, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { Send, ArrowLeft, MessageCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import type { Message } from '@shared/schema';

interface ChatMessage extends Message {
  sender_name?: string;
}

interface BookingDetails {
  id: string;
  client: {
    full_name: string;
    profile_picture_url: string | null;
  };
  start_location: string;
  destination: string;
}

export default function DriverChat() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const bookingId = params.id;
  const { user, profile } = useAuthStore();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user) {
      setLocation('/auth/login');
    }
  }, [user, setLocation]);

  // Fetch booking details
  const { data: booking } = useQuery<BookingDetails>({
    queryKey: ['/api/bookings', bookingId],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch booking');
      return response.json();
    },
    enabled: !!bookingId,
  });

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/messages', bookingId],
    enabled: !!bookingId,
    refetchOnWindowFocus: false,
  });

  // Subscribe to new messages
  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`messages-driver-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['/api/messages', bookingId] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [bookingId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest('POST', '/api/messages', {
        booking_id: bookingId,
        message: text,
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/messages', bookingId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  if (!user || !profile) {
    return null;
  }

  const clientName = booking?.client?.full_name || 'Client';

  return (
    <DashboardLayout role="driver" onLogout={handleLogout}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="border-b bg-card p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/driver/bookings')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-10 w-10 border-2 border-primary/10">
                <AvatarImage 
                  src={booking?.client?.profile_picture_url || undefined}
                  alt={clientName}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold">{clientName}</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageCircle className="h-3 w-3" />
                  <span>{booking?.start_location}</span>
                  <span>→</span>
                  <span>{booking?.destination}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-muted/30">
          <div className="max-w-4xl mx-auto space-y-4">
            {isLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="h-16 w-64 bg-card animate-pulse rounded-lg" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && messages.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">No messages yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start a conversation with your client
                  </p>
                </CardContent>
              </Card>
            )}

            {!isLoading &&
              messages.map((msg) => {
                const isOwnMessage = msg.sender_role === 'driver';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwnMessage && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage 
                          src={booking?.client?.profile_picture_url || undefined}
                          alt={clientName}
                        />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-card border rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {isOwnMessage && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage 
                          src={'profile_picture_url' in (profile || {}) ? profile.profile_picture_url || undefined : undefined}
                          alt="You"
                        />
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          You
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}

            {isTyping && (
              <div className="flex gap-2 justify-start">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage 
                    src={booking?.client?.profile_picture_url || undefined}
                    alt={clientName}
                  />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card border rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t bg-card p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sendMessageMutation.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
