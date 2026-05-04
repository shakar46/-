import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

const formatPrivateKey = (key: string | undefined): string => {
  if (!key) return "";
  let formatted = key;
  try {
    if (key.trim().startsWith("{")) {
      const json = JSON.parse(key);
      formatted = json.private_key || key;
    }
  } catch (e) {}
  formatted = formatted.replace(/\\n/g, "\n").replace(/^['"]|['"]$/g, "").trim();
  if (formatted && !formatted.includes("-----BEGIN PRIVATE KEY-----")) {
    formatted = `-----BEGIN PRIVATE KEY-----\n${formatted}\n-----END PRIVATE KEY-----`;
  }
  return formatted;
};

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: config.projectId,
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
    privateKey: formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
  }),
});

const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const login = "shakar46";
  const email = `${login}@crm-internal.local`;
  console.log(`Checking user: ${email} in DB ${config.firestoreDatabaseId}`);
  
  const users = await db.collection("users").where("login", "==", login).get();
  if (users.empty) {
    console.log("No user found in users collection with that login.");
  } else {
    users.forEach(doc => {
      console.log("Found user doc:", doc.id, doc.data());
    });
  }
  process.exit(0);
}

check();
