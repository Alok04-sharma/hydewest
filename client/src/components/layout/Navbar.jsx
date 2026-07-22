import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme } from '../../redux/slices/themeSlice';
import { logoutThunk } from '../../redux/slices/authSlice';
import { ROUTES } from '../../constants/routes';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { mode } = useSelector((state) => state.theme);
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    setMenuOpen(false);
    navigate(ROUTES.HOME);
  };

  const rawRole = (user?.role || '').toLowerCase().trim();
  const isSuperAdmin = rawRole === 'super admin' || rawRole === 'admin' || rawRole === 'owner';
  const isHost = rawRole === 'host' || user?.isHost;

  const displayRoleLabel = isSuperAdmin ? 'SUPER ADMIN' : isHost ? 'HOST' : 'GUEST';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/75 dark:bg-gray-900/75 border-b border-gray-200/50 dark:border-gray-800 transition-colors">
      <div className="container-custom mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        
        {/* BRAND LOGO */}
        <Link to={ROUTES.HOME} className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF385C] to-rose-500 flex items-center justify-center text-white font-bold shadow-md shadow-rose-500/20">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 32 32">
              <path d="M16 1c2 0 3.5 1.5 3.5 3.5 0 2.3-2.1 5.3-3.5 7.1-1.4-1.8-3.5-4.8-3.5-7.1C12.5 2.5 14 1 16 1zm0 13c3.9 0 7.5 2.1 9.5 5.5.9 1.5 1.5 3.3 1.5 5.2 0 3.5-2.8 6.3-6.3 6.3H11.3C7.8 31 5 28.2 5 24.7c0-1.9.6-3.7 1.5-5.2C8.5 16.1 12.1 14 16 14z" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white hidden sm:inline">
            Stay<span className="text-[#FF385C]">Nest</span>
          </span>
        </Link>

        {/* RIGHT ACTION CONTROLS */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Theme Switcher Toggle */}
          <button
            onClick={() => dispatch(toggleTheme())}
            className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:scale-105 active:scale-95 transition-all"
            title="Toggle Theme"
          >
            {mode === 'dark' ? '☀️' : '🌙'}
          </button>

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 pl-3 border border-gray-200 dark:border-gray-700 rounded-full hover:shadow-md transition-all bg-white dark:bg-gray-800"
              >
                <div className="flex flex-col text-right hidden sm:block pr-1">
                  <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                    {user?.name || user?.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase text-[#FF385C]">
                    {displayRoleLabel}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF385C] to-rose-400 text-white font-bold flex items-center justify-center text-xs">
                  {user?.email?.[0].toUpperCase() || 'A'}
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Signed in as</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-rose-500/10 text-[#FF385C] text-[10px] font-black rounded-md uppercase">
                      Role: {displayRoleLabel}
                    </span>
                  </div>

                  <div className="py-1">
                    {isSuperAdmin && (
                      <Link
                        to="/owner/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      >
                        👑 Super Admin Panel
                      </Link>
                    )}

                    {(isHost || isSuperAdmin) && (
                      <Link
                        to="/host/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        🏡 Host Dashboard
                      </Link>
                    )}

                    <Link
                      to="/dashboard/guest"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      🧳 Guest Dashboard
                    </Link>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to={ROUTES.LOGIN}
                className="px-4 py-2 rounded-full font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FF385C] to-rose-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-500/20 hover:opacity-95 transition-all"
              >
                Sign Up
              </Link>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}