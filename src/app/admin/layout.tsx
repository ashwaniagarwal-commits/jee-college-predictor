'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Upload,
  Menu,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;
  const isReportActive = () => pathname.startsWith('/admin/reports');

  const reportItems = [
    { name: 'BU-Region', path: '/admin/reports/bu-region' },
    { name: 'Top Percentile', path: '/admin/reports/top-percentile' },
    { name: 'AIR Buckets', path: '/admin/reports/air-bucket' },
    { name: 'Advanced Qualifiers', path: '/admin/reports/advanced-qualifiers' },
    { name: 'Session Improvement', path: '/admin/reports/session-improvement' },
    { name: 'BU Totals', path: '/admin/reports/bu-totals' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`fixed md:relative top-0 left-0 h-screen bg-[#1a1a2e] text-white transition-transform duration-300 z-40 ${
          sidebarOpen ? 'w-64' : 'w-0 md:w-64'
        } overflow-hidden`}
      >
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold">Admin Panel</h2>
        </div>

        <nav className="p-4 space-y-2">
          {/* Dashboard */}
          <Link href="/admin">
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/admin')
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </button>
          </Link>

          {/* Reports */}
          <div>
            <button
              onClick={() => setReportsOpen(!reportsOpen)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isReportActive()
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <BarChart3 size={20} />
              <span>Reports</span>
              <span
                className={`ml-auto transition-transform ${
                  reportsOpen ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </button>

            {reportsOpen && (
              <div className="ml-6 mt-2 space-y-1">
                {reportItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <button
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                        isActive(item.path)
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      {item.name}
                    </button>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Mapping Upload */}
          <Link href="/admin/mapping">
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/admin/mapping')
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Upload size={20} />
              <span>Mapping Upload</span>
            </button>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-gray-700 hover:text-gray-900"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-lg">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
              A
            </div>
            <span className="text-sm font-semibold text-gray-700">Ashwin</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          {children}
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
