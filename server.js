require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ ROOT ROUTE FIX (IMPORTANT)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "email.html"));
});

// ================= STORE =================
const otpStore = new Map();
const expiryStore = new Map();
const cooldownStore = new Map();


// ================= MAIL CONFIG =================
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ================= OTP =================
const generateOTP = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

// ================= SEND OTP =================
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const now = Date.now();

  if (!email) {
    return res.json({ success: false, message: "Email required ❌" });
  }

  if (cooldownStore.get(email) > now) {
    return res.json({
      success: false,
      message: "Wait before requesting again ⏳",
    });
  }

  const otp = generateOTP();

  otpStore.set(email, otp);
  expiryStore.set(email, now + 5 * 60 * 1000); // 5 min expiry
  cooldownStore.set(email, now + 30 * 1000); // 30 sec cooldown

  console.log("OTP:", otp);

  try {
    await transporter.sendMail({
      from: `"JSR EV TECH" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Your OTP Code - JSR EV TECH",
      text: `Your OTP is ${otp}`,
      html: `
<div style="margin:0;padding:0;background:#0b0b0b;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">

        <table width="420" cellpadding="0" cellspacing="0"
        style="background:#111;border-radius:14px;padding:30px;
        border:1px solid rgba(255,102,0,0.2);color:#fff;">

          <tr>
            <td align="center">
              <h2 style="color:#ff6600;">JSR EV TECH</h2>
              <p style="opacity:0.7;font-size:13px;">
                Secure Login Verification
              </p>
            </td>
          </tr>

          <tr>
            <td>
              <hr style="border:none;height:1px;background:#222;margin:20px 0;">
            </td>
          </tr>

          <tr>
            <td align="center">
              <p style="font-size:15px;">
                Use this OTP to login:
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:20px 0;">
              <div style="
                font-size:32px;
                letter-spacing:10px;
                color:#ff6600;
                background:#0b0b0b;
                padding:15px 30px;
                border-radius:10px;
                border:1px solid #333;
              ">
                ${otp}
              </div>
            </td>
          </tr>

          <tr>
            <td align="center">
              <p style="font-size:14px;opacity:0.7;">
                Expires in 5 minutes
              </p>
              <p style="font-size:12px;opacity:0.5;">
                Do not share this OTP
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="font-size:11px;opacity:0.4;">
                © 2026 JSR EV TECH
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</div>
`,
    });

    res.json({ success: true, message: "OTP sent 🚀" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Email failed ❌" });
  }
});

// ================= VERIFY OTP =================
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  const stored = otpStore.get(email);
  const expiry = expiryStore.get(email);

  if (!stored) {
    return res.json({ success: false, message: "No OTP found ❌" });
  }

  if (Date.now() > expiry) {
    otpStore.delete(email);
    expiryStore.delete(email);
    return res.json({ success: false, message: "OTP expired ⏳" });
  }

  if (stored === otp) {
    otpStore.delete(email);
    expiryStore.delete(email);
    return res.json({ success: true, message: "Login success ✅" });
  }

  res.json({ success: false, message: "Invalid OTP ❌" });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
