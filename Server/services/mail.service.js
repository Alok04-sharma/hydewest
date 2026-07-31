const nodemailer = require("nodemailer");

// Nodemailer transporter using Gmail App Password authentication.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"hydewest" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "hydewest - Verify Your Email",
      html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>hydewest Verification</title>
</head>

<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;padding:40px 0;">
<tr>
<td align="center">

<table width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,.08);">

<!-- Header -->
<tr>
<td style="background:#FF385C;padding:28px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:32px;">
🏡 hydewest
</h1>
<p style="margin-top:10px;color:#ffe5ea;font-size:15px;">
Secure Email Verification
</p>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:40px;">

<h2 style="margin-top:0;color:#222;">
Verify your email
</h2>

<p style="color:#555;font-size:16px;line-height:28px;">
Hi,
</p>

<p style="color:#555;font-size:16px;line-height:28px;">
Use the verification code below to securely sign in to your
<strong>hydewest</strong> account.
</p>

<div style="
margin:35px 0;
background:#fff4f6;
border:2px dashed #FF385C;
border-radius:10px;
padding:25px;
text-align:center;
">

<p style="margin:0;color:#777;font-size:14px;">
YOUR VERIFICATION CODE
</p>

<h1 style="
margin:18px 0 0;
font-size:42px;
letter-spacing:12px;
color:#FF385C;
">
${otp}
</h1>

</div>

<p style="color:#555;font-size:15px;line-height:28px;">
This code will expire in
<strong>5 minutes</strong>.
</p>

<p style="color:#555;font-size:15px;line-height:28px;">
If you didn't request this verification code, you can safely ignore this email.
No changes will be made to your account.
</p>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="background:#fafafa;padding:30px;text-align:center;border-top:1px solid #eee;">

<p style="margin:0;color:#999;font-size:14px;">
This is an automated message. Please do not reply.
</p>

<p style="margin-top:12px;color:#666;font-size:14px;">
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
`,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  sendOTPEmail,
};