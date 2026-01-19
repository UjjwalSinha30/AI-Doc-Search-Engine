import { useState, useRef, useEffect } from "react";
import HeaderWithUserProfile from "../components/navbar";
import Sidebar from "../components/sidebar";
import { Menu, Bell } from "lucide-react";
import ChatInput from "../components/ChatInput";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [documentsVersion, setDocumentsVersion] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false); // ← NEW
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null); // ← NEW
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // ← NEW: Stop streaming handler
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleNewMessage = async (text, metadata = null) => {
    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      file: metadata,
    };
    setMessages((prev) => [...prev, userMsg]);

    if (metadata?.skipAIResponse) {
      setDocumentsVersion((v) => v + 1);
      return;
    }

    const aiMsgId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      {
        id: aiMsgId,
        role: "assistant",
        content: "",
        citations: [],
        isStreaming: true,
      },
    ]);

    // ← NEW: Create abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal, // ← NEW: Attach signal
        body: JSON.stringify({ 
          message: text, 
          document_id: selectedDocument?.id ?? null 
        }),
      });

      if (!response.ok) throw new Error("Chat failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId 
                    ? { ...m, content: m.content + parsed.content } 
                    : m
                )
              );
            }

            if (parsed.citations) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId
                    ? { ...m, citations: parsed.citations }
                    : m
                )
              );
            }
          } catch {
            // Silent ignore for streaming chunks
          }
        }
      }
    } catch (err) {
      // Handle abort vs real error
      if (err.name === "AbortError") {
        console.log("Streaming stopped by user");
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, content: m.content || "Sorry, something went wrong." }
              : m
          )
        );
      }
    } finally {
      // ← NEW: Always cleanup
      setIsStreaming(false);
      abortControllerRef.current = null;
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, isStreaming: false } : m
        )
      );
    }
  };

  const handleDocumentSelect = (doc) => {
    setSidebarOpen(false);
    const systemMsg = {
      id: Date.now(),
      role: "system",
      content: `Now chatting about: **${doc.filename}** (${doc.page_count} page${
        doc.page_count !== 1 ? "s" : ""
      })`,
    };
    setMessages((prev) => [...prev, systemMsg]);
    setSelectedDocument(doc);
  };

  const getInitials = () => {
    if (!user) return "??";
    const name = user.name || user.email || "";
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.charAt(0).toUpperCase() || "??";
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 
          transform transition-transform duration-300 ease-in-out lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:w-72`}
      >
        <Sidebar
          closeSidebar={() => setSidebarOpen(false)}
          onDocumentSelect={handleDocumentSelect}
          documentsVersion={documentsVersion}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              <h1 className="text-xl font-semibold">MindVault</h1>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              <button className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all">
                {getInitials()}
              </button>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <div className="hidden lg:block sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <HeaderWithUserProfile user={user} />
        </div>

        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-950/50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                Your Private AI Assistant
              </h2>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-md">
                Upload your documents
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user"
                    ? "justify-end"
                    : msg.role === "system"
                    ? "justify-center"
                    : "justify-start"
                } mb-6 animate-fade-in`}
              >
                {msg.role === "system" ? (
                  <div className="px-5 py-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium shadow-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] sm:max-w-2xl px-5 py-4 rounded-2xl shadow-sm transition-all duration-200 border border-transparent
                      ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
                      }`}
                  >
                    <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                      {msg.content || (msg.isStreaming && <span className="text-gray-400">Thinking...</span>)}
                    </div>

                    {msg.file && (
                      <p className="text-xs mt-2 opacity-80">
                        {msg.file.status === "error" ? "Upload failed" : "Uploaded"}: {msg.file.name}
                      </p>
                    )}

                    {msg.isStreaming && (
                      <div className="flex gap-1 mt-2">
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0ms]"></span>
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:150ms]"></span>
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:300ms]"></span>
                      </div>
                    )}

                    {msg.citations?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/50">
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-400 mb-2.5 tracking-wide uppercase">
                          Sources
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {msg.citations.map((cite, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium
                                         bg-gray-100/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300
                                         rounded-full border border-gray-200/70 dark:border-gray-700/60
                                         hover:bg-gray-200 dark:hover:bg-gray-700/80 transition-colors
                                         cursor-pointer"
                            >
                              <span className="font-bold opacity-70">[{i+1}]</span>
                              <span className="truncate max-w-[180px]">{cite.source}</span>
                              <span className="opacity-60">p.{cite.page}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Chat Input - Pass isStreaming and stop handler */}
        <div className="sticky bottom-0 z-30 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
            <ChatInput 
              onSend={handleNewMessage} 
              isStreaming={isStreaming}
              onStop={handleStopStreaming}
            />
          </div>
        </div>
      </div>
    </div>
  );
}