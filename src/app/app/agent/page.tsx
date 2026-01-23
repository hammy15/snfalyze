'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Send,
  Loader2,
  Bot,
  User,
  RotateCcw,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Types
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    id: string;
    tool: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
    requiresConfirmation: boolean;
  }>;
}

interface ToolConfirmation {
  executionId: string;
  tool: string;
  input: Record<string, unknown>;
  description: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function AgentPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = React.useState<ToolConfirmation | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start a new session
  const startSession = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await fetch('/api/agent/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'chat' }),
      });

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setMessages([]);

      // Add welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            "Hello! I'm your SNFalyze AI assistant. I can help you analyze deals, adjust valuation parameters, query CMS data, and more. What would you like to do today?",
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setIsLoading(false);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agent/session/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        toolCalls: data.toolCalls,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Handle pending confirmations
      if (data.pendingConfirmations && data.pendingConfirmations.length > 0) {
        setPendingConfirmation(data.pendingConfirmations[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle tool confirmation
  const handleConfirmation = async (approved: boolean) => {
    if (!pendingConfirmation || !sessionId) return;

    setIsLoading(true);
    try {
      // This would call the confirmation API
      // For now, just clear the confirmation
      setPendingConfirmation(null);

      // Add a system message about the confirmation
      const systemMessage: Message = {
        id: `system-${Date.now()}`,
        role: 'assistant',
        content: approved
          ? `Tool "${pendingConfirmation.tool}" was approved and executed.`
          : `Tool "${pendingConfirmation.tool}" was rejected.`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, systemMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to handle confirmation');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-start session on mount
  React.useEffect(() => {
    if (!sessionId) {
      startSession();
    }
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">AI Assistant</h1>
            <p className="text-sm text-muted-foreground">
              {sessionId ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                  Session active
                </span>
              ) : (
                'No active session'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={startSession} disabled={isLoading}>
            <RotateCcw className="h-4 w-4 mr-2" />
            New Session
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-6 py-3 bg-rose-500/10 border-b border-rose-500/20">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}

            <div
              className={cn(
                'max-w-[70%] rounded-lg px-4 py-3',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-slate-100 dark:bg-slate-800'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Tool calls */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                  {message.toolCalls.map((tc) => (
                    <div
                      key={tc.id}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      {tc.status === 'completed' ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : tc.status === 'pending' ? (
                        <Clock className="h-3 w-3 text-amber-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-rose-500" />
                      )}
                      <span>{tc.tool}</span>
                      <Badge variant="secondary" className="text-xs">
                        {tc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Tool confirmation dialog */}
      {pendingConfirmation && (
        <div className="px-6 py-4 border-t bg-amber-500/10">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Action Requires Confirmation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                The AI wants to execute: <strong>{pendingConfirmation.tool}</strong>
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {pendingConfirmation.description}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleConfirmation(false)}>
                  Reject
                </Button>
                <Button onClick={() => handleConfirmation(true)}>Approve</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Input area */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your deals..."
            rows={1}
            disabled={!sessionId || isLoading}
            className={cn(
              'flex-1 resize-none rounded-lg border bg-background px-4 py-3',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              'disabled:opacity-50'
            )}
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || !sessionId || isLoading}
            className="self-end"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
