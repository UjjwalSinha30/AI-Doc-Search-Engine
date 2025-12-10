import { Home, Users, Settings, X } from "lucide-react";
import DarkModeToggle from "./DarkModeToggle";

export default function Sidebar({ closeSidebar }) {
  const navItems = [
    { name: "Home", icon: Home, href: "/" },
    { name: "Users", icon: Users, href: "/users" },
    { name: "Settings", icon: Settings, href: "/settings" },
  ];

  return (
    <aside className="w-64 h-full bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col p-4 shadow-lg">
      {/* Mobile Close Button */}
      <div className="flex justify-between items-center lg:hidden mb-6">
        <h1 className="text-2xl font-bold">My App</h1>
        <X
          className="w-6 h-6 cursor-pointer"
          onClick={closeSidebar}
        />
      </div>

      {/* Desktop title */}
      <h1 className="hidden lg:block text-2xl font-bold mb-6">My App</h1>

      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </a>
          );
        })}
      </nav>

      <DarkModeToggle />
    </aside>
  );
}
