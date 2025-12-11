import { useState, useRef } from "react";
import { Send, Paperclip, Mic, Loader2, CheckCircle, XCircle } from "lucide-react";
import axios from "axios";

export default function ChatInput({ onSend, isLoading = false }) {
  // Text input state
  const [input, setInput] = useState("");

  // File upload visual status: null | "uploading" | "success" | "error"
  const [uploadStatus, setUploadStatus] = useState(null);

  // Ref for resetting <input type="file">
  const fileInputRef = useRef(null);

  // ================================
  // File Upload Handler
  // ================================
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Upload file to FastAPI backend
      await axios.post("http://localhost:8000/api/upload", formData, {
        withCredentials: true, // attach cookies for authenticated routes
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Show success UI
      setUploadStatus("success");

      // Notify parent component
      onSend?.(
        `Uploaded "${file.name}" — added to your knowledge base`,
        {
          type: "file",
          name: file.name,
          status: "success"
        }
      );

      // Reset visual status after 3 secs
      setTimeout(() => setUploadStatus(null), 3000);

    } catch (err) {
      setUploadStatus("error");

      // Show error from backend
      const msg = err.response?.data?.detail || "Upload failed";

      // Let parent component display a chat message about failure
      onSend?.(`Upload failed: ${msg}`, {
        type: "file",
        status: "error"
      });

      setTimeout(() => setUploadStatus(null), 5000);
    } finally {
      // Reset file input so the same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ================================
  // Text Message Sender
  // ================================
  const handleSend = () => {
    if (!input.trim()) return;

    // Pass message to parent
    onSend?.(input.trim());

    // Clear input area
    setInput("");
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="px-4 py-4">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">

          {/* ======================
              FILE UPLOAD BUTTON
              ====================== */}
          <label className="mb-2">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.txt,.docx,.md,.csv"
              className="hidden"
            />

            {/* File button + Upload status icons */}
            <div
              className={`relative p-3 rounded-full transition cursor-pointer
              ${uploadStatus === "uploading" ? "bg-blue-100" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              {uploadStatus === "uploading" && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
              {uploadStatus === "success" && <CheckCircle className="w-5 h-5 text-green-600" />}
              {uploadStatus === "error"   && <XCircle className="w-5 h-5 text-red-600" />}
              {uploadStatus === null      && <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
            </div>
          </label>

          {/* ======================
              TEXT INPUT AREA
              ====================== */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Send on Enter (Shift+Enter makes newline)
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything or upload documents..."
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-300 dark:border-gray-600 
                       bg-gray-50 dark:bg-gray-900 px-5 py-3 text-base
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-70"
          />

          {/* Mic Button Placeholder */}
          <button
            disabled={isLoading}
            className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition mb-2"
          >
            <Mic className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-mb-2 p-3 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                       disabled:cursor-not-allowed transition shadow-md"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3 space-x-4">
          <span>Press Enter to send</span>
          <span>•</span>
          <span>PDF, DOCX, TXT, MD up to 50MB</span>
        </div>
      </div>
    </div>
  );
}
  