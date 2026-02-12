
"use client";

import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Mail, Globe, UserCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export default function SettingsPage() {
  const [managerEmail, setManagerEmail] = useState('manager@inoksan.com');
  const [countries, setCountries] = useState([
    { code: 'TR', name: 'Turkey', email: 'support.tr@inoksan.com', regionalManager: 'regional.tr@inoksan.com' },
    { code: 'UK', name: 'United Kingdom', email: 'support.uk@inoksan.com', regionalManager: 'regional.uk@inoksan.com' },
    { code: 'DE', name: 'Germany', email: 'support.de@inoksan.com', regionalManager: 'regional.de@inoksan.com' },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings from Firebase
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'email'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setManagerEmail(data.managerEmail || 'manager@inoksan.com');
          setCountries(data.countries || countries);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to Firebase
  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'email'), {
        managerEmail,
        countries,
        updatedAt: new Date()
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Update regional manager for a country
  const updateRegionalManager = (index: number, regionalManager: string) => {
    const updatedCountries = [...countries];
    updatedCountries[index].regionalManager = regionalManager;
    setCountries(updatedCountries);
  };

  // Update support email for a country
  const updateSupportEmail = (index: number, email: string) => {
    const updatedCountries = [...countries];
    updatedCountries[index].email = email;
    setCountries(updatedCountries);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-[#ee3035] border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white">Email Configuration</h1>
        <p className="text-gray-400 mt-1">Manage email routing and notifications</p>
      </header>

      {/* Global Manager Settings */}
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
                  className="w-full bg-[#3A3D45] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-[#ee3035] outline-none"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-[#ee3035] text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </button>
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
            <p className="text-sm text-gray-400 mt-1">Route tickets to specific teams based on location</p>
          </div>
          <button className="text-[#ee3035] hover:text-white text-sm font-medium flex items-center gap-1 transition-colors">
            <Plus className="h-4 w-4" />
            Add Region
          </button>
        </div>
        
        <div className="divide-y divide-gray-700">
          {countries.map((country, index) => (
            <div key={country.code} className="p-6 flex items-center gap-4 group hover:bg-[#3A3D45] transition-colors">
              <div className="w-16">
                <span className="bg-[#3A3D45] text-white text-xs font-bold px-2 py-1 rounded border border-gray-600">
                  {country.code}
                </span>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Country Name</label>
                  <input 
                    type="text" 
                    value={country.name}
                    readOnly
                    className="w-full bg-transparent text-white border-none p-0 focus:ring-0 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Support Email</label>
                  <input 
                    type="email" 
                    value={country.email}
                    onChange={(e) => updateSupportEmail(index, e.target.value)}
                    className="w-full bg-[#3A3D45] text-white border border-gray-600 rounded px-2 py-1 text-sm focus:border-[#ee3035] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Regional Manager</label>
                  <input 
                    type="email" 
                    value={country.regionalManager}
                    onChange={(e) => updateRegionalManager(index, e.target.value)}
                    className="w-full bg-[#3A3D45] text-white border border-gray-600 rounded px-2 py-1 text-sm focus:border-[#ee3035] outline-none"
                  />
                </div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-[#ee3035] transition-all">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-[#3A3D45]/30 text-center">
          <p className="text-xs text-gray-500">
            Note: Changes to routing rules take effect immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
