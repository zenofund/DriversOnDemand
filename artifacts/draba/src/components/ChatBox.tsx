import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageCircle } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { Message } from '@shared/schema';

interface ChatBoxProps {
  bookingId: string;
  currentUserId: string;
  currentUserRole: 'driver' | 'client';
  otherUserName: string;
}

export function ChatBox({ bookingId, currentUserId, currentUserRole, otherUserName }: ChatBoxProps) {
  const [messageText, setMessageText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch messages
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/api/messages', bookingId],
    queryFn: async () => {
      const response = await fetch(`/api/messages/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    refetchOnWindowFocus: false,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/messages', {
        booking_id: bookingId,
        message,
      });
      return response.json();
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['/api/messages', bookingId] });
    },
    onError: () => {
      toast({
        title: 'Failed to send message',
        description: 'Please try again',
        variant: 'destructive',
      });
    },
  });

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${bookingId}`)
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (messageText.trim()) {
      sendMessageMutation.mutate(messageText);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5" />
          Chat with {otherUserName}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages area */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </p>
            )}
            {messages.map((msg) => {
              const isCurrentUser = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                  data-testid={`message-${msg.id}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {isCurrentUser ? 'You' : otherUserName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        isCurrentUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={sendMessageMutation.isPending}
              data-testid="input-message"
            />
            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              size="icon"
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
