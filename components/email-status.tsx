'use client';

import { useState, useEffect } from 'react';
import { Mail, MailCheck, MailX, RotateCcw, AlertCircle } from 'lucide-react';

interface EmailStatus {
  ticketId: string;
  emailStatus: 'sent' | 'failed' | 'unknown';
  lastEmailSent?: string;
  emailHistory: Array<{
    timestamp: string;
    success: boolean;
    recipients?: string[];
    error?: string;
    type: 'initial' | 'resend' | 'resend_failed';
  }>;
  canResend: boolean;
}

interface EmailStatusProps {
  ticketId: string;
  email: string;
}

export default function EmailStatus({ ticketId, email }: EmailStatusProps) {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmailStatus();
  }, [ticketId]);

  const fetchEmailStatus = async () => {
    try {
      const response = await fetch(`/api/brevo-send?ticketId=${ticketId}`);
      const data = await response.json();
      
      if (data.success) {
        setStatus(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch email status');
    } finally {
      setLoading(false);
    }
  };

  const resendEmail = async () => {
    setResending(true);
    setError(null);
    
    try {
      const response = await fetch('/api/brevo-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, email })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to resend email');
    } finally {
      setResending(false);
      fetchEmailStatus(); // Refresh status
    }
  };

  const testEmail = async () => {
    setResending(true);
    setError(null);
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: email })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setError(null);
        alert('Test email sent successfully! Check your inbox.');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to send test email');
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Mail className="h-4 w-4 animate-pulse" />
        <span className="text-sm">Loading email status...</span>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (status?.emailStatus) {
      case 'sent':
        return <MailCheck className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <MailX className="h-4 w-4 text-red-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status?.emailStatus) {
      case 'sent':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Email Status</h3>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor()}`}>
            {status?.emailStatus === 'sent' ? 'Sent' : 
             status?.emailStatus === 'failed' ? 'Failed' : 'Unknown'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          {error}
        </div>
      )}

      {status?.lastEmailSent && (
        <div className="mb-3 text-xs text-gray-500">
          Last sent: {new Date(status.lastEmailSent).toLocaleString()}
        </div>
      )}

      {status?.emailHistory && status.emailHistory.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Email History</h4>
          <div className="space-y-1">
            {status.emailHistory.slice(-3).map((entry, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className={entry.success ? 'text-green-600' : 'text-red-600'}>
                  {entry.success ? '✓' : '✗'} {entry.type === 'resend' ? 'Resent' : 'Initial'}
                </span>
                <span className="text-gray-500">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={resendEmail}
          disabled={!status?.canResend || resending}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="h-3 w-3" />
          Resend
        </button>
        
        <button
          onClick={testEmail}
          disabled={resending}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          <Mail className="h-3 w-3" />
          Test
        </button>
      </div>

      {!status?.canResend && (
        <div className="mt-2 text-xs text-orange-600">
          Maximum resend attempts reached. Contact support if needed.
        </div>
      )}
    </div>
  );
}