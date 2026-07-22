import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { clearAuthMessages, sendOTP } from "../../redux/slices/authSlice";

export default function Login() {
  const [email, setEmail] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, successMessage } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    dispatch(clearAuthMessages());
  }, [dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return;
    }

    try {
      await dispatch(sendOTP(normalizedEmail)).unwrap();
      navigate("/verify-otp", { replace: true });
    } catch {
      // Error Redux state me set ho chuka hai.
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-[#FF385C] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            S
          </div>
        </div>

        <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
          Welcome to StayNest
        </h2>

        <p className="mt-2 text-center text-sm text-gray-600">
          Apna registered Email daal kar OTP praapt karein
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
                htmlFor="login-email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Registered Email Address
              </label>

              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C] transition text-gray-800 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-[#FF385C] hover:bg-[#E00B41] transition disabled:opacity-50"
            >
              {loading ? "OTP Bheja Ja Raha Hai..." : "Send OTP"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm border-t border-gray-100 pt-5">
            <span className="text-gray-500">Naye user hain? </span>
            <Link
              to="/register"
              className="font-semibold text-[#FF385C] hover:underline"
            >
              Pehle Register/Signup karein
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
