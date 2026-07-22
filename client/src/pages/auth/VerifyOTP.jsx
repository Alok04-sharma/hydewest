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

  if (role === ROLES.OWNER || role === ROLES.SUPER_ADMIN) {
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
    otpSentEmail || sessionStorage.getItem("login_email") || "";

  useEffect(() => {
    dispatch(clearAuthMessages());
  }, [dispatch]);

  useEffect(() => {
    if (!activeEmail && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [activeEmail, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDashboardPath(user), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleOTPChange = (event) => {
    const numericOTP = event.target.value.replace(/\D/g, "").slice(0, 6);
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

      navigate(getDashboardPath(result.user), { replace: true });
    } catch {
      // Error Redux state me set ho chuka hai.
    }
  };

  const handleResendOTP = async () => {
    if (!activeEmail) {
      navigate("/login", { replace: true });
      return;
    }

    setOtp("");

    try {
      await dispatch(sendOTP(activeEmail)).unwrap();
    } catch {
      // Error Redux state me set ho chuka hai.
    }
  };

  if (!activeEmail && !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-[#FF385C] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            🔑
          </div>
        </div>

        <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
          Enter OTP Code
        </h2>

        <p className="mt-2 text-center text-sm text-gray-600">
          OTP humne{" "}
          <span className="font-semibold text-gray-900">{activeEmail}</span>
          {" "}par bhej diya hai
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {successMessage && !error && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
              {successMessage}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="login-otp"
                className="block text-center text-sm font-medium text-gray-700 mb-2"
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
                className="w-full text-center tracking-[0.5em] text-2xl font-bold py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-[#FF385C] hover:bg-[#E00B41] transition disabled:opacity-50"
            >
              {loading ? "Verifying OTP..." : "Verify & Login"}
            </button>
          </form>

          <button
            type="button"
            disabled={loading}
            onClick={handleResendOTP}
            className="w-full mt-4 text-sm font-semibold text-[#FF385C] hover:underline disabled:opacity-50"
          >
            Resend OTP
          </button>
        </div>
      </div>
    </div>
  );
}
