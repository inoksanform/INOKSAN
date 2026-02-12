'use client';

import { useState, useEffect } from 'react';
import { Mail, Settings, AlertCircle, CheckCircle, RotateCcw, Send, TestTube } from 'lucide-react';

export default function EmailDiagnostics() {
  const [emailStatus, setEmailStatus] = useState<{
    configured: boolean;
    keyValid: boolean;
    testResult: string;
  } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    checkEmailStatus();
  }, []);

  const checkEmailStatus = async () => {
    try {
      const response = await fetch('/api/brevo-send');
      const data = await response.json();
      setEmailStatus(data);
    } catch (error) {
      console.error('Failed to check Brevo status:', error);
      setEmailStatus({
        configured: false,
        keyValid: false,
        testResult: 'Failed to check Brevo status'
      });
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      setTestResult('Please enter an email address');
      return;
    }

    setIsTesting(true);
    setTestResult('');

    try {
      const response = await fetch('/api/brevo-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticketId: 'TEST-001',
          email: testEmail,
          companyName: 'Test Company',
          contactPerson: 'Test User',
          subject: 'Test Email - Inoksan Support',
          description: 'This is a test email from the Inoksan support system.',
          priority: 'Medium',
          country: 'Test Country',
          equipmentType: 'Test Equipment',
          regionalManager: 'support@inoksan.com'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setTestResult(`✅ Test email sent successfully to ${testEmail}! Check your inbox.`);
      } else {
        setTestResult(`❌ Failed to send test email: ${data.error}`);
      }
    } catch (error) {
      setTestResult(`❌ Error sending test email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const resendFailedEmails = async () => {
    // This would be implemented to resend all failed emails
    setTestResult('🔄 Feature coming soon - will resend failed emails');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Email Diagnostics</h1>
          <p className="text-gray-400">Check email configuration and troubleshoot sending issues</p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <Settings className="h-6 w-6 text-blue-400" />
              <h3 className="text-lg font-semibold">Configuration</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {emailStatus?.configured ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm">API Key Configured</span>
              </div>
              <div className="flex items-center gap-2">
                {emailStatus?.keyValid ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm">API Key Valid</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <TestTube className="h-6 w-6 text-purple-400" />
              <h3 className="text-lg font-semibold">Test Status</h3>
            </div>
            <div className="text-sm text-gray-300">
              {emailStatus ? 'System checked' : 'Checking...'}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <Mail className="h-6 w-6 text-green-400" />
              <h3 className="text-lg font-semibold">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={checkEmailStatus}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Refresh Status
              </button>
              <button
                onClick={resendFailedEmails}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 rounded transition-colors"
              >
                <Send className="h-4 w-4" />
                Resend Failed
              </button>
            </div>
          </div>
        </div>

        {/* Test Email Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h3 className="text-lg font-semibold mb-4">Send Test Email</h3>
          <div className="flex gap-4 mb-4">
            <input
              type="email"
              placeholder="Enter test email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={sendTestEmail}
              disabled={isTesting}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors flex items-center gap-2"
            >
              {isTesting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Test
                </>
              )}
            </button>
          </div>
          {testResult && (
            <div className={`p-3 rounded text-sm ${testResult.includes('✅') ? 'bg-green-900/50 border border-green-700 text-green-300' : 'bg-red-900/50 border border-red-700 text-red-300'}`}>
              {testResult}
            </div>
          )}
        </div>

        {/* Troubleshooting Guide */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Troubleshooting Guide</h3>
          <div className="space-y-4 text-sm text-gray-300">
            <div>
              <h4 className="font-semibold text-white mb-2">Common Issues:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>API Key not configured - Check your .env file for BREVO_API_KEY</li>
                <li>Invalid API key format - Should be a valid Brevo v3 API key</li>
                <li>Rate limiting - Brevo has daily limits on free accounts</li>
                <li>Invalid recipient email - Check email format and domain</li>
                <li>Sender domain not verified - Configure sender in Brevo dashboard</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Solutions:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Verify BREVO_API_KEY in environment variables</li>
                <li>Check Brevo dashboard for API key status and limits</li>
                <li>Configure sender domain in Brevo settings</li>
                <li>Test with a valid email address first</li>
                <li>Check Brevo logs for detailed error messages</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Alternative Email Services */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-8">
          <h3 className="text-lg font-semibold mb-4">Alternative Email Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700 p-4 rounded">
              <h4 className="font-semibold text-white mb-2">SendGrid</h4>
              <p className="text-sm text-gray-300 mb-3">Popular email service with good deliverability</p>
              <button
                onClick={() => window.open('https://sendgrid.com', '_blank')}
                className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors"
              >
                Learn More
              </button>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <h4 className="font-semibold text-white mb-2">Mailgun</h4>
              <p className="text-sm text-gray-300 mb-3">Reliable email API with good analytics</p>
              <button
                onClick={() => window.open('https://mailgun.com', '_blank')}
                className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors"
              >
                Learn More
              </button>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <h4 className="font-semibold text-white mb-2">Amazon SES</h4>
              <p className="text-sm text-gray-300 mb-3">Cost-effective email service from AWS</p>
              <button
                onClick={() => window.open('https://aws.amazon.com/ses/', '_blank')}
                className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors"
              >
                Learn More
              </button>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <h4 className="font-semibold text-white mb-2">SMTP</h4>
              <p className="text-sm text-gray-300 mb-3">Use your own SMTP server</p>
              <button
                onClick={() => setTestResult('🔄 SMTP integration coming soon!')}
                className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}