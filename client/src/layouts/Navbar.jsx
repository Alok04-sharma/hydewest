import React from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  useDispatch,
  useSelector,
} from "react-redux";
import { logoutThunk } from "../redux/slices/authSlice";
import { ROUTES } from "../constants/routes";

export default function Navbar() {
  const { isAuthenticated, user } =
    useSelector((state) => state.auth);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Navbar Explore action: sabhi account types ke liye listing section tak smooth navigation karega.
  const handleExploreListings = (event) => {
    event.preventDefault();

    if (location.pathname !== ROUTES.HOME) {
      navigate(
        `${ROUTES.HOME}#home-properties`
      );
      return;
    }

    document
      .getElementById("home-properties")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate(ROUTES.HOME);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="container-custom flex h-16 items-center justify-between">
        <Link
          to={ROUTES.HOME}
          className="text-2xl font-bold text-[#FF385C]"
        >
          hydewest
        </Link>

        <nav className="flex items-center gap-4">
          {/* Navbar Explore link: homepage listing section ko open karega. */}
          <Link
            to={`${ROUTES.HOME}#home-properties`}
            onClick={handleExploreListings}
            className="text-sm font-medium text-gray-600 hover:text-black"
          >
            Explore
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to={ROUTES.TRIPS}
                className="text-sm font-medium text-gray-600 hover:text-black"
              >
                My Trips
              </Link>

              <Link
                to={ROUTES.WISHLIST}
                className="text-sm font-medium text-gray-600 hover:text-black"
              >
                Wishlist
              </Link>

              <div className="border-l border-gray-300 pl-4 text-sm font-semibold">
                {user?.email} ({user?.role})
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="btn-secondary text-xs"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to={ROUTES.LOGIN}
              className="btn-primary text-sm"
            >
              Log in / Sign up
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}