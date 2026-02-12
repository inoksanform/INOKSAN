import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test email data
    const testData = {
      email: 'test@example.com',
      ticketId: 'TEST-001',
      companyName: 'Test Company',
      contactPerson: 'Test Person',
      subject: 'Test Email Subject',
      description: 'This is a test email description',
      country: 'Turkey',
      phoneNumber: '',
      equipmentType: 'Test Model',
      priority: 'Medium',
      regionalManager: 'regional@inoksan.com',
      emailType: 'customer_confirmation',
      attachments: [],
      equipmentSerialNo: 'TEST123',
      orderInvoiceNo: 'INV123',
      issueType: 'Technical'
    };

    // Make request to brevo-send API
    const response = await fetch('http://localhost:3000/api/brevo-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      testData,
      apiResponse: result,
      message: 'Test email API call completed'
    });

  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Test email API call failed'
    }, { status: 500 });
  }
}