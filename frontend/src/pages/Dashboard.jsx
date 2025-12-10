import { useState } from "react";
import HeaderWithUserProfile from "../components/navbar";
import Sidebar from "../components/sidebar";
import { Menu } from "lucide-react";
import ChatInput from "../components/ChatInput";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      
      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 transform lg:translate-x-0 
        transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar closeSidebar={() => setSidebarOpen(false)} />
      </div>

      {/* MAIN SECTION */}
      <div className="flex-1 flex flex-col">

        {/* MOBILE HEADER */}
        <div className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800 
            border-b dark:border-gray-700 lg:hidden">
          <Menu
            className="w-6 h-6 text-gray-700 dark:text-gray-300 cursor-pointer"
            onClick={() => setSidebarOpen(true)}
          />
          <h1 className="text-xl font-semibold dark:text-white">Dashboard</h1>
        </div>

        {/* DESKTOP HEADER */}
        <div className="hidden lg:block">
          <HeaderWithUserProfile />
        </div>

        {/* CHAT AREA (scrollable) */}
        <div className="flex-1 overflow-auto p-6 pb-32">
          {/* Messages go here */}
          <h1 className="text-2xl font-semibold dark:text-white mb-4">Chat</h1>

          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              Example message...
            </div>
          </div>
        </div>

        {/* CHAT INPUT FIXED AT BOTTOM */}
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-gray-50 
            dark:bg-gray-900 border-t dark:border-gray-700">
          <div className="max-w-4xl mx-auto">
            <ChatInput />
          </div>
        </div>

      </div>
    </div>
  );
}
