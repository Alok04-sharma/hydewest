import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserProfile, updateProfileThunk, logoutUser } from '../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error, successMessage } = useSelector((state) => state.auth);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!user) {
      dispatch(fetchUserProfile());
    } else {
      setName(user.name || '');
      setPhone(user.phone || '');
      setPreviewUrl(user.avatar?.url || user.avatar || '');
    }
  }, [dispatch, user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();

    // Prepare Payload
    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    const result = await dispatch(updateProfileThunk(formData));
    if (!result.error) {
      setIsEditing(false);
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-9 w-9 border-4 border-[#FF385C] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Banner Header */}
        <div className="h-32 bg-gradient-to-r from-[#FF385C] to-rose-400 p-6 flex items-end justify-between">
          <h1 className="text-2xl font-extrabold text-white drop-shadow">User Profile</h1>
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white rounded-full text-xs font-bold uppercase tracking-wider">
            Role: {user?.role || 'User'}
          </span>
        </div>

        {/* Profile Info Body */}
        {user && (
          <div className="p-6 sm:p-8 space-y-6">
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold">
                ✓ {successMessage}
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold">
                ✕ {error}
              </div>
            )}

            {/* Profile Avatar & Name Section */}
            <div className="flex items-center gap-5 pb-6 border-b border-gray-100">
              <div className="relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={user.name}
                    className="h-20 w-20 rounded-full object-cover border-2 border-[#FF385C] shadow"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-rose-100 text-[#FF385C] flex items-center justify-center font-extrabold text-3xl border-2 border-[#FF385C]">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900">{user.name || 'User Name'}</h2>
                <p className="text-sm text-gray-500 font-medium">{user.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">Mobile: {user.phone || 'Not added'}</p>
              </div>
            </div>

            {/* View Details Mode */}
            {!isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Full Name
                    </span>
                    <p className="text-sm font-bold text-gray-800">{user.name || 'Not provided'}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Phone Number
                    </span>
                    <p className="text-sm font-bold text-gray-800">{user.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="pt-4 flex justify-between items-center border-t border-gray-100">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs shadow transition active:scale-95 flex items-center gap-1.5"
                  >
                    ✏️ Edit Profile & Avatar
                  </button>

                  <button
                    onClick={handleLogout}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow transition active:scale-95"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              /* Edit Profile Form Mode */
              <form onSubmit={handleProfileSave} className="space-y-4 pt-2">
                <h3 className="text-base font-bold text-gray-900 border-b pb-2">Update Account Details</h3>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Profile Photo (Avatar)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="w-full text-xs p-2 border border-dashed border-gray-300 rounded-xl bg-gray-50 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-[#FF385C] hover:bg-[#E00B41] text-white font-bold rounded-xl text-xs shadow transition active:scale-95 disabled:opacity-50"
                  >
                    {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}