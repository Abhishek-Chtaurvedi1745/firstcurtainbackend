require("dotenv").config();
const express = require("express");
const cors = require("cors");
const SibApiV3Sdk = require("sib-api-v3-sdk");

const app = express();
const PORT = process.env.PORT || 8800;

/* -------------------- MIDDLEWARE -------------------- */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);
app.use(express.json());

/* -------------------- BREVO CONFIG -------------------- */
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

/* -------------------- HELPER: MULTIPLE RECIPIENTS -------------------- */
const getRecipients = () => {
  return process.env.RECEIVER_EMAIL
    .split(",")
    .map((email) => ({ email: email.trim() }));
};

/* -------------------- HELPER: EMAIL VALIDATION -------------------- */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/* -------------------- HEALTH CHECK -------------------- */
app.get("/", (req, res) => {
  res.send("Backend running successfully 🚀");
});

/* -------------------- CONTACT ROUTE -------------------- */
app.post("/contact", async (req, res) => {
  try {
    const { name, mobile, email, message } = req.body;

    // Validation
    if (!name || !mobile || !email || !message) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format!" });
    }

    const sendSmtpEmail = {
      sender: {
        name: "First Curtain Website",
        email: process.env.SENDER_EMAIL,
      },
      to: getRecipients(),
      replyTo: {
        email: email,
        name: name,
      },
      subject: `First Curtain Form Submission Data: ${name}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #51C5D0;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Mobile:</strong> ${mobile}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <div style="background:#f4f4f4; padding:10px; border-radius:5px;">
            ${message}
          </div>
        </div>
      `,
    };

    const response = await tranEmailApi.sendTransacEmail(sendSmtpEmail);

    console.log("Brevo Message ID ✅:", response.messageId);

    res.status(200).json({ message: "Form submitted successfully ✅" });

  } catch (error) {
    console.error("BREVO ERROR ❌:");
    console.error(error.response?.body || error.message);
    res.status(500).json({ message: "Failed to send email. Check backend logs." });
  }
});

/* -------------------- START SERVER -------------------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Sender:", process.env.SENDER_EMAIL);
  console.log("Receivers:", process.env.RECEIVER_EMAIL);
});