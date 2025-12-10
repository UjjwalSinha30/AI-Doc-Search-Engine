import { useState, useRef, useEffect } from "react";
import { Menu, Bell, LogOut, User } from "lucide-react";

export default function HeaderWithUserProfile() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 flex items-center justify-between shadow-sm">
      
      {/* Left — Logo + Mobile Menu Button */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <Menu className="w-6 h-6 cursor-pointer dark:text-white md:hidden" />

        {/* App Name (Hide on very small screens) */}
        <h1 className="text-lg md:text-xl font-semibold dark:text-white hidden sm:block">
          My App
        </h1>
      </div>

      {/* Right — Icons + Profile */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Notification Icon */}
        <Bell className="w-6 h-6 cursor-pointer text-gray-600 dark:text-gray-300" />

        {/* User Profile */}
        <div className="relative" ref={dropdownRef}>
          <img
            src="https://i.pravatar.cc/40"
            alt="User Avatar"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full cursor-pointer"
            onClick={() => setOpen(!open)}
          />

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white dark:bg-gray-800 shadow-lg rounded-lg border dark:border-gray-700 py-2 text-sm">
              <div className="px-4 py-2 border-b dark:border-gray-700">
                <p className="font-medium dark:text-white">John Doe</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  johndoe@gmail.com
                </p>
              </div>

              <button className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white">
                <User size={16} /> My Profile
              </button>

              <button className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white">
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
