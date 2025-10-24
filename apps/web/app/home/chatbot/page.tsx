"use client";
import { useState, useEffect } from "react";
import { supabase } from "~/lib/supabase/client";
import { Send, MessageCircle, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        console.log("Checking authentication...");
        const { data: { user }, error } = await supabase.auth.getUser();

        if (!mounted) return;

        console.log("Auth check result:", { user: !!user, error: error?.message });

        if (error) {
          console.error("Auth error:", error);
          setAuthError(error.message);
        } else {
          setUser(user);
          setAuthError(null);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setAuthError("Failed to check authentication");
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change:", event, !!session?.user);

        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setAuthError(null);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setAuthError(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log("Token refreshed, updating user");
          setUser(session.user);
        }
      }
    );

    // Set up periodic session refresh
    const refreshInterval = setInterval(async () => {
      if (!mounted) return;

      try {
        const { data: { session }, error } = await supabase.auth.refreshSession();
        if (error) {
          console.log("Session refresh failed:", error.message);
        } else if (session?.user) {
          console.log("Session refreshed successfully");
          setUser(session.user);
        }
      } catch (err) {
        console.log("Session refresh error:", err);
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const sendQuery = async () => {
    // Double-check user authentication before sending
    if (!user?.id) {
      console.log("No user found, checking auth again...");
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser();
        if (!currentUser || error) {
          console.log("Still no user, redirecting to sign-in");
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Please log in to use the chatbot. Redirecting...",
            timestamp: new Date()
          }]);
          window.location.href = "/auth/sign-in?next=/home/chatbot";
          return;
        }
        setUser(currentUser);
      } catch (err) {
        console.error("Failed to re-check auth:", err);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "Authentication check failed. Please refresh the page.",
          timestamp: new Date()
        }]);
        return;
      }
    }

    console.log("Sending query with user ID:", user.id);

    if (!query.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const currentQuery = query;
    setQuery("");

    try {
      // Ensure we have a fresh session before making the API call (matching dataUpload pattern)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error("Session expired or invalid. Please sign in again.");
      }

      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ user_id: user.id, query: currentQuery }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("Chat response:", data);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || data.error || "An error occurred.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat request failed:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Failed to connect to the server: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-slate-600">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (authError) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">Authentication Error</div>
            <p className="text-slate-600 mb-4">{authError}</p>
            <button
              onClick={() => window.location.href = "/auth/sign-in?next=/home/chatbot"}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center">
            <MessageCircle className="w-8 h-8 mr-3 text-blue-600" />
            Chatbot GMAO
          </h1>
          <p className="text-slate-600">
            Posez vos questions sur vos documents techniques
          </p>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Messages Area */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 py-12">
                <Bot className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium mb-2">Bienvenue dans le Chatbot GMAO</p>
                <p className="text-sm">Posez une question sur vos documents téléversés</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 mr-2" />
                      ) : (
                        <Bot className="w-4 h-4 mr-2" />
                      )}
                      <span className="text-xs opacity-75">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {message.role === 'assistant' ? (
                      <div className="text-sm prose prose-sm max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                  <div className="flex items-center">
                    <Bot className="w-4 h-4 mr-2" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 p-6">
            <div className="flex space-x-4">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Posez votre question..."
                className="flex-1 border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={isLoading}
              />
              <button
                onClick={sendQuery}
                disabled={isLoading || !query.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:shadow-none flex items-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex justify-between items-center">
            <p className="text-sm text-blue-800">
              <strong>💡 Conseil :</strong> Pour de meilleurs résultats, soyez spécifique dans vos questions sur vos documents techniques.
            </p>
            {user && (
              <button
                onClick={async () => {
                  try {
                    const { data: { session }, error } = await supabase.auth.refreshSession();
                    if (error) {
                      console.error("Manual session refresh failed:", error);
                      window.location.href = "/auth/sign-in?next=/home/chatbot";
                    } else {
                      setUser(session?.user || null);
                      console.log("Session manually refreshed");
                    }
                  } catch (err) {
                    console.error("Manual refresh error:", err);
                    window.location.href = "/auth/sign-in?next=/home/chatbot";
                  }
                }}
                className="text-xs px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
              >
                Refresh Session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
