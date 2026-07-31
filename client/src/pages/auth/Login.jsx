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
  useNavigate,
} from "react-router-dom";

import BrandLogo from "../../components/brand/BrandLogo";
import {
  clearAuthMessages,
  sendOTP,
} from "../../redux/slices/authSlice";

export default function Login() {
  const [
    email,
    setEmail,
  ] = useState("");

  const dispatch =
    useDispatch();

  const navigate =
    useNavigate();

  const {
    loading,
    error,
    successMessage,
  } = useSelector(
    (state) => state.auth
  );

  // Page open hone par purane authentication messages clear karta hai.
  useEffect(() => {
    dispatch(
      clearAuthMessages()
    );
  }, [dispatch]);

  // Registered email par login OTP request bhejta hai.
  const handleSubmit =
    async (event) => {
      event.preventDefault();

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      if (!normalizedEmail) {
        return;
      }

      try {
        await dispatch(
          sendOTP(
            normalizedEmail
          )
        ).unwrap();

        navigate(
          "/verify-otp",
          {
            replace: true,
          }
        );
      } catch {
        // Redux state request error already store karta hai.
      }
    };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* 
          Login branding:
          Logo image ke andar wordmark hone ke karan
          purana circular S icon remove kiya gaya hai.
        */}
        <Link
          to="/"
          className="flex justify-center"
          aria-label="Go to hydewest homepage"
        >
          <BrandLogo variant="auth" />
        </Link>

        <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
          Welcome to hydewest
        </h2>

        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your registered email address to receive an OTP.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-8 shadow-xl sm:px-10">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {successMessage &&
            !error && (
              <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {
                  successMessage
                }
              </div>
            )}

          <form
            className="space-y-6"
            onSubmit={
              handleSubmit
            }
          >
            <div>
              <label
                htmlFor="login-email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Registered Email
                Address
              </label>

              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(
                  event
                ) =>
                  setEmail(
                    event
                      .target
                      .value
                  )
                }
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 transition focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#FF385C] px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#E00B41] disabled:opacity-50"
            >
              {loading
                ? "Sending OTP..."
                : "Send OTP"}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center text-sm">
            <span className="text-gray-500">
              New to hydewest?{" "}
            </span>

            <Link
              to="/register"
              className="font-semibold text-[#FF385C] hover:underline"
            >
              Create an account
              first
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}