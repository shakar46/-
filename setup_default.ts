import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

async function setup() {
  try {
    // Try using application default credentials (if running in a GCP environment)
    // or fallback to whatever is in the env.
    const app = admin.initializeApp({
      projectId: config.projectId,
    });

    const db = getFirestore(app, config.firestoreDatabaseId);
    const auth = getAuth(app);

    const login = "shakar46";
    const password = "CRM_Shakar_2026";
    const email = `${login}@crm-internal.local`;

    console.log(`Setting up in project: ${config.projectId}, DB: ${config.firestoreDatabaseId}`);

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: "Владелец системы",
      });
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

    console.log("SUCCESS! User created or updated.");
  } catch (err) {
    console.error("FAILED with default credentials:", err);
  }
  process.exit(0);
}

setup();
