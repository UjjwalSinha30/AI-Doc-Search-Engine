import { useEffect, useState } from "react";
import { Trash2, FileText, AlertCircle, Loader2 } from "lucide-react";

export default function DocumentList({ onDocumentSelect, documentsVersion = 0 }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = () => {
    setLoading(true);
    fetch("http://localhost:8000/api/documents", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setDocuments(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch documents:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentsVersion]);

  const handleDelete = async (docId, e) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;

    try {
      const res = await fetch(`http://localhost:8000/api/documents/${docId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
      } else {
        alert("Failed to delete document");
      }
    } catch (err) {
      alert("Error deleting document");
    }
  };

  const handleDocumentClick = (doc) => {
    onDocumentSelect?.(doc);
  };

  if (loading) {
    return <span className="text-sm text-gray-500 dark:text-gray-400">Loading documents...</span>;
  }

  if (documents.length === 0) {
    return <span className="text-sm text-gray-500 dark:text-gray-400 italic">No documents uploaded yet</span>;
  }

  return (
    <div className="space-y-1">
      {documents.map(doc => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition group"
        >
          <button 
            onClick={() => handleDocumentClick(doc)} 
            className="flex items-center gap-2 min-w-0 flex-1 text-left"
          >
            <span className="text-lg">📄</span>
            <span className="text-sm truncate max-w-[180px]" title={doc.filename}>
              {doc.filename}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({doc.page_count} pages)
            </span>
          </button>

          <button
            onClick={(e) => handleDelete(doc.id, e)}
            className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
            title="Delete document"
          >
            <Trash2 size={16} className="text-red-600 dark:text-red-400" />
          </button>
        </div>
      ))}
    </div>
  );
}