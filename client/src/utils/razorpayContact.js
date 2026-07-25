/**
 * Converts common Indian mobile-number formats into Razorpay's documented
 * international format (+91XXXXXXXXXX).
 *
 * Foreign, missing or invalid numbers return an empty string. In that case the
 * contact key must be omitted so Razorpay Checkout can ask the customer for a
 * valid Indian number instead of rejecting the payment immediately.
 */
export const getRazorpayIndianContact = (phone) => {
  if (phone === null || phone === undefined) {
    return "";
  }

  const digits = String(phone).replace(/\D/g, "");

  let indianMobile = digits;

  if (digits.length === 12 && digits.startsWith("91")) {
    indianMobile = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    indianMobile = digits.slice(1);
  }

  if (!/^[6-9]\d{9}$/.test(indianMobile)) {
    return "";
  }

  return `+91${indianMobile}`;
};

/**
 * Builds a safe Razorpay prefill object. The contact field is included only
 * when the supplied value is a valid Indian mobile number.
 */
export const createRazorpayPrefill = ({
  name = "",
  email = "",
  phone = "",
  mobile = "",
  contact = "",
} = {}) => {
  const prefill = {
    name: String(name || "").trim(),
    email: String(email || "").trim(),
  };

  const indianContact = getRazorpayIndianContact(
    phone || mobile || contact
  );

  if (indianContact) {
    prefill.contact = indianContact;
  }

  return prefill;
};