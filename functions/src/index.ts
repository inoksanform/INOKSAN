import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp();
const db = admin.firestore();

// Configure Nodemailer (Update with your credentials)
// Note: For Gmail, you might need to use an App Password.
// Ideally, use a dedicated email service like SendGrid, Mailgun, or AWS SES for production.
const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: "your-email@gmail.com",
    pass: "your-app-password",
  },
});

export const onTicketCreated = functions.firestore
  .document("tickets/{ticketId}")
  .onCreate(async (snap, context) => {
    const ticket = snap.data();
    const docId = context.params.ticketId;

    // 1. Generate Ticket ID (AF-YYYYMMDD-XXXX)
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;

    const counterRef = db.collection("counters").doc("tickets");

    try {
      const ticketId = await db.runTransaction(async (t) => {
        const doc = await t.get(counterRef);
        let count = 1;
        if (doc.exists) {
          const data = doc.data();
          // Reset counter if date changed
          if (data?.date === dateStr) {
            count = (data.count || 0) + 1;
          } else {
            count = 1; // Reset for new day
          }
        }
        
        t.set(counterRef, { count, date: dateStr }, { merge: true });
        return `AF-${dateStr}-${String(count).padStart(4, "0")}`;
      });

      // Update the ticket with the generated ID
      await snap.ref.update({ ticketId });
      console.log(`Generated Ticket ID: ${ticketId} for document ${docId}`);

      // 2. Email Routing
      const country = ticket.country;
      // TODO: Replace with actual email addresses
      const recipients = ["aftersales@example.com"]; // Main Aftersales Team
      const cc = ["export-manager@example.com"]; // Export Manager

      // Fetch Regional Manager
      if (country) {
        const managerSnapshot = await db
          .collection("country_managers")
          .where("country", "==", country)
          .limit(1)
          .get();

        if (!managerSnapshot.empty) {
          const managerData = managerSnapshot.docs[0].data();
          if (managerData.manager_email) {
            cc.push(managerData.manager_email);
          }
        }
      }

      // Send Email
      const mailOptions = {
        from: '"Aftersales Support" <noreply@example.com>',
        to: recipients.join(","),
        cc: cc.join(","),
        subject: `New Support Ticket: ${ticketId} - ${ticket.subject}`,
        html: `
          <h2>New Ticket Received</h2>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>Company:</strong> ${ticket.companyName}</p>
          <p><strong>Contact:</strong> ${ticket.contactPerson}</p>
          <p><strong>Country:</strong> ${ticket.country}</p>
          <p><strong>Issue Type:</strong> ${ticket.issueType}</p>
          <p><strong>Priority:</strong> ${ticket.priority}</p>
          <br>
          <h3>Description:</h3>
          <p>${ticket.description}</p>
          <br>
          <p><strong>Attachments:</strong></p>
          <ul>
            ${ticket.attachments && Array.isArray(ticket.attachments) 
              ? ticket.attachments.map((url: string) => `<li><a href="${url}">${url}</a></li>`).join('') 
              : 'None'}
          </ul>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email sent for ticket ${ticketId}`);

      // 3. Send Client Confirmation Email
      if (ticket.email) {
        const clientMailOptions = {
          from: '"Aftersales Support" <noreply@example.com>',
          to: ticket.email,
          subject: `Ticket Received: ${ticketId}`,
          html: `
            <h2>Ticket Received</h2>
            <p>Dear ${ticket.contactPerson},</p>
            <p>We have received your support request regarding "${ticket.subject}".</p>
            <p><strong>Ticket ID:</strong> ${ticketId}</p>
            <p>Our team will review your request and get back to you shortly.</p>
            <br>
            <p>Best regards,</p>
            <p>Aftersales Team</p>
          `,
        };
        await transporter.sendMail(clientMailOptions);
        console.log(`Confirmation email sent to ${ticket.email}`);
      }

    } catch (error) {
      console.error("Error in onTicketCreated:", error);
    }
  });
