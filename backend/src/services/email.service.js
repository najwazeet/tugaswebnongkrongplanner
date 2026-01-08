const nodemailer = require("nodemailer");

// Konfigurasi Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log("[EMAIL ERROR] SMTP connection failed:", error.message);
  } else {
    console.log("[EMAIL] SMTP server ready to send emails");
  }
});

// Fungsi umum untuk kirim email
const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Nongkrong Planner" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] Email sent successfully to ${to}`);
    console.log(`[EMAIL] Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[ERROR] Failed to send email to ${to}:`, error.message);
    console.error(`[ERROR] Error details:`, error);
    return { success: false, error: error.message };
  }
};

// Template email reminder H-3
const sendReminderH3 = async ({ to, userName, eventTitle, eventDate, eventLocation }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #ffefc2 0%, #ffd89b 100%); padding: 30px; text-align: center; }
        .header h1 { margin: 0; color: #333; font-size: 28px; }
        .content { padding: 30px; }
        .event-card { background: #fffdf7; border: 2px solid #ffefc2; border-radius: 10px; padding: 20px; margin: 20px 0; }
        .event-title { font-size: 22px; font-weight: bold; color: #ff9f43; margin-bottom: 15px; }
        .event-info { margin: 10px 0; color: #555; }
        .event-info strong { color: #333; }
        .reminder-badge { display: inline-block; background: #ff9f43; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 15px 0; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .btn { display: inline-block; background: #ff9f43; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Nongkrong Planner</h1>
        </div>
        <div class="content">
          <h2>Halo, ${userName}! 👋</h2>
          <p>Event kamu sebentar lagi nih!</p>
          
          <div class="reminder-badge">⏰ H-3 DAYS REMINDER</div>
          
          <div class="event-card">
            <div class="event-title">${eventTitle}</div>
            <div class="event-info"><strong>📅 Tanggal:</strong> ${eventDate}</div>
            <div class="event-info"><strong>📍 Lokasi:</strong> ${eventLocation || 'Belum ditentukan'}</div>
          </div>
          
          <p style="color: #555; line-height: 1.6;">
            Jangan lupa untuk persiapan ya! Event ini tinggal 3 hari lagi. 
            Cek detail lengkapnya di dashboard untuk informasi terbaru.
          </p>
          
          <center>
            <a href="http://localhost:3000/dashboard.html" class="btn">Lihat Detail Event</a>
          </center>
        </div>
        <div class="footer">
          <p>Email ini dikirim otomatis oleh Nongkrong Planner</p>
          <p>Atur notifikasi email di <strong>Profile Settings</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `⏰ Reminder: ${eventTitle} - 3 Hari Lagi!`,
    html,
  });
};

// Template email reminder H-1
const sendReminderH1 = async ({ to, userName, eventTitle, eventDate, eventLocation }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #ff9f43 0%, #ff6b6b 100%); padding: 30px; text-align: center; }
        .header h1 { margin: 0; color: white; font-size: 28px; }
        .content { padding: 30px; }
        .event-card { background: #fff5f5; border: 2px solid #ff9f43; border-radius: 10px; padding: 20px; margin: 20px 0; }
        .event-title { font-size: 22px; font-weight: bold; color: #ff6b6b; margin-bottom: 15px; }
        .event-info { margin: 10px 0; color: #555; }
        .event-info strong { color: #333; }
        .reminder-badge { display: inline-block; background: #ff6b6b; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 15px 0; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .btn { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
        .urgent { background: #fff5f5; border-left: 4px solid #ff6b6b; padding: 15px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 Nongkrong Planner</h1>
        </div>
        <div class="content">
          <h2>Halo, ${userName}! 👋</h2>
          
          <div class="reminder-badge">🔥 BESOK EVENT-NYA!</div>
          
          <div class="event-card">
            <div class="event-title">${eventTitle}</div>
            <div class="event-info"><strong>📅 Tanggal:</strong> ${eventDate}</div>
            <div class="event-info"><strong>📍 Lokasi:</strong> ${eventLocation || 'Belum ditentukan'}</div>
          </div>
          
          <div class="urgent">
            <strong>⚡ Event tinggal BESOK!</strong><br>
            Pastikan kamu sudah siap dan jangan sampai telat ya! 😊
          </div>
          
          <p style="color: #555; line-height: 1.6;">
            Cek dashboard untuk detail terbaru atau chat dengan teman-teman lainnya.
          </p>
          
          <center>
            <a href="http://localhost:3000/dashboard.html" class="btn">Lihat Detail Event</a>
          </center>
        </div>
        <div class="footer">
          <p>Email ini dikirim otomatis oleh Nongkrong Planner</p>
          <p>Atur notifikasi email di <strong>Profile Settings</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `🔥 BESOK! ${eventTitle} - Jangan Lupa!`,
    html,
  });
};

// Template email event update
const sendEventUpdate = async ({ to, userName, eventTitle, updateMessage }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; text-align: center; }
        .header h1 { margin: 0; color: white; font-size: 28px; }
        .content { padding: 30px; }
        .update-box { background: #f0f9ff; border-left: 4px solid #4facfe; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .btn { display: inline-block; background: #4facfe; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📢 Update Event</h1>
        </div>
        <div class="content">
          <h2>Halo, ${userName}! 👋</h2>
          <p>Ada update untuk event <strong>${eventTitle}</strong>:</p>
          
          <div class="update-box">
            ${updateMessage}
          </div>
          
          <center>
            <a href="http://localhost:3000/dashboard.html" class="btn">Lihat Detail</a>
          </center>
        </div>
        <div class="footer">
          <p>Email ini dikirim otomatis oleh Nongkrong Planner</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `📢 Update: ${eventTitle}`,
    html,
  });
};

module.exports = { 
  sendEmail, 
  sendReminderH3, 
  sendReminderH1,
  sendEventUpdate 
};
