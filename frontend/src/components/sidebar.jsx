import { useState } from "react";
import { Home, Users, Settings, X, FileText, ChevronDown, ChevronRight } from "lucide-react";
import DarkModeToggle from "./DarkModeToggle";
import DocumentList from "./DocumentList";

export default function Sidebar({ closeSidebar, onDocumentSelect }) {
  const [showDocuments, setShowDocuments] = useState(false);

  const navItems = [
    { name: "Home", icon: Home, href: "/" },
    { name: "Users", icon: Users, href: "/users" },
    { name: "Settings", icon: Settings, href: "/settings" },
    { name: "Documents", icon: FileText },
  ];

  return (
    <aside className="w-64 h-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex flex-col p-4 shadow-lg border-r border-gray-200 dark:border-gray-700">
      {/* Mobile Close Button */}
      <div className="flex justify-between items-center lg:hidden mb-6">
        <h1 className="text-2xl font-bold">My App</h1>
        <X className="w-6 h-6 cursor-pointer" onClick={closeSidebar} />
      </div>

      {/* Desktop title */}
      <h1 className="hidden lg:block text-2xl font-bold mb-6">My App</h1>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.name === "Documents") {
            return (
              <div key={item.name}>
                <button
                  onClick={() => setShowDocuments(!showDocuments)}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </div>
                  {showDocuments ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </button>

                {showDocuments && (
                  <div className="mt-2 pl-6 max-h-64 overflow-y-auto border-l-2 border-gray-300 dark:border-gray-700">
                    <DocumentList onDocumentSelect={onDocumentSelect} />
                  </div>
                )}
              </div>
            );
          }

          return (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </a>
          );
        })}
      </nav>

      {/* Dark Mode Toggle */}
      <div className="mt-auto">
        <DarkModeToggle />
      </div>
    </aside>
  );
}