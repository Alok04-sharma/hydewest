const nodemailer = require("nodemailer");

// ======================================
// Mail environment helpers
// ======================================

const getMailUser = () =>
  String(
    process.env.EMAIL_USER || ""
  )
    .trim()
    .toLowerCase();

const getMailPassword = () =>
  String(
    process.env.EMAIL_PASS || ""
  )
    // Google App Password copy karne par spaces aa sakti hain.
    // SMTP authentication ke liye unhe remove karna safe hai.
    .replace(/\s+/g, "")
    .trim();

const validateMailEnvironment = () => {
  const user = getMailUser();
  const password = getMailPassword();

  if (!user) {
    const error = new Error(
      "EMAIL_USER is missing from the server environment."
    );

    error.code =
      "MAIL_USER_MISSING";

    throw error;
  }

  if (!password) {
    const error = new Error(
      "EMAIL_PASS is missing from the server environment."
    );

    error.code =
      "MAIL_PASSWORD_MISSING";

    throw error;
  }

  return {
    user,
    password,
  };
};

// ======================================
// Gmail SMTP transporter
// ======================================

let transporter = null;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const {
    user,
    password,
  } = validateMailEnvironment();

  transporter =
    nodemailer.createTransport({
      host: "smtp.gmail.com",

      // Port 465 uses TLS from the beginning of the connection.
      port: 465,
      secure: true,

      auth: {
        user,
        pass: password,
      },

      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,

      tls: {
        minVersion: "TLSv1.2",
      },
    });

  return transporter;
};

// ======================================
// Safe mail-error logger
// ======================================

const logMailError = (
  error,
  recipient
) => {
  console.error(
    "[Mail Service] OTP email failed:",
    {
      recipient:
        String(recipient || "")
          .trim()
          .toLowerCase(),

      code:
        error?.code ||
        "UNKNOWN_MAIL_ERROR",

      command:
        error?.command ||
        null,

      responseCode:
        error?.responseCode ||
        null,

      // Gmail/Nodemailer ka response useful hai,
      // lekin credentials kabhi log nahi kiye jaate.
      response:
        error?.response ||
        null,

      message:
        error?.message ||
        "Unknown email error",
    }
  );
};

// ======================================
// OTP HTML template
// ======================================

const buildOTPEmailHTML = (
  otp
) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>hydewest Verification</title>
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
      background:#f5f5f5;
      padding:40px 12px;
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
            border-radius:12px;
            background:#ffffff;
            box-shadow:0 8px 20px rgba(0,0,0,.08);
          "
        >
          <tr>
            <td
              style="
                padding:28px;
                text-align:center;
                background:#FF385C;
              "
            >
              <h1
                style="
                  margin:0;
                  color:#ffffff;
                  font-size:32px;
                "
              >
                hydewest
              </h1>

              <p
                style="
                  margin:10px 0 0;
                  color:#ffe5ea;
                  font-size:15px;
                "
              >
                Secure Email Verification
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 32px;">
              <h2
                style="
                  margin:0;
                  color:#222222;
                "
              >
                Verify your email
              </h2>

              <p
                style="
                  margin:24px 0 0;
                  color:#555555;
                  font-size:16px;
                  line-height:28px;
                "
              >
                Use the verification code below to securely continue with
                your <strong>hydewest</strong> account.
              </p>

              <div
                style="
                  margin:35px 0;
                  padding:25px;
                  text-align:center;
                  border:2px dashed #FF385C;
                  border-radius:10px;
                  background:#fff4f6;
                "
              >
                <p
                  style="
                    margin:0;
                    color:#777777;
                    font-size:14px;
                  "
                >
                  YOUR VERIFICATION CODE
                </p>

                <h1
                  style="
                    margin:18px 0 0;
                    color:#FF385C;
                    font-size:42px;
                    line-height:1.2;
                    letter-spacing:12px;
                  "
                >
                  ${otp}
                </h1>
              </div>

              <p
                style="
                  margin:0;
                  color:#555555;
                  font-size:15px;
                  line-height:28px;
                "
              >
                This code will expire in
                <strong>5 minutes</strong>.
              </p>

              <p
                style="
                  margin:16px 0 0;
                  color:#555555;
                  font-size:15px;
                  line-height:28px;
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
                padding:30px;
                text-align:center;
                border-top:1px solid #eeeeee;
                background:#fafafa;
              "
            >
              <p
                style="
                  margin:0;
                  color:#999999;
                  font-size:14px;
                "
              >
                This is an automated message. Please do not reply.
              </p>

              <p
                style="
                  margin:12px 0 0;
                  color:#666666;
                  font-size:14px;
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
    "This code will expire in 5 minutes.",
    "",
    "If you did not request this code, you can safely ignore this email.",
  ].join("\n");

// ======================================
// Verify SMTP credentials
// ======================================

const verifyMailConnection =
  async () => {
    try {
      const mailTransporter =
        getTransporter();

      await mailTransporter.verify();

      console.log(
        "[Mail Service] Gmail SMTP connection verified."
      );

      return true;
    } catch (error) {
      logMailError(
        error,
        getMailUser()
      );

      return false;
    }
  };

// ======================================
// Send OTP email
// ======================================

const sendOTPEmail = async (
  email,
  otp
) => {
  const recipient =
    String(email || "")
      .trim()
      .toLowerCase();

  try {
    const {
      user,
    } = validateMailEnvironment();

    const mailTransporter =
      getTransporter();

    const info =
      await mailTransporter.sendMail({
        from:
          `"hydewest" <${user}>`,

        to: recipient,

        subject:
          "hydewest - Verify Your Email",

        text:
          buildOTPEmailText(
            otp
          ),

        html:
          buildOTPEmailHTML(
            otp
          ),
      });

    console.log(
      "[Mail Service] OTP email accepted by Gmail:",
      {
        recipient,
        messageId:
          info.messageId ||
          null,

        accepted:
          info.accepted ||
          [],

        rejected:
          info.rejected ||
          [],
      }
    );

    return info;
  } catch (error) {
    logMailError(
      error,
      recipient
    );

    throw error;
  }
};

module.exports = {
  sendOTPEmail,
  verifyMailConnection,
};