// src/components/PdfViewer.jsx
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { X } from "lucide-react";

// Required for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PdfViewer({ doc, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  if (!doc) return null;

  const pdfUrl = `http://localhost:8000/api/documents/${doc.id}/view`;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-4 flex justify-between items-center shadow-lg">
        <h2 className="text-lg font-semibold truncate max-w-md">
          {doc.filename} ({doc.page_count} pages)
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <X size={24} />
        </button>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
        <div className="flex justify-center p-4">
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<div className="text-gray-500">Loading PDF...</div>}
            error={<div className="text-red-500">Failed to load PDF</div>}
          >
            <Page pageNumber={pageNumber} width={800} />
          </Document>
        </div>
      </div>

      {/* Controls */}
      {numPages && (
        <div className="bg-white dark:bg-gray-800 p-4 flex justify-center gap-4 items-center shadow-lg">
          <button
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber >= numPages}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}