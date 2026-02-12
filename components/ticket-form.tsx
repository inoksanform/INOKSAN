"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Upload, X, Loader2, CheckCircle, AlertCircle, Building2, User as UserIcon, Mail, Globe, FileText, Hash, Tag, AlertTriangle, Layers, MessageSquare, Info } from "lucide-react";
import { clsx } from "clsx";
import { db } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp, updateDoc, getDoc } from "firebase/firestore";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type FormData = {
  companyName: string;
  contactPerson: string;
  email: string;
  country: string;
  orderInvoiceNo: string;
  equipmentSerialNo: string;
  productModel: string;
  issueType: string;
  subject: string;
  description: string;
  priority: string;
};

const ISSUE_TYPES = [
  "Installation",
  "Technical issue",
  "Spare parts",
  "Warranty",
  "Other",
];

const PRIORITIES = [
  "Normal",
  "Urgent (equipment stopped)",
  "Critical",
  "High",
  "Low",
];

const COUNTRIES = [
  "Turkey", "United States", "United Kingdom", "Germany", "France", "Italy", "Spain", "Netherlands",
  "Russia", "China", "Japan", "South Korea", "India", "Brazil", "Mexico", "Canada", "Australia",
  "United Arab Emirates", "Saudi Arabia", "Egypt", "South Africa", "Other"
];

// Regional manager mapping based on country
const getRegionalManager = (country: string): string => {
  const regionalManagers: { [key: string]: string } = {
    "Turkey": "regional.tr@inoksan.com",
    "United Kingdom": "regional.uk@inoksan.com",
    "Germany": "regional.de@inoksan.com",
    "United States": "regional.us@inoksan.com",
    "France": "regional.fr@inoksan.com",
    "Italy": "regional.it@inoksan.com",
    "Spain": "regional.es@inoksan.com",
    "Netherlands": "regional.nl@inoksan.com",
    "Russia": "regional.ru@inoksan.com",
    "China": "regional.cn@inoksan.com",
    "Japan": "regional.jp@inoksan.com",
    "South Korea": "regional.kr@inoksan.com",
    "India": "regional.in@inoksan.com",
    "Brazil": "regional.br@inoksan.com",
    "Mexico": "regional.mx@inoksan.com",
    "Canada": "regional.ca@inoksan.com",
    "Australia": "regional.au@inoksan.com",
    "United Arab Emirates": "regional.ae@inoksan.com",
    "Saudi Arabia": "regional.sa@inoksan.com",
    "Egypt": "regional.eg@inoksan.com",
    "South Africa": "regional.za@inoksan.com",
    "Other": "regional.intl@inoksan.com"
  };
  
  return regionalManagers[country] || "regional.intl@inoksan.com";
};

export default function TicketForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    defaultValues: {
      companyName: '',
      contactPerson: '',
      email: '',
      country: '',
      orderInvoiceNo: '',
      equipmentSerialNo: '',
      productModel: '',
      issueType: '',
      subject: '',
      description: '',
      priority: 'medium'
    }
  });

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        setAuthChecked(true);
        console.log('Auth check completed:', currentUser ? 'Authenticated' : 'Not authenticated');
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthChecked(true);
      }
    };
    
    checkAuth();
  }, []);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setEmailWarning(null);

    try {
      // Check authentication before upload
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const isAuthenticated = !!currentUser;

      // 0. Get Regional Manager from Firestore
      let regionalManager = "regional.intl@inoksan.com";
      try {
        const managerDoc = await getDoc(doc(db, "country_managers", data.country));
        if (managerDoc.exists()) {
          regionalManager = managerDoc.data().manager_email || regionalManager;
        } else {
          // Fallback to static mapping if document doesn't exist
          regionalManager = getRegionalManager(data.country);
        }
      } catch (err) {
        console.error("Error fetching regional manager:", err);
        regionalManager = getRegionalManager(data.country);
      }

      // 1. Upload files to Supabase
      const attachmentUrls: string[] = [];
      
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          
          console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type);
          console.log('Authenticated:', isAuthenticated);
          
          try {
            // Upload with metadata to help with RLS policies
            const { error: uploadError } = await supabase.storage
              .from('ticket-attachments')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
              });
              
            if (uploadError) {
              console.error('Error uploading file:', uploadError);
              console.error('Upload details:', {
                fileName,
                fileSize: file.size,
                fileType: file.type,
                bucket: 'ticket-attachments',
                user: currentUser?.email || 'Not authenticated',
                errorCode: uploadError.statusCode,
                errorMessage: uploadError.message
              });
              
              // If upload fails due to authentication, try without authentication
              if ((uploadError.statusCode && String(uploadError.statusCode) === '401') || uploadError.message.includes('JWT')) {
                console.log('Retrying upload without authentication context...');
                
                // Create a new client without auth context for this upload
                const { createClient } = await import('@supabase/supabase-js');
                const publicClient = createClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
                );
                
                const { error: retryError } = await publicClient.storage
                  .from('ticket-attachments')
                  .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                  });
                  
                if (retryError) {
                  throw new Error(`File upload failed after retry: ${retryError.message}`);
                }
              } else {
                throw new Error(`File upload failed: ${uploadError.message}`);
              }
            }
            
            const { data: publicUrlData } = supabase.storage
              .from('ticket-attachments')
              .getPublicUrl(fileName);
              
            attachmentUrls.push(publicUrlData.publicUrl);
            
          } catch (uploadErr) {
            console.error('Upload attempt failed:', uploadErr);
            throw uploadErr;
          }
        }
      }

      // 2. Save to Firestore with Transaction for Ticket ID
      let newTicketId = "";
      
      await runTransaction(db, async (transaction) => {
        // Reference to the counter document
        const counterRef = doc(db, "counters", "tickets");
        const counterDoc = await transaction.get(counterRef);
        
        let currentCount = 0;
        if (counterDoc.exists()) {
          currentCount = counterDoc.data().count || 0;
        }
        
        const newCount = currentCount + 1;
        
        // Generate formatted ID (e.g., TKT-2024-0001)
        const year = new Date().getFullYear();
        newTicketId = `TKT-${year}-${newCount.toString().padStart(4, '0')}`;
        
        // Update counter
        transaction.set(counterRef, { count: newCount }, { merge: true });
        
        // Create ticket document with custom ID
        const ticketRef = doc(db, "tickets", newTicketId);
        
        transaction.set(ticketRef, {
          ...data,
          ticketId: newTicketId,
          attachments: attachmentUrls,
          status: "New",
          regionalManager: regionalManager,
          createdAt: serverTimestamp(),
          emailStatus: 'pending',
          emailHistory: []
        });
      });

      // 3. Send Emails via Brevo (Server-side)
      console.log('Starting Brevo email sending process for ticket:', newTicketId);
      try {
        // Send ONLY ONE email to customer with CC to admin and regional manager
        const emailRes = await fetch('/api/brevo-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.email, // Main recipient: customer
            ticketId: newTicketId,
            companyName: data.companyName,
            contactPerson: data.contactPerson,
            subject: data.subject,
            description: data.description,
            country: data.country,
            phoneNumber: '', // Will be added when phone field is implemented
            equipmentType: data.productModel,
            priority: data.priority,
            regionalManager: regionalManager,
            emailType: 'customer_confirmation', // Send customer template
            attachments: attachmentUrls,
            equipmentSerialNo: data.equipmentSerialNo,
            orderInvoiceNo: data.orderInvoiceNo,
            issueType: data.issueType
          })
        });
        
        console.log('Email sent with CC response:', emailRes.status);
        
        console.log('Brevo email API response status:', emailRes.status);
        
        if (!emailRes.ok) {
          const payload = await emailRes.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Email API error response:', payload);
          
          let errorMessage = 'Email notification could not be sent.';
          if (payload.code === 'CONFIG_ERROR') {
            errorMessage = 'Email service is temporarily unavailable. Your ticket has been saved successfully.';
          } else if (payload.code === 'RATE_LIMIT_ERROR') {
            errorMessage = 'Email service is currently busy. Your ticket has been saved and we will contact you soon.';
          } else if (payload.code === 'VALIDATION_ERROR') {
            errorMessage = 'Email notification failed due to invalid data, but your ticket has been saved.';
          } else if (payload.code === 'NETWORK_ERROR') {
            errorMessage = 'Network error prevented email delivery. Your ticket has been saved successfully.';
          } else if (payload.error) {
            errorMessage = payload.error;
          }
          
          setEmailWarning(errorMessage);
        } else {
          const emailData = await emailRes.json();
          console.log('Email sent successfully:', emailData);
          
          // Update ticket with email success status
          try {
            const ticketRef = doc(db, "tickets", newTicketId);
            await updateDoc(ticketRef, {
              emailStatus: 'sent',
              lastEmailSent: serverTimestamp(),
              emailHistory: [{
                timestamp: new Date().toISOString(),
                success: true,
                recipients: emailData.supportEmail?.recipients || [data.email],
                messageId: emailData.supportEmail?.id,
                type: 'initial'
              }]
            });
            console.log('Ticket email status updated successfully');
          } catch (updateError) {
            console.error('Failed to update ticket email status:', updateError);
          }
        }
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        setEmailWarning('Email could not be sent.');
      }

      setTicketId(newTicketId);
      setSubmitSuccess(true);
      reset();
      setFiles([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Error submitting ticket:", error);
      setSubmitError("Failed to submit ticket. Please try again. " + (error instanceof Error ? error.message : ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (submitSuccess) {
    return (
      <div className="rounded-2xl bg-green-50 p-8 text-center ring-1 ring-green-200 shadow-sm animate-in fade-in zoom-in duration-500">
        <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
        <h3 className="text-2xl font-bold text-green-800">Ticket Submitted Successfully!</h3>
        {ticketId && (
          <div className="mt-4 mb-4 rounded-lg bg-white p-4 ring-1 ring-green-200 inline-block">
             <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Your Ticket ID</p>
             <p className="text-3xl font-mono font-bold text-red-600 tracking-tight">{ticketId}</p>
          </div>
        )}
        <p className="mt-2 text-green-700">
          We have received your request and will get back to you shortly.
          You should receive a confirmation email soon.
        </p>
        <button
          onClick={() => {
            setSubmitSuccess(false);
            setTicketId(null);
          }}
          className="mt-8 rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-colors"
        >
          Submit Another Ticket
        </button>
      </div>
    );
  }

  // Show authentication loading state
  if (!authChecked) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-2 text-gray-600">Checking authentication...</span>
      </div>
    );
  }

  // Show informational message for anonymous users
  if (!user) {
    console.log('Anonymous user detected - allowing ticket submission without authentication');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      {submitError && (
        <div className="rounded-md bg-red-50 p-4 ring-1 ring-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Submission Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{submitError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Company Information */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-2">
          <h3 className="text-lg font-semibold leading-6 text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-red-600" />
            Company Information
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="companyName" className="block text-sm font-medium leading-6 text-gray-900">
              Company Name *
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Building2 className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="companyName"
                className={clsx(
                  "block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all",
                  errors.companyName && "ring-red-300 focus:ring-red-500"
                )}
                placeholder="Inoksan Ltd."
                {...register("companyName", { required: "Company name is required" })}
              />
            </div>
            {errors.companyName && (
              <p className="mt-2 text-sm text-red-600">{errors.companyName.message}</p>
            )}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="country" className="block text-sm font-medium leading-6 text-gray-900">
              Country *
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Globe className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <select
                id="country"
                className={clsx(
                  "block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all",
                  errors.country && "ring-red-300 focus:ring-red-500"
                )}
                {...register("country", { required: "Country is required" })}
              >
                <option value="">Select a country</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
            {errors.country && (
              <p className="mt-2 text-sm text-red-600">{errors.country.message}</p>
            )}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="contactPerson" className="block text-sm font-medium leading-6 text-gray-900">
              Contact Person *
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="contactPerson"
                className={clsx(
                  "block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all",
                  errors.contactPerson && "ring-red-300 focus:ring-red-500"
                )}
                placeholder="John Doe"
                {...register("contactPerson", { required: "Contact person is required" })}
              />
            </div>
            {errors.contactPerson && (
              <p className="mt-2 text-sm text-red-600">{errors.contactPerson.message}</p>
            )}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
              Email Address *
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="email"
                id="email"
                className={clsx(
                  "block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all",
                  errors.email && "ring-red-300 focus:ring-red-500"
                )}
                placeholder="john@example.com"
                {...register("email", { 
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address"
                  }
                })}
              />
            </div>
            {errors.email && (
              <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Equipment Details */}
      <div className="space-y-6 pt-4">
        <div className="border-b border-gray-200 pb-2">
          <h3 className="text-lg font-semibold leading-6 text-gray-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-red-600" />
            Equipment Details
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="productModel" className="block text-sm font-medium leading-6 text-gray-900">
              Product Model *
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Tag className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="productModel"
                className={clsx(
                  "block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all",
                  errors.productModel && "ring-red-300 focus:ring-red-500"
                )}
                placeholder="e.g. Inosmart Oven"
                {...register("productModel", { required: "Product model is required" })}
              />
            </div>
            {errors.productModel && (
              <p className="mt-2 text-sm text-red-600">{errors.productModel.message}</p>
            )}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="equipmentSerialNo" className="block text-sm font-medium leading-6 text-gray-900">
              Serial Number *
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Hash className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="equipmentSerialNo"
                className={clsx(
                  "block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all",
                  errors.equipmentSerialNo && "ring-red-300 focus:ring-red-500"
                )}
                placeholder="SN-12345678"
                {...register("equipmentSerialNo", { required: "Serial number is required" })}
              />
            </div>
            {errors.equipmentSerialNo && (
              <p className="mt-2 text-sm text-red-600">{errors.equipmentSerialNo.message}</p>
            )}
          </div>

          <div className="col-span-2">
            <label htmlFor="orderInvoiceNo" className="block text-sm font-medium leading-6 text-gray-900">
              Order / Invoice Number
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <FileText className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="orderInvoiceNo"
                className="block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all"
                placeholder="INV-2024-001"
                {...register("orderInvoiceNo")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Issue Details */}
      <div className="space-y-6 pt-4">
        <div className="border-b border-gray-200 pb-2">
          <h3 className="text-lg font-semibold leading-6 text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Issue Details
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="issueType" className="block text-sm font-medium leading-6 text-gray-900">
              Issue Type *
            </label>
            <div className="relative mt-2">
               <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <AlertCircle className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <select
                id="issueType"
                className={clsx(
                  "block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all",
                  errors.issueType && "ring-red-300 focus:ring-red-500"
                )}
                {...register("issueType", { required: "Issue type is required" })}
              >
                <option value="">Select issue type</option>
                {ISSUE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            {errors.issueType && (
              <p className="mt-2 text-sm text-red-600">{errors.issueType.message}</p>
            )}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="priority" className="block text-sm font-medium leading-6 text-gray-900">
              Priority Level *
            </label>
            <div className="relative mt-2">
               <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <AlertTriangle className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <select
                id="priority"
                className={clsx(
                  "block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all",
                  errors.priority && "ring-red-300 focus:ring-red-500"
                )}
                {...register("priority", { required: "Priority is required" })}
              >
                <option value="">Select priority</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {errors.priority && (
              <p className="mt-2 text-sm text-red-600">{errors.priority.message}</p>
            )}
          </div>

          <div className="col-span-2">
            <label htmlFor="subject" className="block text-sm font-medium leading-6 text-gray-900">
              Subject *
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MessageSquare className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="subject"
                className={clsx(
                  "block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all",
                  errors.subject && "ring-red-300 focus:ring-red-500"
                )}
                placeholder="Brief summary of the issue"
                {...register("subject", { required: "Subject is required" })}
              />
            </div>
            {errors.subject && (
              <p className="mt-2 text-sm text-red-600">{errors.subject.message}</p>
            )}
          </div>

          <div className="col-span-2">
            <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900">
              Detailed Description *
            </label>
            <div className="mt-2">
              <textarea
                id="description"
                rows={4}
                className={clsx(
                  "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all",
                  errors.description && "ring-red-300 focus:ring-red-500"
                )}
                placeholder="Please describe the issue in detail..."
                {...register("description", { required: "Description is required" })}
              />
            </div>
            {errors.description && (
              <p className="mt-2 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Attachments (Photos/Videos)
            </label>
            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 hover:bg-gray-50 transition-colors">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                <div className="mt-4 flex text-sm leading-6 text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md bg-white font-semibold text-red-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-red-600 focus-within:ring-offset-2 hover:text-red-500"
                  >
                    <span>Upload files</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                      onChange={handleFileChange}
                      accept="image/*,video/*,.pdf"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs leading-5 text-gray-600">PNG, JPG, PDF, MP4 up to 10MB</p>
              </div>
            </div>
            
            {/* File Preview List */}
            {files.length > 0 && (
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm ring-1 ring-gray-200">
                    <span className="truncate max-w-[80%]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full justify-center rounded-full bg-red-600 px-3 py-4 text-sm font-semibold text-white shadow-lg shadow-red-500/30 hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Ticket"
          )}
        </button>
      </div>
    </form>
  );
}
