
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, writeBatch } from "firebase/firestore";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config(); // Loads .env by default
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") }); // Overrides with .env.local if present

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if config is present
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "your_api_key") {
  console.error("Error: Firebase configuration missing or invalid in .env.local");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COUNTRY_MANAGERS = [
  { country: "Turkey", manager_email: "turkey.manager@example.com" },
  { country: "United States", manager_email: "usa.manager@example.com" },
  { country: "Germany", manager_email: "germany.manager@example.com" },
  { country: "United Kingdom", manager_email: "uk.manager@example.com" },
  // Add more as needed
];

async function seed() {
  console.log("Starting database seed...");

  try {
    const batch = writeBatch(db);

    // 1. Initialize Ticket Counter
    const counterRef = doc(db, "counters", "tickets");
    batch.set(counterRef, { count: 0, date: "" }, { merge: true });
    console.log("Queued: Initialize ticket counter");

    // 2. Populate Country Managers
    const managersCollection = collection(db, "country_managers");
    
    // Optional: clear existing (be careful in production)
    // For now, we just overwrite/add based on country name as ID to prevent duplicates
    for (const manager of COUNTRY_MANAGERS) {
      // Use country name as document ID to ensure uniqueness and easy lookup
      // Note: Firestore IDs cannot contain slashes, so we sanitize if needed.
      // Country names in our list are safe.
      const docRef = doc(managersCollection, manager.country);
      batch.set(docRef, manager);
      console.log(`Queued: Manager for ${manager.country}`);
    }

    await batch.commit();
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    if (error instanceof Error && 'code' in error && error.code === 'permission-denied') {
      console.error("\nPERMISSION DENIED: Your Firestore Security Rules might be blocking this write.");
      console.error("To fix this for initial setup:");
      console.error("1. Go to Firebase Console > Firestore Database > Rules");
      console.error("2. Temporarily allow read/write: allow read, write: if true;");
      console.error("3. Run this script again.");
      console.error("4. Restore secure rules.");
    }
  }
}

seed();
