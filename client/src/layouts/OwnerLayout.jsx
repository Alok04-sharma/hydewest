import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import Sidebar from '../components/layout/Sidebar';

export default function OwnerLayout() {
  return (
    <div className="min-h-screen flex bg-gray-900 text-gray-100">
      <Sidebar type="owner" />
      <div className="flex-grow flex flex-col min-w-0">
        <Topbar role="Owner" />
        <main className="p-6 flex-grow overflow-y-auto bg-gray-800">
          <Outlet />
        </main>
      </div>
    </div>
  );
}