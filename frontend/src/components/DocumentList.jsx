import { useEffect, useState, useCallback } from "react";
import { 
  Trash2, 
  FileText, 
  AlertCircle, 
  Loader2, 
  File, 
  FileSpreadsheet, 
  FileCode 
} from "lucide-react";

export default function DocumentList({ 
  onDocumentSelect, 
  documentsVersion = 0,
  onDocumentDeleted // optional callback after successful delete
}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Memoized fetch function
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("http://localhost:8000/api/documents", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setError("Could not load documents. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, documentsVersion]);

  const handleDelete = async (docId, e) => {
    e.stopPropagation(); // prevent triggering document select
    
    if (!window.confirm("Delete this document permanently?")) return;

    setDeletingId(docId);

    try {
      const res = await fetch(`http://localhost:8000/api/documents/${docId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      onDocumentDeleted?.(docId);
      
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete document. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    
    if (['pdf'].includes(ext)) return <FileText size={16} className="text-red-500" />;
    if (['xlsx', 'xls', 'csv'].includes(ext)) return <FileSpreadsheet size={16} className="text-green-600" />;
    if (['doc', 'docx'].includes(ext)) return <FileText size={16} className="text-blue-600" />;
    if (['txt', 'md', 'json'].includes(ext)) return <FileCode size={16} className="text-gray-600" />;
    
    return <File size={16} className="text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 py-2">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
        No documents uploaded yet
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
      {documents.map((doc) => {
        const isDeleting = deletingId === doc.id;
        
        return (
          <div
            key={doc.id}
            className={`
              group flex items-center justify-between p-2.5 rounded-lg
              hover:bg-gray-100 dark:hover:bg-gray-800/60
              transition-colors
              ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <button
              onClick={() => onDocumentSelect?.(doc)}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
              disabled={isDeleting}
            >
              {getFileIcon(doc.filename)}
              
              <div className="min-w-0 flex flex-col">
                <span 
                  className="text-xs font-medium truncate max-w-[220px]"
                  title={doc.filename}
                >
                  {doc.filename}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {doc.page_count || '?'} page{doc.page_count !== 1 ? 's' : ''}
                  {doc.uploaded_at && ` • ${new Date(doc.uploaded_at).toLocaleDateString()}`}
                </span>
              </div>
            </button>

            <button
              onClick={(e) => handleDelete(doc.id, e)}
              disabled={isDeleting}
              className={`
                p-1.5 rounded-lg transition-colors
                ${isDeleting 
                  ? 'text-gray-400' 
                  : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100'
                }
              `}
              title="Delete document"
              aria-label="Delete document"
            >
              {isDeleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}