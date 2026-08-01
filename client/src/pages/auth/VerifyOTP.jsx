import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  clearAuthMessages,
  sendOTP,
  verifyOTP,
} from "../../redux/slices/authSlice";

import { ROLES } from "../../constants/roles";

const getDashboardPath = (user) => {
  const role = String(user?.role || "").toLowerCase();

  if (role === ROLES.HOST) {
    return "/host/dashboard";
  }

  if (
    role === ROLES.OWNER ||
    role === ROLES.SUPER_ADMIN
  ) {
    return "/owner/dashboard";
  }

  return "/";
};

export default function VerifyOTP() {
  const [otp, setOtp] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    loading,
    error,
    successMessage,
    otpSentEmail,
    isAuthenticated,
    user,
  } = useSelector((state) => state.auth);

  const activeEmail =
    otpSentEmail ||
    sessionStorage.getItem("login_email") ||
    "";

  useEffect(() => {
    dispatch(clearAuthMessages());
  }, [dispatch]);

  useEffect(() => {
    if (!activeEmail && !isAuthenticated) {
      navigate("/login", {
        replace: true,
      });
    }
  }, [
    activeEmail,
    isAuthenticated,
    navigate,
  ]);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDashboardPath(user), {
        replace: true,
      });
    }
  }, [
    isAuthenticated,
    user,
    navigate,
  ]);

  const handleOTPChange = (event) => {
    const numericOTP = event.target.value
      .replace(/\D/g, "")
      .slice(0, 6);

    setOtp(numericOTP);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!activeEmail || otp.length !== 6) {
      return;
    }

    try {
      const result = await dispatch(
        verifyOTP({
          email: activeEmail,
          otp,
        })
      ).unwrap();

      navigate(getDashboardPath(result.user), {
        replace: true,
      });
    } catch {
      // Request error Redux state mein available hai.
    }
  };

  const handleResendOTP = async () => {
    if (!activeEmail) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    setOtp("");

    try {
      await dispatch(
        sendOTP(activeEmail)
      ).unwrap();
    } catch {
      // Request error Redux state mein available hai.
    }
  };

  if (!activeEmail && !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF385C] text-2xl font-bold text-white shadow-lg">
            🔑
          </div>
        </div>

        <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
          Enter OTP Code
        </h2>

        <p className="mt-2 text-center text-sm text-gray-600">
          We sent an OTP to{" "}
          <span className="break-all font-semibold text-gray-900">
            {activeEmail}
          </span>
          .
        </p>

        <div className="mx-auto mt-4 max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-semibold leading-5 text-amber-800">
          Didn&apos;t receive the OTP? Please check your
          Spam or Promotions folder.
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-8 shadow-xl sm:px-10">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {successMessage && !error && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <form
            className="space-y-6"
            onSubmit={handleSubmit}
          >
            <div>
              <label
                htmlFor="login-otp"
                className="mb-2 block text-center text-sm font-medium text-gray-700"
              >
                6-Digit Security Code
              </label>

              <input
                id="login-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={otp}
                onChange={handleOTPChange}
                placeholder="• • • • • •"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
              />
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                otp.length !== 6
              }
              className="w-full rounded-xl bg-[#FF385C] px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#E00B41] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Verifying OTP..."
                : "Verify & Login"}
            </button>
          </form>

          <button
            type="button"
            disabled={loading}
            onClick={handleResendOTP}
            className="mt-4 w-full text-sm font-semibold text-[#FF385C] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Resend OTP
          </button>
        </div>
      </div>
    </div>
  );
}