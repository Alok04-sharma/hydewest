import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import Sidebar from '../components/layout/Sidebar';

export default function HostLayout() {
  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar type="host" />
      <div className="flex-grow flex flex-col min-w-0">
        <Topbar role="Host" />
        <main className="p-6 flex-grow overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}