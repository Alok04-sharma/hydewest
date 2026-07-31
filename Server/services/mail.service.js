const BREVO_EMAIL_ENDPOINT =
  "https://api.brevo.com/v3/smtp/email";

// ======================================
// Brevo configuration
// ======================================

const getMailConfiguration =
  () => {
    const provider =
      String(
        process.env
          .MAIL_PROVIDER ||
          ""
      )
        .trim()
        .toLowerCase();

    const apiKey =
      String(
        process.env
          .BREVO_API_KEY ||
          ""
      ).trim();

    const senderEmail =
      String(
        process.env
          .MAIL_FROM_EMAIL ||
          ""
      )
        .trim()
        .toLowerCase();

    const senderName =
      String(
        process.env
          .MAIL_FROM_NAME ||
          "hydewest"
      ).trim() ||
      "hydewest";

    if (
      provider !== "brevo"
    ) {
      const error =
        new Error(
          "MAIL_PROVIDER must be set to brevo."
        );

      error.code =
        "INVALID_MAIL_PROVIDER";

      throw error;
    }

    if (!apiKey) {
      const error =
        new Error(
          "BREVO_API_KEY is missing."
        );

      error.code =
        "BREVO_API_KEY_MISSING";

      throw error;
    }

    if (!senderEmail) {
      const error =
        new Error(
          "MAIL_FROM_EMAIL is missing."
        );

      error.code =
        "MAIL_FROM_EMAIL_MISSING";

      throw error;
    }

    return {
      apiKey,
      senderEmail,
      senderName,
    };
  };

// ======================================
// Privacy-safe email logs
// ======================================

const maskEmail = (
  email
) => {
  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  const [
    username = "",
    domain = "",
  ] =
    normalizedEmail.split(
      "@"
    );

  if (
    !username ||
    !domain
  ) {
    return "invalid-email";
  }

  const visibleCharacters =
    username.slice(0, 2);

  return `${visibleCharacters}${"*".repeat(
    Math.max(
      username.length -
        2,
      3
    )
  )}@${domain}`;
};

// ======================================
// HTML escape helper
// ======================================

const escapeHtml = (
  value
) =>
  String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

// ======================================
// OTP email HTML
// ======================================

const buildOTPEmailHTML = (
  otp
) => {
  const safeOtp =
    escapeHtml(otp);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>hydewest Email Verification</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f5f5;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    style="
      width:100%;
      padding:40px 12px;
      background:#f5f5f5;
    "
  >
    <tr>
      <td align="center">
        <table
          role="presentation"
          width="600"
          cellspacing="0"
          cellpadding="0"
          style="
            width:100%;
            max-width:600px;
            overflow:hidden;
            border-radius:16px;
            background:#ffffff;
            box-shadow:0 12px 35px rgba(15,23,42,.1);
          "
        >
          <tr>
            <td
              style="
                padding:30px;
                text-align:center;
                background:linear-gradient(135deg,#ff385c,#b20b3b);
              "
            >
              <h1
                style="
                  margin:0;
                  color:#ffffff;
                  font-size:32px;
                  line-height:1.2;
                "
              >
                hydewest
              </h1>

              <p
                style="
                  margin:10px 0 0;
                  color:#ffe5ec;
                  font-size:15px;
                "
              >
                Secure email verification
              </p>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:40px 32px;
              "
            >
              <h2
                style="
                  margin:0;
                  color:#111827;
                  font-size:24px;
                "
              >
                Verify your email
              </h2>

              <p
                style="
                  margin:22px 0 0;
                  color:#4b5563;
                  font-size:16px;
                  line-height:28px;
                "
              >
                Use the verification code below to securely continue with
                your <strong>hydewest</strong> account.
              </p>

              <div
                style="
                  margin:32px 0;
                  padding:26px 18px;
                  text-align:center;
                  border:2px dashed #ff385c;
                  border-radius:14px;
                  background:#fff4f6;
                "
              >
                <p
                  style="
                    margin:0;
                    color:#6b7280;
                    font-size:13px;
                    font-weight:700;
                    letter-spacing:1px;
                  "
                >
                  YOUR VERIFICATION CODE
                </p>

                <h1
                  style="
                    margin:18px 0 0;
                    color:#ff385c;
                    font-size:42px;
                    line-height:1.2;
                    letter-spacing:10px;
                  "
                >
                  ${safeOtp}
                </h1>
              </div>

              <p
                style="
                  margin:0;
                  color:#4b5563;
                  font-size:15px;
                  line-height:26px;
                "
              >
                This code will expire in
                <strong>5 minutes</strong>.
              </p>

              <p
                style="
                  margin:16px 0 0;
                  color:#4b5563;
                  font-size:15px;
                  line-height:26px;
                "
              >
                If you did not request this verification code, you can safely
                ignore this email.
              </p>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:26px 30px;
                text-align:center;
                border-top:1px solid #eeeeee;
                background:#fafafa;
              "
            >
              <p
                style="
                  margin:0;
                  color:#9ca3af;
                  font-size:13px;
                "
              >
                This is an automated security email. Please do not reply.
              </p>

              <p
                style="
                  margin:10px 0 0;
                  color:#6b7280;
                  font-size:13px;
                "
              >
                © ${new Date().getFullYear()} hydewest. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// ======================================
// Plain-text fallback
// ======================================

const buildOTPEmailText = (
  otp
) =>
  [
    "hydewest email verification",
    "",
    `Your verification code is: ${otp}`,
    "",
    "This code expires in 5 minutes.",
    "",
    "If you did not request this code, you can safely ignore this email.",
  ].join("\n");

// ======================================
// Parse Brevo response
// ======================================

const parseResponseBody =
  async (response) => {
    const responseText =
      await response.text();

    if (!responseText) {
      return {};
    }

    try {
      return JSON.parse(
        responseText
      );
    } catch {
      return {
        message:
          responseText.slice(
            0,
            500
          ),
      };
    }
  };

// ======================================
// Send OTP through Brevo HTTPS API
// ======================================

const sendOTPEmail = async (
  email,
  otp
) => {
  const recipient =
    String(email || "")
      .trim()
      .toLowerCase();

  const normalizedOtp =
    String(otp || "")
      .trim();

  if (!recipient) {
    const error =
      new Error(
        "Recipient email is required."
      );

    error.code =
      "MAIL_RECIPIENT_MISSING";

    throw error;
  }

  if (
    !/^\d{6}$/.test(
      normalizedOtp
    )
  ) {
    const error =
      new Error(
        "A valid six-digit OTP is required."
      );

    error.code =
      "INVALID_OTP_FORMAT";

    throw error;
  }

  const {
    apiKey,
    senderEmail,
    senderName,
  } =
    getMailConfiguration();

  const abortController =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        abortController.abort(),
      15000
    );

  try {
    const response =
      await fetch(
        BREVO_EMAIL_ENDPOINT,
        {
          method: "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            "api-key":
              apiKey,
          },

          body:
            JSON.stringify({
              sender: {
                name:
                  senderName,

                email:
                  senderEmail,
              },

              to: [
                {
                  email:
                    recipient,
                },
              ],

              subject:
                "hydewest - Verify Your Email",

              htmlContent:
                buildOTPEmailHTML(
                  normalizedOtp
                ),

              textContent:
                buildOTPEmailText(
                  normalizedOtp
                ),
            }),

          signal:
            abortController.signal,
        }
      );

    const responseBody =
      await parseResponseBody(
        response
      );

    if (!response.ok) {
      const error =
        new Error(
          responseBody
            ?.message ||
            `Brevo returned HTTP ${response.status}.`
        );

      error.name =
        "BrevoEmailError";

      error.code =
        responseBody?.code ||
        "BREVO_EMAIL_SEND_FAILED";

      error.statusCode =
        response.status;

      throw error;
    }

    console.log(
      "[Mail Service] OTP email accepted by Brevo:",
      {
        recipient:
          maskEmail(
            recipient
          ),

        messageId:
          responseBody
            ?.messageId ||
          null,
      }
    );

    return {
      provider:
        "brevo",

      messageId:
        responseBody
          ?.messageId ||
        null,

      accepted: [
        recipient,
      ],

      rejected: [],
    };
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      const timeoutError =
        new Error(
          "Brevo email request timed out."
        );

      timeoutError.name =
        "BrevoEmailTimeoutError";

      timeoutError.code =
        "BREVO_EMAIL_TIMEOUT";

      throw timeoutError;
    }

    console.error(
      "[Mail Service] Brevo OTP email failed:",
      {
        recipient:
          maskEmail(
            recipient
          ),

        code:
          error?.code ||
          "UNKNOWN_BREVO_ERROR",

        statusCode:
          error?.statusCode ||
          null,

        message:
          error?.message ||
          "Unknown Brevo email error",
      }
    );

    throw error;
  } finally {
    clearTimeout(
      timeout
    );
  }
};

module.exports = {
  sendOTPEmail,
};