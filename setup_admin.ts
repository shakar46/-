import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

// Robust Private Key Formatting
const formatPrivateKey = (key: string | undefined): string => {
  if (!key) return "";
  
  let formatted = key;
  
  // Handle JSON string if passed as raw environment variable
  try {
    if (key.trim().startsWith("{")) {
      const json = JSON.parse(key);
      formatted = json.private_key || key;
    }
  } catch (e) {
    // Not JSON, continue
  }

  // Handle escaped newlines
  formatted = formatted.replace(/\\n/g, "\n");
  
  // Remove accidental quotes
  formatted = formatted.replace(/^['"]|['"]$/g, "").trim();

  // Wrap in headers if missing
  if (formatted && !formatted.includes("-----BEGIN PRIVATE KEY-----")) {
    formatted = `-----BEGIN PRIVATE KEY-----\n${formatted}\n-----END PRIVATE KEY-----`;
  }
  
  return formatted;
};

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || config.projectId || "shakar-b3be8",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL,
  privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY),
  databaseId: config.firestoreDatabaseId || "(default)"
};

if (!firebaseAdminConfig.projectId || !firebaseAdminConfig.clientEmail || !firebaseAdminConfig.privateKey) {
  console.error("Missing Firebase Admin credentials (tried fallbacks) in .env");
  process.exit(1);
}

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: firebaseAdminConfig.projectId,
    clientEmail: firebaseAdminConfig.clientEmail,
    privateKey: firebaseAdminConfig.privateKey,
  }),
});

console.log(`Firebase Admin initialized for project: ${firebaseAdminConfig.projectId}`);
console.log(`Using client email: ${firebaseAdminConfig.clientEmail}`);

const db = getFirestore(app, firebaseAdminConfig.databaseId);
const auth = getAuth(app);

async function setupAdmin() {
  try {
    const login = "shakar46";
    const password = "shakar46";
    const email = `${login}@crm-internal.local`;

    console.log("Setting up initial owner...");

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log("User already exists, updating claims...");
    } catch (e) {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: "Владелец системы",
      });
      console.log("Created new auth user.");
    }

    await auth.setCustomUserClaims(userRecord.uid, { role: "owner" });
    
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      login: login,
      nickname: login,
      displayName: "Владелец",
      role: "owner",
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`\nOwner setup complete!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: owner (Custom Claims set)`);

  } catch (error) {
    console.error("Error setting up admin:", error);
  }
  process.exit(0);
}

setupAdmin();
