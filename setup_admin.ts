import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);
const auth = getAuth(app);

async function setupAdmin() {
  try {
    // 1. Sign in anonymously to satisfy security rules (which allow create if isSignedIn)
    await signInAnonymously(auth);
    
    const login = "crm_head";
    const password = "CRM_System_2026_Access";
    const email = "shakar0406@gmail.com";
    
    const userData = {
      email: email,
      login: login,
      password: password,
      displayName: "Главный Руководитель",
      role: "head",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docId = login.toLowerCase();
    
    await setDoc(doc(db, "users", docId), userData);
    console.log(`Admin user created/updated!`);
    console.log(`Login: ${login}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error("Error creating admin:", error);
  }
  process.exit(0);
}

setupAdmin();
