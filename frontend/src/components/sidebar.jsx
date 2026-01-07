import { useState } from "react";
import {
  Home,
  Users,
  Settings,
  X,
  FileText,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  UserCircle,
} from "lucide-react";
import DarkModeToggle from "./DarkModeToggle";
import DocumentList from "./DocumentList";

export default function Sidebar({
  closeSidebar,
  onDocumentSelect,
  documentsVersion = 0,
}) {
  const [showDocuments, setShowDocuments] = useState(true); // default open = better UX

  const mainNavItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      href: "/",
      active: true, // you can make this dynamic later
    },
    { name: "Users", icon: Users, href: "/users" },
    { name: "Documents", icon: FileText, isCollapsible: true },
    { name: "Settings", icon: Settings, href: "/settings" },
  ];

  return (
    <aside
      className={`
        w-72 h-full
        bg-gradient-to-b from-white via-white to-gray-50/40
        dark:from-gray-950 dark:via-gray-950 dark:to-gray-900/70
        border-r border-gray-200/60 dark:border-gray-800/60
        flex flex-col
        shadow-2xl shadow-black/5 dark:shadow-black/40
        transition-all duration-300 ease-in-out
        overflow-hidden
      `}
    >
      {/* Header / Brand */}
      <div className="p-5 border-b border-gray-200/60 dark:border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="
                h-10 w-10 rounded-2xl
                bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500
                flex items-center justify-center text-white
                font-bold text-xl shadow-lg shadow-indigo-500/30
                ring-1 ring-indigo-400/40 dark:ring-indigo-500/30
              "
            >
              MV
            </div>

            <h2
              className="
                text-2xl font-extrabold tracking-tight
                bg-gradient-to-r from-indigo-600 to-purple-600
                bg-clip-text text-transparent
              "
            >
              MindVault
            </h2>
          </div>

          {/* Mobile close button */}
          <button
            className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {mainNavItems.map((item) => {
          const Icon = item.icon;

          if (item.isCollapsible) {
            return (
              <div key={item.name} className="space-y-1">
                {/* Collapsible trigger */}
                <button
                  onClick={() => setShowDocuments(!showDocuments)}
                  className={`
                    group flex items-center justify-between w-full px-4 py-3.5 rounded-xl
                    font-medium transition-all duration-200
                    ${
                      showDocuments
                        ? "bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/30 text-indigo-800 dark:text-indigo-300"
                        : "text-gray-700 dark:text-gray-200 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40"
                    }
                  `}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon
                      size={20}
                      className={`
                        transition-colors
                        ${showDocuments
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"}
                      `}
                    />
                    <span>{item.name}</span>
                  </div>

                  <ChevronDown
                    size={16}
                    className={`
                      transition-transform duration-300
                      ${showDocuments ? "rotate-180" : ""}
                      ${showDocuments ? "text-indigo-600" : "text-gray-400 group-hover:text-indigo-600"}
                    `}
                  />
                </button>

                {/* Animated documents list */}
                <div
                  className={`
                    overflow-hidden transition-all duration-400 ease-in-out
                    ${showDocuments ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}
                  `}
                >
                  <div className="pl-8 pr-3 py-3 border-l-2 border-indigo-200/70 dark:border-indigo-900/50 ml-4">
                    <DocumentList
                      onDocumentSelect={onDocumentSelect}
                      documentsVersion={documentsVersion}
                    />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <a
              key={item.name}
              href={item.href}
              className={`
                group flex items-center gap-3.5 px-4 py-3.5 rounded-xl
                font-medium transition-all duration-200
                ${
                  item.active
                    ? "bg-gradient-to-r from-indigo-50 to-indigo-100/60 dark:from-indigo-950/50 dark:to-indigo-900/40 text-indigo-800 dark:text-indigo-300"
                    : "text-gray-700 dark:text-gray-200 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40"
                }
              `}
            >
              <Icon
                size={20}
                className={`
                  transition-colors
                  ${
                    item.active
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                  }
                `}
              />
              <span>{item.name}</span>
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/60 dark:border-gray-800/50 mt-auto">
        <div className="flex items-center justify-between gap-4">
          <DarkModeToggle />

          {/* Quick account access */}
          <button
            className="
              p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 
              transition-colors text-gray-600 dark:text-gray-300
            "
            title="Account & Profile"
          >
            <UserCircle size={22} />
          </button>
        </div>
      </div>
    </aside>
  );
}