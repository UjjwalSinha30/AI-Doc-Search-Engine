import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Paperclip, 
  Mic, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Square,
  AlertCircle,
  Database,
  Sparkles 
} from "lucide-react";
import axios from "axios";

export default function ChatInput({ 
  onSend, 
  isStreaming = false, 
  onStop 
}) {
  const [input, setInput] = useState("");
  const [uploadStatus, setUploadStatus] = useState(null); // null | "uploading" | "success" | "error"
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [rows, setRows] = useState(1);
  const [showUploadHint, setShowUploadHint] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-grow textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => {
      textarea.style.height = "auto";
      const newRows = Math.min(Math.max(Math.ceil(textarea.scrollHeight / 24), 1), 6);
      setRows(newRows);
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    textarea.addEventListener("input", handleInput);
    return () => textarea.removeEventListener("input", handleInput);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // file size validation
    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus("error");
      onSend?.(`Upload failed: File size exceeds 50MB limit`,{
        type: "file",
        status: "error"
      });
      setTimeout(() => setUploadStatus(null), 5000);
      return;
    }

    setUploadStatus("uploading");
    setUploadedFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post("http://localhost:8000/api/upload", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadStatus("success");
      onSend?.(
        `Successfully uploaded "${file.name}" — now included in your knowledge base`,
        {
          type: "file",
          name: file.name,
          status: "success",
          skipAIResponse: true,
        }
      );

      setTimeout(() => setUploadStatus(null), 2800);
    } catch (err) {
      setUploadStatus("error");
      const msg = err.response?.data?.detail || "Upload failed. Please try again.";
      onSend?.(`Upload failed: ${msg}`, {
        type: "file",
        status: "error"
      });
      setTimeout(() => setUploadStatus(null), 5000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSend?.(input.trim());
    setInput("");
    setRows(1);
  };

  return (
    <div className="
      border-t border-gray-200/70 dark:border-gray-700/70
      bg-gradient-to-t from-white/95 to-white/70 
      dark:from-gray-950/95 dark:to-gray-900/70
      backdrop-blur-xl
      shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.08)] 
      dark:shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.35)]
      transition-all duration-300
    ">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="relative flex items-end gap-3 sm:gap-4">

          {/* === Upload Button === */}
          <label className="group relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.txt,.docx,.md,.csv"
              className="hidden"
              disabled={isStreaming}
            />
            <div className={`
              flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14
              rounded-2xl transition-all duration-200
              ${isStreaming 
                ? "opacity-40 cursor-not-allowed" 
                : "cursor-pointer hover:scale-105 active:scale-95"
              }
              ${uploadStatus === "uploading" 
                ? "bg-blue-100/80 dark:bg-blue-900/40 ring-2 ring-blue-400/50 animate-pulse-slow" 
                : uploadStatus === "success"
                ? "bg-green-100/80 dark:bg-green-900/40 ring-2 ring-green-400/50"
                : uploadStatus === "error"
                ? "bg-red-100/80 dark:bg-red-900/40 ring-2 ring-red-400/50"
                : "bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200/80 dark:hover:bg-gray-700/70 shadow-sm hover:shadow-md"
              }
            `}>
              {uploadStatus === "uploading" && (
                <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
              )}
              {uploadStatus === "success" && (
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 animate-pulse" />
              )}
              {uploadStatus === "error" && (
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
              {uploadStatus === null && (
                <Paperclip className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              )}

              {/* Tooltip */}
              {uploadStatus === null && (
                <div className="
                  absolute -top-11 left-1/2 -translate-x-1/2 
                  px-4 py-2 bg-gray-900/95 text-white text-xs rounded-lg 
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  pointer-events-none whitespace-nowrap shadow-lg
                ">
                  Upload Document (PDF, TXT, DOCX...)
                </div>
              )}
            </div>
          </label>

          {/* === Main Input === */}
          <div className="flex-1 relative min-w-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isStreaming ? "AI is thinking..." : "Ask anything..."}
              disabled={isStreaming}
              rows={rows}
              className={`
                w-full resize-none rounded-2xl px-5 sm:px-6 py-4 text-base
                bg-white/70 dark:bg-gray-900/70
                border border-gray-300/80 dark:border-gray-700/70
                shadow-inner
                focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/30 focus:shadow-lg
                placeholder:text-gray-500 dark:placeholder:text-gray-400
                text-gray-900 dark:text-gray-100
                transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600
              `}
              style={{ minHeight: "52px", maxHeight: "140px" }}
            />

            {/* Subtle character counter (optional but nice touch) */}
            {input.length > 0 && (
              <div className="absolute bottom-3 right-4 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                {input.length}
              </div>
            )}
          </div>

          {/* === Action Buttons === */}
          {isStreaming ? (
            <button
              onClick={onStop}
              title="Stop generation"
              className="
                flex-shrink-0 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14
                rounded-2xl bg-gradient-to-br from-red-600 to-rose-600
                hover:from-red-700 hover:to-rose-700
                active:scale-95 shadow-lg shadow-red-600/30
                transition-all duration-200
              "
            >
              <Square className="w-6 h-6 text-white fill-white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              title="Send message (Enter)"
              className={`
                flex-shrink-0 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14
                rounded-2xl transition-all duration-200
                ${input.trim()
                  ? "bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-600/30"
                  : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-60"
                }
                active:scale-95
              `}
            >
              <Send className="w-6 h-6 text-white" />
            </button>
          )}
        </div>

        {/* Hint row */}
        <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400 opacity-70 space-x-4">
          <span>
            Press <kbd className="px-2 py-1 bg-gray-200/70 dark:bg-gray-700/60 rounded text-gray-600 dark:text-gray-300 text-[11px] font-mono">Enter</kbd> to send
          </span>
          <span>•</span>
          <span>PDF, DOCX, TXT, MD • max 50MB</span>
        </div>
      </div>
    </div>
  );
}