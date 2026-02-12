import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('CRITICAL: RESEND_API_KEY is missing from environment variables');
      return NextResponse.json({ 
        success: false,
        error: 'Email service is not configured. Please contact support.',
        details: 'Missing RESEND_API_KEY environment variable',
        code: 'CONFIG_ERROR'
      }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { 
      email, 
      ticketId, 
      companyName, 
      contactPerson, 
      subject, 
      description,
      country,
      phoneNumber,
      equipmentType,
      priority,
      issueDescription,
      salesman,
      regionalManager,
      isTest = false,
      toEmail
    } = await request.json();

    // Validate required fields
    if (!email || !ticketId || !companyName || !contactPerson || !subject) {
      console.error('Missing required fields:', { email, ticketId, companyName, contactPerson, subject });
      return NextResponse.json({ 
        success: false,
        error: 'Missing required information to send email',
        details: 'Email, ticket ID, company name, contact person, and subject are required',
        code: 'VALIDATION_ERROR'
      }, { status: 400 });
    }

    // Load email settings from Firebase
    console.log("Fetching email settings from Firebase...");
    const settingsDoc = await getDoc(doc(db, 'settings', 'email'));
    const settings = settingsDoc.exists() ? settingsDoc.data() : {};
    console.log("Settings fetched:", settings);
    
    const forwardingEmail = settings.forwardingEmail || 'support@inoksan.com';
    const managerEmail = settings.managerEmail || 'manager@inoksan.com';
    const countries = settings.countries || [];

    // Determine recipients based on country and settings
    const recipients = [forwardingEmail]; // Always send to forwarding email
    
    // Add manager CC
    if (managerEmail && managerEmail !== forwardingEmail) {
      recipients.push(managerEmail);
    }

    // Add country-specific emails if enabled
    if (country && countries.length > 0) {
      const countryConfig = countries.find((c: any) => 
        c.code?.toLowerCase() === country.toLowerCase() || 
        c.name?.toLowerCase() === country.toLowerCase()
      );
      
      if (countryConfig && countryConfig.enabled && countryConfig.email) {
        recipients.push(countryConfig.email);
      }
    }

    // Remove duplicates
    const uniqueRecipients = [...new Set(recipients)];
    console.log("Recipients calculated:", uniqueRecipients);

    // 1. Send confirmation email to the user (unless it's a test)
    let userEmailData = null;
    if (!isTest && email) {
      console.log("Sending user confirmation email to:", email);
      try {
        userEmailData = await resend.emails.send({
          from: 'Inoksan Support <onboarding@resend.dev>', // Update this to your verified domain later
          to: [email],
          subject: `[${ticketId}] Ticket Received: ${subject}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Ticket Confirmation</h2>
              <p>Dear ${contactPerson},</p>
              <p>Thank you for contacting Inoksan Support. We have received your request and a support ticket has been created.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">Ticket ID: <span style="color: #2563eb;">${ticketId}</span></p>
                <p style="margin: 10px 0 0 0;"><strong>Subject:</strong> ${subject}</p>
                <p style="margin: 10px 0 0 0;"><strong>Priority:</strong> ${priority}</p>
                <p style="margin: 10px 0 0 0;"><strong>Equipment:</strong> ${equipmentType}</p>
              </div>

              <p>Our technical team will review your request and get back to you within 24 hours.</p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #6b7280; font-size: 14px;">Inoksan Aftersales Support Team</p>
            </div>
          `,
        });
        console.log("User confirmation email sent successfully");
      } catch (userEmailError) {
        console.error("Failed to send user confirmation email:", userEmailError);
        // Continue with support email even if user email fails
      }
    }

    // 2. Send notification email to the support team
    console.log("Sending support notification email to:", isTest && toEmail ? [toEmail] : uniqueRecipients);
    let supportEmailData = null;
    try {
      supportEmailData = await resend.emails.send({
        from: 'Inoksan System <onboarding@resend.dev>',
        to: isTest && toEmail ? [toEmail] : uniqueRecipients,
        subject: `${isTest ? '[TEST] ' : ''}NEW TICKET: ${ticketId} - ${companyName}`,
        html: `
          <div style="font-family: sans-serif;">
            <h2 style="color: #d97706;">${isTest ? '[TEST EMAIL] ' : ''}New Support Ticket Created</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Ticket ID:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticketId}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Company:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${companyName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Contact:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${contactPerson} (${email})</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${phoneNumber || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Country:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${country}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Salesman:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${salesman || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Regional Manager:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${regionalManager || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Priority:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${priority}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Equipment:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${equipmentType}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Subject:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${subject}</td>
              </tr>
            </table>
            
            <h3>Description:</h3>
            <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #2563eb;">
              ${description || issueDescription}
            </div>
            
            <p><strong>Recipients:</strong> ${uniqueRecipients.join(', ')}</p>
            
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/k-admin" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">View in Dashboard</a></p>
          </div>
        `,
      });
      console.log("Support notification email sent successfully");
    } catch (supportEmailError) {
      console.error("Failed to send support notification email:", supportEmailError);
      throw new Error(`Failed to send support email: ${supportEmailError instanceof Error ? supportEmailError.message : 'Unknown error'}`);
    }

    return NextResponse.json({ 
      success: true, 
      userEmail: userEmailData ? {
        id: 'id' in userEmailData ? userEmailData.id : 'unknown',
        sent: true,
        recipient: email
      } : null, 
      supportEmail: {
        id: supportEmailData && 'id' in supportEmailData ? supportEmailData.id : 'unknown',
        sent: true,
        recipients: isTest && toEmail ? [toEmail] : uniqueRecipients
      },
      recipients: uniqueRecipients,
      message: 'Emails sent successfully'
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    
    // Determine error type and provide user-friendly message
    let errorMessage = 'Failed to send email notification';
    let errorCode = 'EMAIL_ERROR';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Email service is not properly configured';
        errorCode = 'CONFIG_ERROR';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Email service is temporarily unavailable due to rate limiting';
        errorCode = 'RATE_LIMIT_ERROR';
        statusCode = 429;
      } else if (error.message.includes('invalid')) {
        errorMessage = 'Invalid email address or configuration';
        errorCode = 'VALIDATION_ERROR';
        statusCode = 400;
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'Network error while sending email. Please try again.';
        errorCode = 'NETWORK_ERROR';
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: errorCode,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}
