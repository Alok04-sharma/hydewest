import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logoutThunk } from '../../redux/slices/authSlice';

export default function Topbar({ role }) {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <div className="font-bold text-lg text-gray-800">{role} Portal</div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600">{user?.email}</span>
        <button onClick={() => dispatch(logoutThunk())} className="btn-secondary text-xs">
          Logout
        </button>
      </div>
    </header>
  );
}