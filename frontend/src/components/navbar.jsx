import { useState } from "react";
import { Bell, LogOut, Settings, User, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext"; // adjust path

export default function HeaderWithUserProfile({ user }) {
  const { logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const getInitials = () => {
    if (!user) return "??";
    const name = user.name || user.email || "";
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (name.charAt(0) || "?").toUpperCase();
  };
  

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';

  // Mock notifications
  const notifications = [
    { id: 1, text: "New document uploaded", time: "2m ago", unread: true },
    { id: 2, text: "User John shared a file", time: "1h ago", unread: true },
    { id: 3, text: "System maintenance scheduled", time: "3h ago", unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200/80 dark:border-gray-800/50 
                       bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl shadow-sm">
      <div className="flex items-center justify-between px-6 py-3.5">
        {/* Left side - Logo/Title (optional) */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-600 
                         dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            MindVault
          </h1>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/80 
                         transition-all duration-200 group"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 
                               dark:group-hover:text-indigo-400 transition-colors" 
                    strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full 
                                 ring-2 ring-white dark:ring-gray-950 animate-pulse" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl 
                             shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden
                             animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs font-medium px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 
                                     text-indigo-700 dark:text-indigo-300 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors 
                                 border-b border-gray-100 dark:border-gray-800 cursor-pointer
                                 ${notif.unread ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {notif.unread && (
                          <div className="h-2 w-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                            {notif.text}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {notif.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-gray-200 dark:border-gray-800">
                  <button className="w-full text-center text-sm font-medium text-indigo-600 
                                   dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 
                                   transition-colors">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-800" />

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 
                         dark:hover:bg-gray-800/80 transition-all duration-200 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 
                             flex items-center justify-center text-white font-semibold text-sm shadow-lg 
                             shadow-indigo-500/25 ring-2 ring-white/20 dark:ring-white/10">
                {getInitials()}
              </div>
              <span className="hidden sm:inline font-medium text-gray-700 dark:text-gray-200 
                             group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {displayName}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 
                                     ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl 
                             shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden
                             animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User Info */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 
                                   flex items-center justify-center text-white font-semibold shadow-lg 
                                   shadow-indigo-500/25 ring-2 ring-white/20 dark:ring-white/10">
                      {getInitials()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {displayName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                                   hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors 
                                   text-gray-700 dark:text-gray-300 group">
                    <User className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 
                                   dark:group-hover:text-indigo-400 transition-colors" 
                          strokeWidth={2} />
                    <span className="text-sm font-medium">View Profile</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                                   hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors 
                                   text-gray-700 dark:text-gray-300 group">
                    <Settings className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 
                                       dark:group-hover:text-indigo-400 transition-colors" 
                              strokeWidth={2} />
                    <span className="text-sm font-medium">Settings</span>
                  </button>
                </div>

                {/* Logout */}
                <div className="p-2 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                             hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors 
                             text-red-600 dark:text-red-400 group"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={2} />
                    <span className="text-sm font-medium">Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}