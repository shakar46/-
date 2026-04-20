import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp, collection, getDocs, deleteDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);
const auth = getAuth(app);

async function setupAdmin() {
  try {
    // 1. Sign in anonymously
    await signInAnonymously(auth);
    
    // 2. Delete all existing users
    console.log("Cleaning up existing users...");
    const usersSnap = await getDocs(collection(db, "users"));
    for (const userDoc of usersSnap.docs) {
      await deleteDoc(doc(db, "users", userDoc.id));
      console.log(`Deleted user: ${userDoc.id}`);
    }

    // 3. Create new head user
    const login = "shakar46";
    const password = "CRM_Shakar_2026";
    
    const userData = {
      login: login,
      password: password,
      displayName: "Руководитель",
      role: "head",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docId = login.toLowerCase();
    
    await setDoc(doc(db, "users", docId), userData);
    console.log(`\nNew Head user created!`);
    console.log(`Login: ${login}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error("Error setting up admin:", error);
  }
  process.exit(0);
}

setupAdmin();
