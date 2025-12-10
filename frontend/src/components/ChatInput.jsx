import { useState, useRef } from "react";
import { Send, Paperclip, Mic } from "lucide-react";

export default function ChatInput({ onSend, isLoading = false }) {
  const [input, setInput] = useState("");
  const fileInputRef = useRef(null);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // You can pass file + text together to parent
      onSend(input.trim(), file);
      setInput("");
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          
          {/* File Attachment Button */}
          <label className="shrink-0 mb-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.docx,.txt,.md,.csv,image/*"
            />
            <div className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition">
              <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
          </label>

          {/* Textarea - grows with content */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AI Assistant..."
              disabled={isLoading}
              rows={1}
              className="w-full max-h-32 resize-none rounded-2xl border border-gray-300 dark:border-gray-600 
                         bg-gray-50 dark:bg-gray-900 px-5 py-3 pr-12 text-base
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         disabled:opacity-70"
            />
          </div>

          {/* Mic & Send Buttons */}
          <div className="flex items-center gap-2 mb-2">
            {/* Mic Button (you can add voice later) */}
            <button
              className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition
                         disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <Mic className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                         disabled:cursor-not-allowed transition shadow-md"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
          Press Enter to send • Attach files up to 50MB
        </p>
      </div>
    </div>
  );
}