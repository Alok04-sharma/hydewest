import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="container-custom flex-grow flex flex-col md:flex-row py-8 gap-6">
        <aside className="w-full md:w-64 flex-shrink-0">
          <Sidebar type="guest" />
        </aside>
        <main className="flex-grow bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <Outlet />
        </main>
      </div>
    </div>
  );
}