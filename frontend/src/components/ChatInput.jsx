import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Paperclip, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Square,
  FileText,
  Sparkles,
  AlertCircle
} from "lucide-react";

export default function ChatInput({ 
  onSend, 
  isStreaming = false, 
  onStop,
}) {
  const [input, setInput] = useState("");
  const [uploadStatus, setUploadStatus] = useState(null);
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

    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus("error");
      onSend?.(`Upload failed: File size exceeds 50MB limit`, {
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
      const response = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setUploadStatus("success");
      onSend?.(
        `✓ Successfully added "${file.name}"`,
        {
          type: "file",
          name: file.name,
          status: "success",
          skipAIResponse: true,
        }
      );

      setTimeout(() => {
        setUploadStatus(null);
        setUploadedFileName("");
      }, 3000);
    } catch (err) {
      setUploadStatus("error");
      const msg = err.message || "Upload failed. Please try again.";
      onSend?.(`✗ Upload failed: ${msg}`, {
        type: "file",
        status: "error"
      });
      setTimeout(() => {
        setUploadStatus(null);
        setUploadedFileName("");
      }, 5000);
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
      border-t border-gray-200/80 dark:border-gray-800/60
      bg-gradient-to-t from-white via-white/95 to-white/90
      dark:from-gray-950 dark:via-gray-950/95 dark:to-gray-900/90
      backdrop-blur-xl
      shadow-[0_-8px_30px_-8px_rgba(0,0,0,0.1)] 
      dark:shadow-[0_-8px_30px_-8px_rgba(0,0,0,0.4)]
      transition-all duration-300
    ">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        
        {/* Upload Status */}
        {uploadStatus && (
          <div className={`
            mb-4 px-4 py-3 rounded-xl flex items-center gap-3
            transition-all duration-300
            ${uploadStatus === "uploading" 
              ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50" 
              : uploadStatus === "success"
              ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50"
              : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50"
            }
          `}>
            {uploadStatus === "uploading" && (
              <>
                <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Processing document...
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 truncate mt-0.5">
                    {uploadedFileName}
                  </p>
                </div>
              </>
            )}
            {uploadStatus === "success" && (
              <>
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Document added successfully
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 truncate mt-0.5">
                    {uploadedFileName}
                  </p>
                </div>
              </>
            )}
            {uploadStatus === "error" && (
              <>
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    Upload failed
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    Please check file and try again
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Main Input Area */}
        <div className="relative flex items-end gap-3 sm:gap-4">

          {/* Upload Button */}
          <div 
            className="relative"
            onMouseEnter={() => setShowUploadHint(true)}
            onMouseLeave={() => setShowUploadHint(false)}
          >
            <label className="group relative cursor-pointer">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.txt,.docx,.md,.csv"
                className="hidden"
                disabled={isStreaming || uploadStatus === "uploading"}
              />
              <div className={`
                flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14
                rounded-2xl transition-all duration-200
                ${isStreaming || uploadStatus === "uploading"
                  ? "opacity-40 cursor-not-allowed" 
                  : "hover:scale-105 active:scale-95"
                }
                ${uploadStatus === "uploading" 
                  ? "bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-400/50" 
                  : "bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-800/60 hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-950/40 dark:hover:to-purple-950/40 shadow-lg hover:shadow-xl"
                }
              `}>
                <Paperclip className={`
                  w-6 h-6 transition-colors
                  ${uploadStatus === "uploading"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                  }
                `} />
              </div>
            </label>

            {/* Upload Tooltip */}
            {showUploadHint && !uploadStatus && (
              <div className="
                absolute -top-24 left-1/2 -translate-x-1/2 w-64
                px-4 py-3 bg-gray-900/95 dark:bg-gray-800/95 rounded-xl
                shadow-2xl backdrop-blur-sm z-50
              ">
                <div className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white text-xs font-semibold mb-1">
                      Add Document
                    </p>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      Upload files to let AI use your documents
                    </p>
                  </div>
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900/95 dark:bg-gray-800/95 rotate-45" />
              </div>
            )}
          </div>

          {/* Textarea */}
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
              placeholder={isStreaming ? "AI is thinking..." : "Type your message..."}
              disabled={isStreaming}
              rows={rows}
              className={`
                w-full resize-none rounded-2xl px-5 sm:px-6 py-4 text-base
                bg-white dark:bg-gray-900/70
                border-2 border-gray-200 dark:border-gray-800
                shadow-inner
                focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 focus:shadow-xl
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                text-gray-900 dark:text-gray-100
                transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600
              `}
              style={{ minHeight: "56px", maxHeight: "160px" }}
            />

            {isStreaming && (
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-full border border-indigo-200 dark:border-indigo-800">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  AI thinking...
                </span>
              </div>
            )}

            {input.length > 0 && !isStreaming && (
              <div className="absolute bottom-4 right-4 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                {input.length}
              </div>
            )}
          </div>

          {/* Send / Stop Button */}
          {isStreaming ? (
            <button
              onClick={onStop}
              title="Stop generation"
              className="
                flex-shrink-0 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14
                rounded-2xl bg-gradient-to-br from-red-500 to-rose-600
                hover:from-red-600 hover:to-rose-700
                active:scale-95 shadow-xl shadow-red-500/30
                transition-all duration-200 group
                ring-2 ring-red-400/30
              "
            >
              <Square className="w-5 h-5 text-white fill-white group-hover:scale-110 transition-transform" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              title="Send message (Enter)"
              className={`
                flex-shrink-0 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14
                rounded-2xl transition-all duration-200 group
                ${input.trim()
                  ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-xl shadow-indigo-500/30 ring-2 ring-indigo-400/30"
                  : "bg-gray-200 dark:bg-gray-800 cursor-not-allowed opacity-50"
                }
                active:scale-95
              `}
            >
              <Send className={`
                w-5 h-5 text-white transition-transform
                ${input.trim() ? 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5' : ''}
              `} />
            </button>
          )}
        </div>

        {/* Bottom hints */}
        <div className="mt-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300 font-mono text-[10px] border border-gray-300 dark:border-gray-700">
                Enter
              </kbd>
              <span>to send</span>
            </span>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300 font-mono text-[10px] border border-gray-300 dark:border-gray-700">
                Shift+Enter
              </kbd>
              <span>new line</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>PDF, DOCX, TXT, MD, CSV • max 50MB</span>
          </div>
        </div>
      </div>
    </div>
  );
}