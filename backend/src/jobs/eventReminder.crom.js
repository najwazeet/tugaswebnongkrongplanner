const cron = require("node-cron");
const Event = require("../models/Event");
const User = require("../models/User");
const { sendReminderH3, sendReminderH1 } = require("../services/email.service");

// Helper: format tanggal untuk display
function formatDate(isoString) {
  if (!isoString) return "TBA";
  const date = new Date(isoString);
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("id-ID", options);
}

// Helper: cek apakah event jatuh pada H-3 atau H-1
function getDaysUntilEvent(finalDateTime) {
  if (!finalDateTime) return null;
  
  const now = new Date();
  const eventDate = new Date(finalDateTime);
  
  // Set jam ke 00:00 untuk perbandingan hari saja
  now.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  
  const diffTime = eventDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

// Fungsi untuk kirim reminder H-3
async function sendH3Reminders() {
  try {
    console.log("[INFO] Checking for H-3 reminders...");
    
    // Cari event yang finalDateTime-nya 3 hari dari sekarang
    const events = await Event.find({
      status: { $in: ["POLLING", "FINAL"] },
      finalDateTime: { $exists: true, $ne: null },
    });
    
    for (const event of events) {
      const daysUntil = getDaysUntilEvent(event.finalDateTime);
      
      if (daysUntil === 3) {
        console.log(`[EMAIL] Sending H-3 reminders for event: ${event.title}`);
        
        // Kirim ke semua member yang aktifkan notifikasi
        for (const member of event.members) {
          const user = await User.findById(member.userId);
          
          if (user && user.emailNotifications?.enabled && user.emailNotifications?.reminderH3) {
            await sendReminderH3({
              to: user.email,
              userName: user.name || member.name,
              eventTitle: event.title,
              eventDate: formatDate(event.finalDateTime),
              eventLocation: event.finalLocation,
            });
            
            console.log(`[SUCCESS] Sent H-3 reminder to ${user.email}`);
          }
        }
      }
    }
    
    console.log("[INFO] H-3 reminder check completed");
  } catch (error) {
    console.error("[ERROR] Error in H-3 reminder job:", error);
  }
}

// Fungsi untuk kirim reminder H-1
async function sendH1Reminders() {
  try {
    console.log("� Checking for H-1 reminders...");
    
    const events = await Event.find({
      status: { $in: ["POLLING", "FINAL"] },
      finalDateTime: { $exists: true, $ne: null },
    });
    
    for (const event of events) {
      const daysUntil = getDaysUntilEvent(event.finalDateTime);
      
      if (daysUntil === 1) {
        console.log(`[EMAIL] Sending H-1 reminders for event: ${event.title}`);
        
        for (const member of event.members) {
          const user = await User.findById(member.userId);
          
          if (user && user.emailNotifications?.enabled && user.emailNotifications?.reminderH1) {
            await sendReminderH1({
              to: user.email,
              userName: user.name || member.name,
              eventTitle: event.title,
              eventDate: formatDate(event.finalDateTime),
              eventLocation: event.finalLocation,
            });
            
            console.log(`[SUCCESS] Sent H-1 reminder to ${user.email}`);
          }
        }
      }
    }
    
    console.log("[INFO] H-1 reminder check completed");
  } catch (error) {
    console.error("[ERROR] Error in H-1 reminder job:", error);
  }
}

// Setup cron jobs
function startEventReminder() {
  // Jalankan setiap hari jam 9 pagi
  // Format: "menit jam * * *" (0 9 = jam 9:00)
  cron.schedule("0 9 * * *", () => {
    console.log("[CRON] Running daily reminder jobs at 9:00 AM");
    sendH3Reminders();
    sendH1Reminders();
  });
  
  // Untuk testing: jalankan setiap 1 menit (uncomment untuk test)
  // cron.schedule("*/1 * * * *", () => {
  //   console.log("[TEST] Running reminder jobs every minute");
  //   sendH3Reminders();
  //   sendH1Reminders();
  // });
  
  console.log("[INFO] Email reminder cron jobs started (9:00 AM daily)");
}

module.exports = { startEventReminder, sendH3Reminders, sendH1Reminders };
