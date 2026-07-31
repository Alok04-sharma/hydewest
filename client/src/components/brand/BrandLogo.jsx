import React, { useState } from "react";

// ======================================
// Global brand logo path
// ======================================

const LOGO_PATH = "/images/logo.WEBP";

// ======================================
// Responsive logo dimensions
// ======================================

const sizeClasses = {
  navbar:
    "h-9 max-w-[145px] sm:h-10 sm:max-w-[175px] lg:h-11 lg:max-w-[195px]",

  auth:
    "h-16 max-w-[205px] sm:h-20 sm:max-w-[245px]",
};

export default function BrandLogo({
  variant = "navbar",
  showText = false,
  className = "",
  imageClassName = "",
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const logoSizeClass =
    sizeClasses[variant] ||
    sizeClasses.navbar;

  // ======================================
  // Variant based logo container
  // ======================================

  const surfaceClass =
    variant === "navbar"
      ? [
          "rounded-xl",
          "bg-white/95",
          "px-2",
          "py-1",
          "shadow-[0_10px_30px_rgba(0,0,0,.18)]",
        ].join(" ")
      : [
          // Login aur Signup page ke light background ke saath blended container.
          "rounded-[26px]",
          "border",
          "border-slate-200/75",
          "bg-white/75",
          "px-5",
          "py-3",
          "shadow-[0_12px_32px_rgba(15,23,42,.055)]",
          "backdrop-blur-sm",
          "sm:rounded-[30px]",
          "sm:px-6",
          "sm:py-3.5",
        ].join(" ");

  return (
    <span
      className={`inline-flex min-w-0 items-center justify-center gap-2 ${surfaceClass} ${className}`}
      aria-label="hydewest"
    >
      {!imageFailed ? (
        <img
          src={LOGO_PATH}
          alt="hydewest"
          loading="eager"
          decoding="async"
          onError={() => setImageFailed(true)}
          className={`${logoSizeClass} w-auto shrink-0 object-contain ${imageClassName}`}
        />
      ) : (
        // Logo path wrong hone par fallback brand icon dikhega.
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ff385c] to-[#a90838] text-base font-black text-white shadow-lg shadow-rose-950/30">
          h
        </span>
      )}

      {/* Icon-only logo ke liye showText true kiya ja sakta hai. */}
      {showText && (
        <span className="truncate text-xl font-black lowercase tracking-tight text-current">
          hydewest
        </span>
      )}
    </span>
  );
}