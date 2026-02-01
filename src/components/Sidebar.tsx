"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, VolunteersIcon, TasksIcon } from "./Icons";
import { useSidebar } from "@/context/SidebarContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { isOpen } = useSidebar();

  const isActive = (path: string) => pathname === path;

  const navItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: DashboardIcon,
    },
    {
      href: "/volunteers",
      label: "Volunteers",
      icon: VolunteersIcon,
    },
    {
      href: "/tasks",
      label: "Tasks",
      icon: TasksIcon,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 md:hidden z-30"
          onClick={() => {
            const event = new CustomEvent('toggleSidebar');
            window.dispatchEvent(event);
          }}
        />
      )}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-slate-900 border-r border-slate-700/50 shadow-lg flex flex-col transition-all duration-300 hidden md:flex ${
          isOpen ? "w-64" : "w-24"
        }`}
      >
      {/* Navigation Items */}
      <nav className="flex-1 transition-all duration-300 overflow-hidden">
        <div className={isOpen ? "p-4 space-y-1" : "p-2 space-y-2"}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.href}
                className={isOpen ? "" : "flex justify-center"}
              >
                <Link
                  href={item.href}
                  className={`flex items-center transition-all duration-150 relative group rounded-lg ${
                    isOpen ? "space-x-3 px-4 py-3" : "p-3"
                  } ${
                    isActive(item.href)
                      ? "bg-blue-600/20 text-blue-300 border-l-4 border-blue-500"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                  title={!isOpen ? item.label : undefined}
                >
                  <div
                    className={`w-6 h-6 flex items-center justify-center flex-shrink-0 transition-colors duration-150 ${
                      isActive(item.href)
                        ? "text-white"
                        : "text-slate-300 group-hover:text-cyan-400"
                    }`}
                  >
                    <Icon />
                  </div>
                  {isOpen && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
    </>
  );
}
