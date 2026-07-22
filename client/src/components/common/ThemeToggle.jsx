import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme } from '../../redux/slices/themeSlice';

export default function ThemeToggle() {
  const { mode } = useSelector((state) => state.theme);
  const dispatch = useDispatch();

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleTheme())}
      className="p-2.5 rounded-full transition-all duration-300 border bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-yellow-400 shadow-sm cursor-pointer"
      title={`Switch to ${mode === 'light' ? 'Dark' : 'Light'} Mode`}
      aria-label="Toggle Theme"
    >
      {mode === 'light' ? (
        /* Moon Icon for Light Mode */
        <svg className="w-5 h-5 fill-current text-gray-700" viewBox="0 0 24 24">
          <path d="M21.64 13a1 1 0 00-1.05-.14 8.05 8.05 0 01-3.37.73A8.15 8.15 0 019.08 5.49a8.59 8.59 0 01.25-2A1 1 0 008 2.36 10.14 10.14 0 1022 14.05a1 1 0 00-.36-1.05z" />
        </svg>
      ) : (
        /* Sun Icon for Dark Mode */
        <svg className="w-5 h-5 fill-current text-yellow-400" viewBox="0 0 24 24">
          <path d="M12 7a5 5 0 100 10 5 5 0 000-10zM2 13h2a1 1 0 000-2H2a1 1 0 000 2zm18 0h2a1 1 0 000-2h-2a1 1 0 000 2zm-9-8a1 1 0 001-1V2a1 1 0 00-2 0v2a1 1 0 001 1zm0 14a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1zM5.64 7.05a1 1 0 00.7.29 1 1 0 00.71-.29 1 1 0 000-1.41l-1.41-1.42a1 1 0 00-1.42 1.42l1.42 1.4zm12.72 12.72a1 1 0 00.7.29 1 1 0 00.71-.29 1 1 0 000-1.41l-1.41-1.42a1 1 0 00-1.42 1.42l1.42 1.4zm-12.72 0l-1.42 1.4a1 1 0 000 1.42 1 1 0 00.71.29 1 1 0 00.7-.29l1.42-1.41a1 1 0 00-1.41-1.41zM18.36 7.05l1.42-1.41a1 1 0 10-1.42-1.42l-1.41 1.42a1 1 0 000 1.41 1 1 0 001.41 0z" />
        </svg>
      )}
    </button>
  );
}