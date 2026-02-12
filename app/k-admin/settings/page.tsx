'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Mail, Globe, UserCheck, Send, RotateCcw } from 'lucide-react';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function SettingsPage() {
  const [managerEmail, setManagerEmail] = useState('');
  const [forwardingEmail, setForwardingEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingsDoc = await getDoc(doc(db, 'settings', 'email'));
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setManagerEmail(data.managerEmail || 'manager@inoksan.com');
        setForwardingEmail(data.forwardingEmail || '');
      } else {
        // Default settings
        setManagerEmail('manager@inoksan.com');
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await setDoc(doc(db, 'settings', 'email'), {
        managerEmail,
        forwardingEmail,
        updatedAt: new Date()
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/brevo-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: 'TEST-CONNECTION',
          companyName: 'Inoksan Test',
          contactPerson: 'Admin User',
          email: testEmail,
          subject: 'Test Connection - Brevo Email Service',
          description: 'This is a test email to verify your Brevo configuration.',
          priority: 'Normal',
          country: 'Turkey',
          emailType: 'customer_confirmation'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Test email sent successfully via Brevo!');
        setTestEmail('');
      } else {
        alert(`Error sending test email: ${data.error || 'Check Netlify logs for details'}`);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Error sending test email. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white">Email Configuration</h1>
        <p className="text-gray-400 mt-1">Manage email routing and notifications</p>
      </header>

      {/* Ticket Forwarding Email */}
      <div className="bg-[#2C2F36] rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#ee3035]" />
            Ticket Forwarding Email
          </h2>
          <p className="text-sm text-gray-400 mt-1">All ticket submissions will be forwarded to this email address</p>
        </div>
        <div className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Primary Forwarding Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="email" 
                  value={forwardingEmail}
                  onChange={(e) => setForwardingEmail(e.target.value)}
                  placeholder="support@inoksan.com"
                  className="w-full bg-[#3A3D45] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-[#ee3035] outline-none"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This email will receive all ticket submissions. Manager CC and regional routing will be applied automatically.
              </p>
            </div>
          </div>

          {/* Test Email Section */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-white mb-3">Test Email Configuration</h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <input 
                  type="email" 
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter test email address"
                  className="w-full bg-[#3A3D45] text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-[#ee3035] outline-none"
                />
              </div>
              <button 
                onClick={sendTestEmail}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Send Test
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manager Notifications */}
      <div className="bg-[#2C2F36] rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-[#ee3035]" />
            Manager Notifications
          </h2>
          <p className="text-sm text-gray-400 mt-1">This email will be CC'd on all ticket submissions</p>
        </div>
        <div className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Manager Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="email" 
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="manager@inoksan.com"
                  className="w-full bg-[#3A3D45] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-[#ee3035] outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Regional Support Routing Information */}
      <div className="bg-[#2C2F36] rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-400" />
              Regional Support Routing
            </h2>
            <p className="text-sm text-gray-400 mt-1">Managed directly in Firestore <code>country_managers</code> collection</p>
          </div>
        </div>
        
        <div className="p-6">
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4 mb-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-400 shrink-0" />
              <div className="text-sm text-blue-100">
                <p className="font-semibold mb-1">Direct Collection Fetching Enabled</p>
                <p>Regional manager emails are now fetched directly from the <code>country_managers</code> collection in Firestore based on the country name.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-300">To manage regional routing, please edit the <code>country_managers</code> collection in your Firebase console:</p>
            <div className="bg-[#1A1C21] p-4 rounded-lg font-mono text-xs text-gray-400 space-y-2">
              <p className="text-gray-200">// Example Document Structure</p>
              <p>Collection: <span className="text-blue-400">country_managers</span></p>
              <p>Document ID: <span className="text-green-400">"Austria"</span></p>
              <p>Fields:</p>
              <p className="pl-4">manager_email: <span className="text-orange-400">"bora.kara@inoksan.com.tr"</span></p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-[#3A3D45]/30">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Changes made in the Firebase console take effect immediately.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={saveSettings}
                disabled={saving}
                className="bg-[#ee3035] text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}