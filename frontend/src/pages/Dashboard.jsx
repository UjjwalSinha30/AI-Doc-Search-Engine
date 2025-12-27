import { useState, useRef, useEffect } from "react";
import HeaderWithUserProfile from "../components/navbar";
import Sidebar from "../components/sidebar";
import { Menu } from "lucide-react";
import ChatInput from "../components/ChatInput";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewMessage = async (text, metadata = null) => {
    // Add user's message
    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      file: metadata,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Skip AI response for upload notifications
    if (metadata?.skipAIResponse) {
      return;
    }

    // Add AI placeholder
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

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text }),
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
                    ? { ...m, citations: parsed.citations, isStreaming: false }
                    : m
                )
              );
            }
          } catch (e) {
            // Ignore malformed JSON chunks — common in streaming
            // The complete JSON will arrive in the next chunk
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                content: "Sorry, I couldn't respond right now.",
                isStreaming: false,
              }
            : m
        )
      );
    }
  };

  // Handle document selection from sidebar
  const handleDocumentSelect = (doc) => {
    setSidebarOpen(false);

    const systemMsg = {
      id: Date.now(),
      role: "system",
      content: `Now chatting about: **${doc.filename}** (${
        doc.page_count
      } page${doc.page_count !== 1 ? "s" : ""})`,
    };

    setMessages((prev) => [...prev, systemMsg]);
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 lg:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300
          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        <Sidebar
          closeSidebar={() => setSidebarOpen(false)}
          onDocumentSelect={handleDocumentSelect}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800 border-b dark:border-gray-700 lg:hidden">
          <Menu
            className="w-6 h-6 cursor-pointer text-gray-800 dark:text-gray-100"
            onClick={() => setSidebarOpen(true)}
          />
          <h1 className="text-xl font-semibold dark:text-white">
            AI Assistant
          </h1>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <HeaderWithUserProfile />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
          {messages.length === 0 ? (
            <div className="text-center mt-32">
              <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
                Your Private AI Assistant
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Upload documents and ask anything — your data never leaves your
                machine
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`w-full my-4 ${
                  msg.role === "system"
                    ? "flex justify-center"
                    : msg.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }`}
              >
                {msg.role === "system" ? (
                  <div className="px-6 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className={`max-w-3xl px-6 py-4 rounded-2xl shadow-md ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-lg leading-relaxed">
                      {msg.content || (msg.isStreaming && "...")}
                    </p>

                    {msg.file && (
                      <p className="text-sm opacity-90 mt-3">
                        {msg.file.status === "error" ? "Failed" : "Uploaded"}:{" "}
                        {msg.file.name}
                      </p>
                    )}

                    {msg.isStreaming && (
                      <span className="inline-flex items-center mt-2">
                        <span className="animate-bounce delay-0">.</span>
                        <span className="animate-bounce delay-100">.</span>
                        <span className="animate-bounce delay-200">.</span>
                      </span>
                    )}

                    {msg.citations?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                          Sources:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {msg.citations.map((cite, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                            >
                              [{i + 1}] {cite.source} • Page {cite.page}
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
        </div>

        {/* Chat Input */}
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto py-4 px-4">
            <ChatInput onSend={handleNewMessage} />
          </div>
        </div>
      </div>
    </div>
  );
}
