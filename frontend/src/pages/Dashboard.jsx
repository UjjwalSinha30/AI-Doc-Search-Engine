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

  const handleNewMessage = (text, fileInfo = null) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: "user",
      content: text,
      file: fileInfo
    }]);

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        content: fileInfo
          ? `I've successfully added "${fileInfo.name}" to your knowledge base. You can now ask questions about it!`
          : "How can I assist you today?"
      }]);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Overlay & Sidebar — unchanged */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 lg:hidden z-30" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <Sidebar closeSidebar={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Headers — unchanged */}
        <div className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800 border-b dark:border-gray-700 lg:hidden">
          <Menu className="w-6 h-6 cursor-pointer" onClick={() => setSidebarOpen(true)} />
          <h1 className="text-xl font-semibold dark:text-white">AI Assistant</h1>
        </div>
        <div className="hidden lg:block"><HeaderWithUserProfile /></div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-6 space-y-5 pb-32">
          {messages.length === 0 ? (
            <div className="text-center mt-20">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Welcome!</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-3">Upload documents or ask anything</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-2xl px-5 py-3 rounded-2xl shadow-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.file && (
                    <p className={`text-xs mt-2 opacity-90 ${msg.file.status === "error" ? "text-red-300" : ""}`}>
                      {msg.file.status === "error" ? "Failed" : "Success"}: {msg.file.name}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Fixed Chat Input */}
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto py-3">
            <ChatInput onSend={handleNewMessage} />
          </div>
        </div>
      </div>
    </div>
  );
}