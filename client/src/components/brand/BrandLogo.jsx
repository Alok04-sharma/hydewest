import React, {
  useEffect,
  useState,
} from "react";

// ======================================
// Transparent Hydewest logo
// ======================================

const LOGO_PATH =
  "/images/logo-transparent.webp";

// ======================================
// Existing responsive logo dimensions
// ======================================

const sizeClasses = {
  navbar:
    "h-9 max-w-[145px] sm:h-10 sm:max-w-[175px] lg:h-11 lg:max-w-[195px]",

  auth:
    "h-16 max-w-[205px] sm:h-20 sm:max-w-[245px]",
};

// ======================================
// Existing outer spacing
//
// Background, border, radius and shadow
// intentionally removed so the logo blends
// directly with its surrounding page/navbar.
// ======================================

const wrapperClasses = {
  navbar:
    "px-2 py-1",

  auth:
    "px-5 py-3 sm:px-6 sm:py-3.5",
};

// ======================================
// Navbar logo mask
//
// The transparent logo shape is used as a mask.
// This keeps "hyde" visible on the dark navbar
// while retaining the red "west" portion.
//
// No rectangular image background is rendered.
// ======================================

const navbarLogoStyle = {
  background:
    "linear-gradient(90deg, #f8fafc 0%, #f8fafc 50.1%, #ed1c24 50.1%, #ed1c24 100%)",

  WebkitMaskImage:
    `url("${LOGO_PATH}")`,

  maskImage:
    `url("${LOGO_PATH}")`,

  WebkitMaskRepeat:
    "no-repeat",

  maskRepeat:
    "no-repeat",

  WebkitMaskPosition:
    "center",

  maskPosition:
    "center",

  WebkitMaskSize:
    "contain",

  maskSize:
    "contain",
};

export default function BrandLogo({
  variant = "navbar",
  showText = false,
  className = "",
  imageClassName = "",
}) {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false);

  const logoSizeClass =
    sizeClasses[variant] ||
    sizeClasses.navbar;

  const wrapperClass =
    wrapperClasses[variant] ||
    wrapperClasses.navbar;

  // Verify that the transparent asset exists.
  useEffect(() => {
    const image =
      new Image();

    image.onload = () => {
      setImageFailed(false);
    };

    image.onerror = () => {
      setImageFailed(true);
    };

    image.src =
      LOGO_PATH;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, []);

  return (
    <span
      className={`inline-flex min-w-0 items-center justify-center gap-2 bg-transparent ${wrapperClass} ${className}`}
      aria-label="hydewest"
    >
      {!imageFailed ? (
        variant === "navbar" ? (
          /*
            Navbar:
            Transparent mask logo directly blends
            into the dark glass navbar.

            The aspect ratio matches the original
            1024 × 355 logo dimensions.
          */
          <span
            role="img"
            aria-label="hydewest"
            className={`${logoSizeClass} aspect-[1024/355] w-auto shrink-0 ${imageClassName}`}
            style={
              navbarLogoStyle
            }
          />
        ) : (
          /*
            Login/Register:
            Original dark-red transparent logo
            directly blends with the light page.
          */
          <img
            src={LOGO_PATH}
            alt="hydewest"
            loading="eager"
            decoding="async"
            onError={() =>
              setImageFailed(
                true
              )
            }
            className={`${logoSizeClass} w-auto shrink-0 object-contain ${imageClassName}`}
          />
        )
      ) : (
        /*
          Asset fallback:
          Plain text only, without any box,
          background, border or shadow.
        */
        <span className="inline-flex items-baseline whitespace-nowrap font-serif text-2xl font-black tracking-[-0.06em] sm:text-3xl">
          <span className="text-current">
            hyde
          </span>

          <span className="text-[#ed1c24]">
            west
          </span>
        </span>
      )}

      {showText && (
        <span className="truncate text-xl font-black lowercase tracking-tight text-current">
          hydewest
        </span>
      )}
    </span>
  );
}