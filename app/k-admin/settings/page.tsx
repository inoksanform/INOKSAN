'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Mail, Globe, UserCheck, Send, RotateCcw } from 'lucide-react';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function SettingsPage() {
  const [managerEmail, setManagerEmail] = useState('');
  const [forwardingEmail, setForwardingEmail] = useState('');
  const [countries, setCountries] = useState([
    { code: 'TR', name: 'Turkey', email: 'support.tr@inoksan.com', enabled: true },
    { code: 'UK', name: 'United Kingdom', email: 'support.uk@inoksan.com', enabled: true },
    { code: 'DE', name: 'Germany', email: 'support.de@inoksan.com', enabled: true },
  ]);
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
        if (data.countries) {
          setCountries(data.countries);
        }
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
        countries,
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

  const addCountry = () => {
    setCountries([...countries, { 
      code: '', 
      name: '', 
      email: '', 
      enabled: true 
    }]);
  };

  const updateCountry = (index: number, field: string, value: any) => {
    const updated = [...countries];
    updated[index] = { ...updated[index], [field]: value };
    setCountries(updated);
  };

  const removeCountry = (index: number) => {
    setCountries(countries.filter((_, i) => i !== index));
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: 'TEST-001',
          companyName: 'Test Company',
          equipmentType: 'Test Equipment',
          issueDescription: 'This is a test email to verify email forwarding settings.',
          contactPerson: 'Test User',
          phoneNumber: '+1234567890',
          country: 'TR',
          priority: 'Normal',
          toEmail: testEmail,
          isTest: true
        }),
      });

      if (response.ok) {
        alert('Test email sent successfully!');
        setTestEmail('');
      } else {
        alert('Error sending test email. Please check your settings.');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Error sending test email.');
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

      {/* Country Specific Routing */}
      <div className="bg-[#2C2F36] rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-400" />
              Regional Support Routing
            </h2>
            <p className="text-sm text-gray-400 mt-1">Route tickets to specific teams based on location (CC'd to forwarding email)</p>
          </div>
          <button 
            onClick={addCountry}
            className="text-[#ee3035] hover:text-white text-sm font-medium flex items-center gap-1 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Region
          </button>
        </div>
        
        <div className="divide-y divide-gray-700">
          {countries.map((country, index) => (
            <div key={index} className="p-6 flex items-center gap-4 group hover:bg-[#3A3D45] transition-colors">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={country.enabled}
                  onChange={(e) => updateCountry(index, 'enabled', e.target.checked)}
                  className="rounded border-gray-600 text-[#ee3035] focus:ring-[#ee3035]"
                />
              </div>
              
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Country Code</label>
                  <input 
                    type="text" 
                    value={country.code}
                    onChange={(e) => updateCountry(index, 'code', e.target.value.toUpperCase())}
                    placeholder="TR"
                    className="w-full bg-[#3A3D45] text-white px-3 py-2 rounded border border-gray-600 focus:border-[#ee3035] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Country Name</label>
                  <input 
                    type="text" 
                    value={country.name}
                    onChange={(e) => updateCountry(index, 'name', e.target.value)}
                    placeholder="Turkey"
                    className="w-full bg-[#3A3D45] text-white px-3 py-2 rounded border border-gray-600 focus:border-[#ee3035] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Support Email</label>
                  <input 
                    type="email" 
                    value={country.email}
                    onChange={(e) => updateCountry(index, 'email', e.target.value)}
                    placeholder="support.tr@inoksan.com"
                    className="w-full bg-[#3A3D45] text-white px-3 py-2 rounded border border-gray-600 focus:border-[#ee3035] outline-none text-sm"
                  />
                </div>
              </div>
              
              <button 
                onClick={() => removeCountry(index)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-[#ee3035] transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-[#3A3D45]/30">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Changes to routing rules take effect immediately. Disabled regions will not receive CC emails.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={loadSettings}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
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