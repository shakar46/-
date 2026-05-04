import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as googleSheets from "./server/googleSheets.ts";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Load Firebase Config
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
} catch (err) {
  console.warn("Could not read firebase-applet-config.json:", err);
}

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

// Initialize Firebase Admin
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId || "shakar-b3be8",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL,
  privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY),
  databaseId: firebaseConfig.firestoreDatabaseId || "(default)"
};

if (firebaseAdminConfig.projectId && firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
  try {
    if (admin.apps.length === 0) {
      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseAdminConfig.projectId,
          clientEmail: firebaseAdminConfig.clientEmail,
          privateKey: firebaseAdminConfig.privateKey,
        }),
      });
      console.log(`Firebase Admin initialized for project: ${firebaseAdminConfig.projectId}`);
    }
  } catch (err) {
    console.error("Firebase Admin initialization failed:", err);
  }
}

const db = admin.apps.length > 0 ? getFirestore(admin.app(), firebaseAdminConfig.databaseId) : null;
const auth = admin.apps.length > 0 ? getAuth(admin.app()) : null;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Internal Audit Log Helper
  const logAction = async (userId: string, action: string, entityType: string, entityId?: string, changes?: any) => {
    if (!db) return;
    await db.collection("audit_logs").add({
      userId,
      action,
      entityType,
      entityId: entityId || null,
      changes: changes || null,
      createdAt: FieldValue.serverTimestamp(),
    });
  };

  // API Routes
  
  // 4.1. Create Employee
  app.post("/api/admin/createEmployee", async (req, res) => {
    if (!auth || !db) return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    
    // Auth check (verify token from caller)
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });
    
    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      if (decodedToken.role !== 'admin' && decodedToken.role !== 'owner') {
        return res.status(403).json({ success: false, error: "ACCESS_DENIED" });
      }

      const { name, login, password, role, phone, branchId } = req.body;
      const email = `${login.toLowerCase()}@crm-internal.local`;

      // 1. Create auth user
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
        phoneNumber: phone ? (phone.startsWith('+') ? phone : `+${phone}`) : undefined,
      });

      // 2. Set custom claims
      await auth.setCustomUserClaims(userRecord.uid, { role, branchId });

      // 3. Write to Firestore
      await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        nickname: login,
        displayName: name,
        login,
        role,
        branchId: branchId || null,
        phone: phone || null,
        createdAt: FieldValue.serverTimestamp(),
      });

      await logAction(decodedToken.uid, `Создан сотрудник: ${login}`, "User", userRecord.uid);

      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      console.error("Create Employee error:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // 4.2. Update Profile
  app.post("/api/profile/update", async (req, res) => {
    if (!auth || !db) return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });

    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      const { nickname, displayName, photoUrl } = req.body;

      const userRef = db.collection("users").doc(decodedToken.uid);
      const snapshot = await userRef.get();
      const oldData = snapshot.data();

      const updates: any = {};
      if (nickname) updates.nickname = nickname;
      if (displayName) updates.displayName = displayName;
      if (photoUrl) updates.photoUrl = photoUrl;

      await userRef.update(updates);
      
      await auth.updateUser(decodedToken.uid, {
        displayName: displayName || undefined,
        photoURL: photoUrl || undefined
      });

      // Audit Log
      await logAction(decodedToken.uid, "Обновление профиля", "User", decodedToken.uid, { 
        changes: { nickname, displayName, photoUrl } 
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // 4.3. Set User Role
  app.post("/api/admin/setUserRole", async (req, res) => {
    if (!auth || !db) return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });

    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      if (decodedToken.role !== 'admin' && decodedToken.role !== 'owner') {
        return res.status(403).json({ success: false, error: "ACCESS_DENIED" });
      }

      const { targetUid, role, branchId } = req.body;

      const userRef = db.collection("users").doc(targetUid);
      const snapshot = await userRef.get();
      if (!snapshot.exists) return res.status(404).json({ success: false, error: "Пользователь не найден" });
      
      const oldData = snapshot.data();

      // Update Custom Claims
      await auth.setCustomUserClaims(targetUid, { role, branchId: branchId || oldData?.branchId });
      
      // Update Firestore
      await userRef.update({
        role,
        branchId: branchId !== undefined ? branchId : (oldData?.branchId || null)
      });

      await logAction(decodedToken.uid, `Смена роли: ${role}`, "User", targetUid, { 
        oldRole: oldData?.role, 
        newRole: role 
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // 4.4. Create Request
  app.post("/api/requests/create", async (req, res) => {
    if (!db || !auth) return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });

    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      const { clientName, clientPhone, message, classification, branchId, deadlineAt } = req.body;

      const requestRef = await db.collection("requests").add({
        clientName,
        clientPhone,
        message,
        classification: classification || "general",
        status: "in_progress",
        branchId: branchId || decodedToken.branchId || null,
        deadlineAt: deadlineAt ? admin.firestore.Timestamp.fromDate(new Date(deadlineAt)) : null,
        createdAt: FieldValue.serverTimestamp(),
      });

      await logAction(decodedToken.uid, "Создано обращение", "Request", requestRef.id);

      res.json({ success: true, id: requestRef.id });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // 4.5. Process Request
  app.post("/api/requests/process", async (req, res) => {
    if (!db || !auth) return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });

    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      const { requestId, instantFix, resolution } = req.body;

      if (decodedToken.role !== 'manager' && decodedToken.role !== 'admin' && decodedToken.role !== 'owner') {
        return res.status(403).json({ success: false, error: "ACCESS_DENIED" });
      }

      await db.collection("request_actions").add({
        requestId,
        instantFix: instantFix || null,
        resolution,
        createdBy: decodedToken.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      await logAction(decodedToken.uid, "Обработка обращения", "Request", requestId);

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // 4.6. Complete Request
  app.post("/api/requests/complete", async (req, res) => {
    if (!db || !auth) return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });

    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      const { requestId } = req.body;

      await db.collection("requests").doc(requestId).update({
        status: "done",
        managerId: decodedToken.uid,
        completedAt: FieldValue.serverTimestamp(),
      });

      await logAction(decodedToken.uid, "Завершение обращения", "Request", requestId);

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Google Sheets (Existing)
  app.get("/api/gsheets/data", async (req, res) => {
    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SPREADSHEET_ID) {
      try {
        const complaints = await googleSheets.getComplaints();
        res.json(complaints);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch from Google Sheets" });
      }
    } else {
      res.status(400).json({ error: "Google Sheets not configured" });
    }
  });

  app.post("/api/gsheets/sync", async (req, res) => {
    const { action, data } = req.body;
    if (!process.env.GOOGLE_SPREADSHEET_ID) return res.status(400).json({ error: "Not configured" });

    try {
      if (action === "create") {
        await googleSheets.addComplaint(data);
      } else if (action === "update") {
        const row = await googleSheets.findRowById(data.id);
        if (row) await googleSheets.updateComplaint(row, data);
      } else if (action === "delete") {
        const row = await googleSheets.findRowById(data.id);
        if (row) await googleSheets.deleteComplaint(row);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Sync Error:", error);
      res.status(500).json({ error: "Sync failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
