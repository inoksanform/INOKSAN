import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

interface BrevoEmailData {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender?: {
    name: string;
    email: string;
  };
  replyTo?: {
    email: string;
    name: string;
  };
  cc?: string[];
}

async function sendBrevoEmail(emailData: BrevoEmailData): Promise<any> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@inoksan.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Inoksan Support';

  if (!apiKey) {
    throw new Error('BREVO_API_KEY not configured');
  }

  // Brevo API v3 format for transactional emails
  const payload: any = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: [{ email: emailData.to }],
    subject: emailData.subject,
    htmlContent: emailData.htmlContent,
    textContent: emailData.textContent || emailData.htmlContent.replace(/<[^>]*>/g, ''),
    replyTo: emailData.replyTo || {
      email: 'support@inoksan.com',
      name: 'Inoksan Support'
    }
  };

  // Add CC recipients if provided
  if (emailData.cc && emailData.cc.length > 0) {
    payload.cc = emailData.cc.map(email => ({ email }));
  }

  console.log('Sending to Brevo API with payload summary:', { 
    to: emailData.to, 
    subject: emailData.subject, 
    ccCount: emailData.cc?.length || 0,
    ccList: emailData.cc
  });
  console.log('Using API key (first 10 chars):', apiKey.substring(0, 10) + '...');

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Brevo API response status:', response.status);
    console.log('Brevo API response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Brevo API response body:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      throw new Error(`Brevo API error (${response.status}): ${errorData.message || response.statusText}`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { messageId: responseText, success: true };
    }

    return result;
  } catch (error) {
    console.error('Brevo API call failed:', error);
    throw error;
  }
}

function createAdminNotificationTemplate(data: any): string {
  const priorityColors = {
    'Critical': '#dc2626',
    'Urgent (equipment stopped)': '#dc2626',
    'High': '#ea580c',
    'Medium': '#ca8a04',
    'Low': '#16a34a'
  };

  const priorityColor = priorityColors[data.priority as keyof typeof priorityColors] || '#6b7280';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Ticket Alert - ${data.ticketId}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px;">🚨 NEW TICKET ALERT</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Action Required: New support ticket received</p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <!-- TOP SECTION: First 6 elements side by side -->
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">🚨 NEW TICKET ALERT</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Ticket ID</strong>
              <p style="margin: 5px 0; font-weight: bold; color: #1f2937;">${data.ticketId}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Priority</strong>
              <p style="margin: 5px 0;">
                <span style="background-color: ${priorityColor}20; color: ${priorityColor}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${data.priority}
                </span>
              </p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Company</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.companyName}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Contact</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.contactPerson}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Country</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.country}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Customer Email</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.customerEmail}</p>
            </div>
          </div>
        </div>

        <!-- SPLITTER LINE -->
        <div style="border-top: 2px solid #e5e7eb; margin: 25px 0;"></div>

        <!-- ISSUE DETAILS SECTION -->
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">📋 Issue Details</h3>
          <div style="margin-bottom: 15px;">
            <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Subject</strong>
            <p style="margin: 5px 0; color: #1f2937; font-weight: 500;">${data.subject}</p>
          </div>
          <div>
            <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Description</strong>
            <p style="color: #6b7280; margin: 5px 0; white-space: pre-wrap; line-height: 1.5;">${data.description}</p>
          </div>
        </div>

        <!-- EQUIPMENT DETAILS SECTION -->
        ${data.equipmentType ? `
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">🔧 Equipment Details</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Product Model</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.equipmentType}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Serial Number</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.equipmentSerialNo || 'Not provided'}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Order/Invoice No</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.orderInvoiceNo || 'Not provided'}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Issue Type</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.issueType || 'General'}</p>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- ATTACHMENTS SECTION -->
        ${data.attachments && data.attachments.length > 0 ? `
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">📎 Attachments</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${data.attachments.map((attachment: string, index: number) => `
              <div style="display: flex; align-items: center; padding: 10px; background: #f8fafc; border-radius: 6px;">
                <span style="color: #3b82f6; margin-right: 8px;">📄</span>
                <a href="${attachment}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">
                  File ${index + 1}
                </a>
                <span style="margin-left: auto; color: #6b7280; font-size: 12px;">Click to view</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">⚡ Action Required</h3>
          <p style="color: #92400e; margin: 0;">Please review and assign this ticket to the appropriate team member.</p>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <a href="https://inoksan-form.vercel.app/admin/messages" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Admin Panel</a>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>Inoksan Support System | Admin Notification</p>
      </div>
    </body>
    </html>
  `;
}

function createRegionalNotificationTemplate(data: any): string {
  const priorityColors = {
    'Critical': '#dc2626',
    'Urgent (equipment stopped)': '#dc2626',
    'High': '#ea580c',
    'Medium': '#ca8a04',
    'Low': '#16a34a'
  };

  const priorityColor = priorityColors[data.priority as keyof typeof priorityColors] || '#6b7280';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Regional Ticket - ${data.ticketId}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px;">🌍 REGIONAL TICKET</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">New ticket from your region</p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <!-- TOP SECTION: First 6 elements side by side -->
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">🌍 REGIONAL TICKET</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Ticket ID</strong>
              <p style="margin: 5px 0; font-weight: bold; color: #1f2937;">${data.ticketId}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Priority</strong>
              <p style="margin: 5px 0;">
                <span style="background-color: ${priorityColor}20; color: ${priorityColor}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${data.priority}
                </span>
              </p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Company</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.companyName}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Contact</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.contactPerson}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Country</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.country}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Customer Email</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.customerEmail}</p>
            </div>
          </div>
        </div>

        <!-- SPLITTER LINE -->
        <div style="border-top: 2px solid #e5e7eb; margin: 25px 0;"></div>

        <!-- ISSUE DETAILS SECTION -->
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">📋 Issue Details</h3>
          <div style="margin-bottom: 15px;">
            <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Subject</strong>
            <p style="margin: 5px 0; color: #1f2937; font-weight: 500;">${data.subject}</p>
          </div>
          <div>
            <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Description</strong>
            <p style="color: #6b7280; margin: 5px 0; white-space: pre-wrap; line-height: 1.5;">${data.description}</p>
          </div>
        </div>

        <!-- EQUIPMENT DETAILS SECTION -->
        ${data.equipmentType ? `
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">🔧 Equipment Details</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Product Model</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.equipmentType}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Serial Number</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.equipmentSerialNo || 'Not provided'}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Order/Invoice No</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.orderInvoiceNo || 'Not provided'}</p>
            </div>
            <div>
              <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Issue Type</strong>
              <p style="margin: 5px 0; color: #1f2937;">${data.issueType || 'General'}</p>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- ATTACHMENTS SECTION -->
        ${data.attachments && data.attachments.length > 0 ? `
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">📎 Attachments</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${data.attachments.map((attachment: string, index: number) => `
              <div style="display: flex; align-items: center; padding: 10px; background: #f8fafc; border-radius: 6px;">
                <span style="color: #3b82f6; margin-right: 8px;">📄</span>
                <a href="${attachment}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">
                  File ${index + 1}
                </a>
                <span style="margin-left: auto; color: #6b7280; font-size: 12px;">Click to view</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
          <h3 style="color: #065f46; margin: 0 0 10px 0; font-size: 16px;">🎯 Regional Action</h3>
          <p style="color: #065f46; margin: 0;">As the regional manager for ${data.country}, please review and handle this ticket.</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>Inoksan Support System | Regional Manager Notification</p>
      </div>
    </body>
    </html>
  `;
}

function createTicketEmailTemplate(data: any): string {
  const priorityColors = {
    'Critical': '#dc2626',
    'Urgent (equipment stopped)': '#dc2626',
    'High': '#ea580c',
    'Medium': '#ca8a04',
    'Low': '#16a34a'
  };

  const priorityColor = priorityColors[data.priority as keyof typeof priorityColors] || '#6b7280';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Support Ticket - ${data.ticketId}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px;">Inoksan Support</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your ticket has been received</p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        
        <!-- TOP SECTION: 6 columns grid, 2 rows -->
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Ticket Summary</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; width: 16.66%;">
                <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Ticket ID</strong>
                <p style="margin: 5px 0; font-weight: bold; color: #1f2937;">${data.ticketId}</p>
              </td>
              <td style="padding: 8px; width: 16.66%;">
                <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Priority</strong>
                <p style="margin: 5px 0;">
                  <span style="background-color: ${priorityColor}20; color: ${priorityColor}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                    ${data.priority}
                  </span>
                </p>
              </td>
              <td style="padding: 8px; width: 16.66%;">
                <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Company</strong>
                <p style="margin: 5px 0; color: #1f2937;">${data.companyName}</p>
              </td>
              <td style="padding: 8px; width: 16.66%;">
                <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Contact</strong>
                <p style="margin: 5px 0; color: #1f2937;">${data.contactPerson}</p>
              </td>
              <td style="padding: 8px; width: 16.66%;">
                <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Country</strong>
                <p style="margin: 5px 0; color: #1f2937;">${data.country}</p>
              </td>
              <td style="padding: 8px; width: 16.66%;">
                <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Issue Type</strong>
                <p style="margin: 5px 0; color: #1f2937;">${data.issueType || 'General'}</p>
              </td>
            </tr>
          </table>
        </div>

        <!-- SPLITTER LINE -->
        <div style="border-top: 2px solid #e5e7eb; margin: 25px 0;"></div>

        <!-- EQUIPMENT DETAILS SECTION (3 columns, 2 rows) -->
        ${data.equipmentType ? `
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">🔧 Equipment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; width: 33.33%;">
                <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Product Model</strong>
                <p style="margin: 5px 0; color: #1f2937;">${data.equipmentType || 'Not specified'}</p>
              </td>
              <td style="padding: 8px; width: 33.33%;">
                <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Serial Number</strong>
                <p style="margin: 5px 0; color: #1f2937;">${data.equipmentSerialNo || 'Not provided'}</p>
              </td>
              <td style="padding: 8px; width: 33.33%;">
                <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Order/Invoice No</strong>
                <p style="margin: 5px 0; color: #1f2937;">${data.orderInvoiceNo || 'Not provided'}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px; width: 33.33%;">
                <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Issue Type</strong>
                <p style="margin: 5px 0; color: #1f2937;">${data.issueType || 'General'}</p>
              </td>
              <td style="padding: 8px; width: 33.33%;"></td>
              <td style="padding: 8px; width: 33.33%;"></td>
            </tr>
          </table>
        </div>
        ` : ''}

        <!-- ISSUE DETAILS SECTION -->
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">📋 Issue Details</h3>
          <div style="margin-bottom: 15px;">
            <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Subject</strong>
            <p style="margin: 5px 0; color: #1f2937; font-weight: 500;">${data.subject}</p>
          </div>
          <div>
            <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Description</strong>
            <p style="color: #6b7280; margin: 5px 0; white-space: pre-wrap; line-height: 1.5;">${data.description}</p>
          </div>
        </div>

        <!-- ATTACHMENTS SECTION -->
        ${data.attachments && data.attachments.length > 0 ? `
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">📎 Attachments</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${data.attachments.map((attachment: string, index: number) => `
              <div style="display: flex; align-items: center; padding: 10px; background: #f8fafc; border-radius: 6px;">
                <span style="color: #3b82f6; margin-right: 8px;">📄</span>
                <a href="${attachment}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">
                  File ${index + 1}
                </a>
                <span style="margin-left: auto; color: #6b7280; font-size: 12px;">Click to view</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 15px 0; color: #6b7280;">We will respond to your request as soon as possible.</p>
          <p style="margin: 0; font-size: 14px; color: #9ca3af;">
            For urgent matters, please contact your regional manager or call our support line.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>Inoksan Support Team | support@inoksan.com</p>
        <p style="margin-top: 10px;">This is an automated message. Please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;

    if (!apiKey) {
      console.error('CRITICAL: BREVO_API_KEY is not defined in environment variables');
      return NextResponse.json({ 
        success: false, 
        error: 'Email service configuration missing (API Key)',
        code: 'CONFIG_ERROR'
      }, { status: 500 });
    }

    if (!senderEmail) {
      console.warn('WARNING: BREVO_SENDER_EMAIL is not defined, using fallback: noreply@inoksan.com');
    }

    const {
      ticketId,
      email,
      companyName,
      contactPerson,
      subject,
      description,
      priority,
      country,
      equipmentType,
      regionalManager,
      emailType,
      customerEmail,
      attachments,
      equipmentSerialNo,
      orderInvoiceNo,
      issueType
    } = await request.json();

    console.log('Brevo email request received:', { ticketId, email, priority, country, emailType });

    if (!ticketId || !email || !companyName || !contactPerson || !subject) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields',
        code: 'VALIDATION_ERROR'     }, { status: 400 });
    }

    // Fetch manager emails from Firebase for CC
    let ccEmails: string[] = [];
    let fetchedRegionalManager = regionalManager;

    try {
      // 1. Fetch Regional Manager from country_managers collection directly
      // This fulfills the requirement: "it should be fetched from the table directly"
      if (country) {
        const countryManagerDoc = await getDoc(doc(db, 'country_managers', country));
        if (countryManagerDoc.exists()) {
          const managerData = countryManagerDoc.data();
          if (managerData.manager_email) {
            fetchedRegionalManager = managerData.manager_email;
            console.log(`Fetched regional manager for ${country}: ${fetchedRegionalManager}`);
          }
        }
      }

      // 2. Add the fetched (or passed) regional manager to CC
      if (fetchedRegionalManager && fetchedRegionalManager.includes('@') && !ccEmails.includes(fetchedRegionalManager)) {
        ccEmails.push(fetchedRegionalManager);
      }

      const settingsDoc = await getDoc(doc(db, 'settings', 'email'));
      if (settingsDoc.exists()) {
        const settingsData = settingsDoc.data();
        
        // 3. Add global manager email from settings
        if (settingsData.managerEmail && !ccEmails.includes(settingsData.managerEmail)) {
          ccEmails.push(settingsData.managerEmail);
        }
        
        // 4. Add forwarding email (backup support email)
        if (settingsData.forwardingEmail && !ccEmails.includes(settingsData.forwardingEmail)) {
          ccEmails.push(settingsData.forwardingEmail);
        }
      }
      console.log('Final CC emails list:', ccEmails);
    } catch (firebaseError) {
      console.error('Error fetching CC emails from Firebase:', firebaseError);
    }

    let htmlContent;
    let textContent;
    let finalSubject = `Support Ticket ${ticketId} - ${subject}`;
    
    // Create different email content based on type
    if (emailType === 'admin_notification' || emailType === 'regional_notification' || emailType === 'customer_confirmation') {
      // Use a single unified template that shows all details for everyone
      htmlContent = createTicketEmailTemplate({
        ticketId,
        companyName,
        contactPerson,
        subject,
        description,
        priority,
        country,
        equipmentType,
        regionalManager: fetchedRegionalManager,
        customerEmail: customerEmail || email,
        attachments: attachments || [],
        equipmentSerialNo,
        orderInvoiceNo,
        issueType
      });
      textContent = `Ticket ${ticketId} - ${subject} from ${companyName}.`;
      
      if (emailType === 'admin_notification') {
        finalSubject = `[NEW TICKET] ${subject}`;
      } else if (emailType === 'regional_notification') {
        finalSubject = `[REGIONAL] New Ticket ${subject}`;
      } else {
        finalSubject = `Support Ticket ${ticketId} - ${subject}`;
      }
    } else {
      // Fallback for any other type
      htmlContent = createTicketEmailTemplate({
        ticketId,
        companyName,
        contactPerson,
        subject,
        description,
        priority,
        country,
        equipmentType,
        regionalManager: fetchedRegionalManager,
        attachments: attachments || [],
        equipmentSerialNo,
        orderInvoiceNo,
        issueType
      });
      textContent = `Your support ticket ${ticketId} has been created.`;
    }

    const emailData: BrevoEmailData = {
      to: email,
      subject: finalSubject,
      htmlContent,
      textContent,
      replyTo: {
        email: regionalManager || 'support@inoksan.com',
        name: 'Inoksan Support'
      },
      cc: ccEmails.length > 0 ? ccEmails : undefined
    };

    console.log('Sending email via Brevo...');
    const result = await sendBrevoEmail(emailData);
    console.log('Brevo email sent successfully:', result);

    // Update ticket with email success status
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, {
        emailStatus: 'sent',
        lastEmailSent: serverTimestamp(),
        emailHistory: [{
          timestamp: new Date().toISOString(),
          success: true,
          recipients: [email],
          messageId: result.messageId,
          type: 'initial'
        }]
      });
      console.log('Ticket email status updated successfully');
    } catch (updateError) {
      console.error('Failed to update ticket email status:', updateError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully via Brevo',
      supportEmail: {
        id: result.messageId,
        recipients: [email]
      }
    });

  } catch (error) {
    console.error('Brevo email sending failed:', error);
    
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'Failed to send email';
    
    if (error instanceof Error) {
      if (error.message.includes('BREVO_API_KEY')) {
        errorCode = 'CONFIG_ERROR';
        errorMessage = 'Brevo API key not configured';
      } else if (error.message.includes('rate limit')) {
        errorCode = 'RATE_LIMIT_ERROR';
        errorMessage = 'Rate limit exceeded';
      } else if (error.message.includes('invalid')) {
        errorCode = 'VALIDATION_ERROR';
        errorMessage = 'Invalid email data';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      code: errorCode
    }, { status: 500 });
  }
}

// Test endpoint to check Brevo configuration
export async function GET() {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        configured: false,
        error: 'BREVO_API_KEY not configured'
      });
    }

    // Test API key validity by making a simple request to account endpoint
    console.log('Testing Brevo API key...');
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey
      }
    });

    console.log('Brevo account API response status:', response.status);
    
    const keyValid = response.ok;
    let accountData = null;
    
    if (keyValid) {
      try {
        accountData = await response.json();
        console.log('Brevo account data:', accountData);
      } catch (error) {
        console.error('Failed to parse account data:', error);
      }
    } else {
      const errorText = await response.text();
      console.log('Brevo account API error response:', errorText);
    }

    return NextResponse.json({ 
      success: true, 
      configured: true,
      keyValid,
      senderEmail: senderEmail || 'Not configured',
      account: accountData ? {
        email: accountData.email,
        firstName: accountData.firstName,
        lastName: accountData.lastName
      } : null,
      testResult: keyValid ? 'API key is valid' : 'API key appears invalid'
    });

  } catch (error) {
    console.error('Brevo configuration check failed:', error);
    return NextResponse.json({ 
      success: false, 
      configured: false,
      keyValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}