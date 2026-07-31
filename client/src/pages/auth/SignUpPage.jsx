import React, {
  useEffect,
  useState,
} from "react";
import {
  useDispatch,
  useSelector,
} from "react-redux";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import BrandLogo from "../../components/brand/BrandLogo";
import {
  clearAuthMessages,
  registerUser,
} from "../../redux/slices/authSlice";
import { ROLES } from "../../constants/roles";

// ======================================
// Role based redirect path
// ======================================

const getDashboardPath = (
  user
) => {
  const role = String(
    user?.role || ""
  ).toLowerCase();

  if (
    role === ROLES.HOST
  ) {
    return "/host/dashboard";
  }

  if (
    role === ROLES.OWNER ||
    role ===
      ROLES.SUPER_ADMIN
  ) {
    return "/owner/dashboard";
  }

  return "/";
};

export default function SignUpPage() {
  const dispatch =
    useDispatch();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    loading,
    error,
    isAuthenticated,
    user,
  } = useSelector(
    (state) => state.auth
  );

  const [
    formData,
    setFormData,
  ] = useState({
    name: "",
    email: "",
    phone: "",
    role: ROLES.GUEST,
  });

  // Page open hone par old auth messages clear karta hai.
  useEffect(() => {
    dispatch(
      clearAuthMessages()
    );
  }, [dispatch]);

  // Already logged-in user ko uske dashboard par bhejta hai.
  useEffect(() => {
    if (
      isAuthenticated &&
      user
    ) {
      navigate(
        getDashboardPath(
          user
        ),
        {
          replace: true,
        }
      );
    }
  }, [
    isAuthenticated,
    user,
    navigate,
  ]);

  // Controlled form state update karta hai.
  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (currentData) => ({
        ...currentData,
        [name]: value,
      })
    );
  };

  // Guest ya Host account role select karta hai.
  const selectRole = (
    role
  ) => {
    setFormData(
      (currentData) => ({
        ...currentData,
        role,
      })
    );
  };

  // Registration form backend par submit karta hai.
  const handleSubmit =
    async (event) => {
      event.preventDefault();

      const payload = {
        name:
          formData.name.trim(),

        email:
          formData.email
            .trim()
            .toLowerCase(),

        phone:
          formData.phone.trim(),

        role:
          formData.role,

        referralCode:
          new URLSearchParams(
            location.search
          ).get("ref") ||
          localStorage.getItem(
            "hydewest_referral_code"
          ) ||
          "",
      };

      try {
        await dispatch(
          registerUser(
            payload
          )
        ).unwrap();

        navigate(
          "/verify-otp",
          {
            replace: true,
          }
        );
      } catch {
        // Redux state registration error already store karta hai.
      }
    };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* 
          Signup branding:
          Purana circular S icon remove karke real logo use kiya gaya hai.
        */}
        <Link
          to="/"
          className="flex justify-center"
          aria-label="Go to hydewest homepage"
        >
          <BrandLogo variant="auth" />
        </Link>

        <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
          Create your hydewest
          account
        </h2>

        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an
          account?{" "}

          <Link
            to="/login"
            className="font-semibold text-[#FF385C] hover:underline"
          >
            Login
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-8 shadow-xl sm:px-10">
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              <svg
                className="h-5 w-5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>

              <span>
                {error}
              </span>
            </div>
          )}

          <form
            className="space-y-5"
            onSubmit={
              handleSubmit
            }
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Full Name{" "}

                <span className="text-red-500">
                  *
                </span>
              </label>

              <input
                name="name"
                type="text"
                required
                value={
                  formData.name
                }
                onChange={
                  handleChange
                }
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email Address{" "}

                <span className="text-red-500">
                  *
                </span>
              </label>

              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                value={
                  formData.email
                }
                onChange={
                  handleChange
                }
                placeholder="name@example.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mobile Number
              </label>

              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                value={
                  formData.phone
                }
                onChange={
                  handleChange
                }
                placeholder="+91 9876543210"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Choose Account Type{" "}

                <span className="text-red-500">
                  *
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    selectRole(
                      ROLES.GUEST
                    )
                  }
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 transition ${
                    formData.role ===
                    ROLES.GUEST
                      ? "border-[#FF385C] bg-rose-50 font-semibold text-[#FF385C] ring-2 ring-[#FF385C]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="mb-1 text-lg">
                    🧳
                  </span>

                  <span className="text-xs">
                    Signup as Guest
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    selectRole(
                      ROLES.HOST
                    )
                  }
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 transition ${
                    formData.role ===
                    ROLES.HOST
                      ? "border-[#FF385C] bg-rose-50 font-semibold text-[#FF385C] ring-2 ring-[#FF385C]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="mb-1 text-lg">
                    🏡
                  </span>

                  <span className="text-xs">
                    Signup as Host
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl border border-transparent bg-[#FF385C] px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#E00B41] focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:ring-offset-2 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />

                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>

                  Creating
                  account...
                </span>
              ) : (
                "Submit & Register"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}