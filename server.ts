import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as googleSheets from "./server/googleSheets.ts";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

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
  try {
    if (key.trim().startsWith("{")) {
      const json = JSON.parse(key);
      formatted = json.private_key || key;
    }
  } catch (e) {}
  formatted = formatted.replace(/\\n/g, "\n");
  formatted = formatted.replace(/^['"]|['"]$/g, "").trim();
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
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseAdminConfig.projectId,
          clientEmail: firebaseAdminConfig.clientEmail,
          privateKey: firebaseAdminConfig.privateKey,
        }),
      });
    }
    // Always ensure settings are applied to the default firestore instance
    admin.firestore().settings({ ignoreUndefinedProperties: true });
  } catch (err) {
    console.error("Firebase Admin initialization failed:", err);
  }
}

const db = admin.apps.length > 0 ? getFirestore(admin.app(), firebaseAdminConfig.databaseId) : null;
const auth = admin.apps.length > 0 ? getAuth(admin.app()) : null;
const geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function startServer() {
  const app = express();
  app.use(express.json());

  const logAction = async (userId: string, action: string, entityType: string, entityId?: string, changes?: any) => {
    if (!db) return;
    try {
      const docRef = await db.collection("audit_logs").add({
        userId,
        action,
        entityType,
        entityId: entityId || null,
        changes: changes || null,
        createdAt: FieldValue.serverTimestamp(),
      });
      // console.log(`Audit log created: ${docRef.id}`);
    } catch (e) {
      console.error("Failed to log action:", e);
    }
  };

  const sendTelegramMessage = async (token: string, chatId: string, text: string) => {
    if (!token || !chatId) return;
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      });
      if (!response.ok) {
        console.error("Telegram API error:", await response.text());
      }
    } catch (err) {
      console.error("Telegram notification failed:", err);
    }
  };

  // Audit Logging Route
  app.post("/api/audit/log", async (req, res) => {
    if (!auth || !db) return res.status(500).json({ success: false, error: "Firebase missing" });
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });
    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      const { action, entityType, entityId, metadata } = req.body;
      await logAction(decodedToken.uid, action, entityType, entityId, metadata);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // AI analysis route
  app.post("/api/ai/analyze-root-cause", async (req, res) => {
     if (!auth) return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });
    try {
      await auth.verifyIdToken(authHeader.split(" ")[1]);
      const { message, classification, section } = req.body;
      const prompt = `Проанализируй жалобу клиента и проведи анализ "5 Почему" (5 Whys), чтобы найти корневую причину. 
      Жалоба: "${message}"
      Классификация: ${classification} / ${section}
      Верни ответ строго в формате JSON:
      {
        "analysis": "Цепочка 5 почему...",
        "recommendation": "Рекомендация по исправлению..."
      }`;
      const response = await geminiClient.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/admin/createEmployee", async (req, res) => {
    if (!auth || !db) return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });
    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      if (decodedToken.role !== 'admin' && decodedToken.role !== 'owner' && decodedToken.role !== 'head') {
        return res.status(403).json({ success: false, error: "ACCESS_DENIED" });
      }
      const { name, login, password, role, phone, branchId } = req.body;
      const email = `${login.toLowerCase()}@crm-internal.local`;
      let userRecord;
      try {
        userRecord = await auth.createUser({
          email,
          password,
          displayName: name,
          phoneNumber: phone ? (phone.startsWith('+') ? phone : `+${phone}`) : undefined,
        });
      } catch (e: any) {
        if (e.code === 'auth/email-already-exists') {
          userRecord = await auth.getUserByEmail(email);
          await auth.updateUser(userRecord.uid, {
            password,
            displayName: name,
            phoneNumber: phone ? (phone.startsWith('+') ? phone : `+${phone}`) : undefined,
          });
        } else throw e;
      }
      await auth.setCustomUserClaims(userRecord.uid, { role, branchId });
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
      await logAction(decodedToken.uid, `Создан/Обновлен сотрудник: ${login}`, "User", userRecord.uid);
      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post("/api/profile/update", async (req, res) => {
    if (!auth || !db) return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });
    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      const { nickname, displayName, photoUrl } = req.body;
      const userRef = db.collection("users").doc(decodedToken.uid);
      const updates: any = {};
      if (nickname) updates.nickname = nickname;
      if (displayName) updates.displayName = displayName;
      if (photoUrl) updates.photoUrl = photoUrl;
      await userRef.update(updates);
      await auth.updateUser(decodedToken.uid, {
        displayName: displayName || undefined,
        photoURL: photoUrl || undefined
      });
      await logAction(decodedToken.uid, "Обновление профиля", "User", decodedToken.uid, { updates });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post("/api/requests/create", async (req, res) => {
    if (!auth || !db) return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });
    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      const { 
        clientName, clientPhone, clientPhotos, message, 
        classification, branchId, orderDate, source, significance, orderCheck,
        poisoningDetails
      } = req.body;
      
      const userRecord = await auth.getUser(decodedToken.uid);
      const nickname = (userRecord as any).nickname || userRecord.displayName || userRecord.email?.split('@')[0] || "Operator";
      
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const guestNumber = `G-${timestamp}-${random}`;

      const requestData = {
        guestNumber,
        clientName: clientName || "",
        clientPhone: clientPhone || "",
        clientPhotos: clientPhotos || [],
        clientPhoto: clientPhotos && clientPhotos.length > 0 ? clientPhotos[0] : null,
        message: message || "",
        classification: classification || "",
        classificationSection: req.body.classificationSection || "",
        branchId: branchId || null,
        status: "in_progress",
        createdBy: decodedToken.uid || "system",
        complaintTaker: nickname || "System",
        dateReceived: new Date().toISOString(),
        orderDate: orderDate || null,
        orderCheck: orderCheck || null,
        source: source || "Direct",
        significance: significance || "Средняя",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        validityStatus: "выявляется",
        ...(poisoningDetails || {})
      };

      const docRef = await db.collection("requests").add(requestData);
      
      // Send Telegram Notification
      try {
        const tgSettingsDoc = await db.collection("settings").doc("telegram").get();
        if (tgSettingsDoc.exists) {
          const s = tgSettingsDoc.data();
          if (s?.notifications_enabled && s?.telegram_token && s?.telegram_chat_id) {
            const branchDoc = requestData.branchId ? await db.collection("dictionaries").doc("branch_names").get() : null;
            const branchName = branchDoc?.exists ? (branchDoc.data()?.items || []).find((b: string) => b.includes(requestData.branchId || "")) || requestData.branchId : requestData.branchId;
            
            const messageText = `
<b>🆕 Новое обращение: ${guestNumber}</b>
<b>👤 Клиент:</b> ${clientName || "Не указан"}
<b>📞 Телефон:</b> ${clientPhone || "Не указан"}
<b>📍 Филиал:</b> ${branchName || "Не указан"}
<b>📋 Категория:</b> ${classification || "Не указана"}
${req.body.classificationSection ? `<b>🖇 Секция:</b> ${req.body.classificationSection}\n` : ""}
<b>📝 Сообщение:</b> ${message || "Без описания"}
${poisoningDetails ? `
<b>🚨 ДЕТАЛИ ОТРАВЛЕНИЯ:</b>
- Симптомы: ${poisoningDetails.symptoms}
- Ели/Заболели: ${poisoningDetails.peopleConsumed}/${poisoningDetails.peopleSymptoms}
- Подозрение на: ${poisoningDetails.suspectedIngredients}
` : ""}
<b>🔗 Ссылка:</b> <a href="https://${req.get('host')}/requests/${docRef.id}">Открыть в CRM</a>
            `;
            await sendTelegramMessage(s.telegram_token, s.telegram_chat_id, messageText);
          }
        }
      } catch (tgErr) {
        console.error("Error sending TG notification:", tgErr);
      }

      await logAction(decodedToken.uid, `Создано обращение ${guestNumber}: ${docRef.id}`, "Request", docRef.id);
      res.json({ success: true, id: docRef.id, guestNumber });
    } catch (error: any) {
      console.error("Create request error:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post("/api/requests/delete", async (req, res) => {
    if (!auth || !db) return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });
    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      if (decodedToken.role !== 'admin' && decodedToken.role !== 'owner' && decodedToken.role !== 'head') {
        return res.status(403).json({ success: false, error: "ACCESS_DENIED" });
      }
      const { requestId } = req.body;
      await db.collection("requests").doc(requestId).delete();
      const actionsSnapshot = await db.collection("request_actions").where("requestId", "==", requestId).get();
      const batch = db.batch();
      actionsSnapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      await logAction(decodedToken.uid, `Удалено обращение: ${requestId}`, "Request", requestId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post("/api/requests/process", async (req, res) => {
    if (!db || !auth) return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });
    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      const { requestId, instantFix, resolution, classificationConfirmed } = req.body;
      if (decodedToken.role !== 'manager' && decodedToken.role !== 'admin' && decodedToken.role !== 'owner' && decodedToken.role !== 'head') {
        return res.status(403).json({ success: false, error: "ACCESS_DENIED" });
      }
      const userRecord = await auth.getUser(decodedToken.uid);
      const managerName = userRecord.displayName || userRecord.email?.split('@')[0] || "Manager";
      
      const updateData: any = {
        status: "under_review",
        managerId: decodedToken.uid,
        updatedAt: FieldValue.serverTimestamp(),
        instantCorrection: instantFix || "",
        finalResolution: resolution || "",
        responsibleForCorrection: managerName,
        deadlineStatus: "Выполнен в срок"
      };

      if (classificationConfirmed) {
        updateData.classificationConfirmed = classificationConfirmed;
      }

      await db.collection("request_actions").add({
        requestId,
        instantFix: instantFix || null,
        resolution,
        classificationConfirmed: classificationConfirmed || null,
        createdBy: decodedToken.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      await db.collection("requests").doc(requestId).update(updateData);
      await logAction(decodedToken.uid, "Обработка обращения", "Request", requestId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

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

  app.get("/api/gsheets/data", async (req, res) => {
    try {
      const complaints = await googleSheets.getComplaints();
      res.json(complaints);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch" });
    }
  });

  app.post("/api/profile/changePassword", async (req, res) => {
    if (!auth) return res.status(500).json({ success: false, error: "Auth missing" });
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });
    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      const { newPassword } = req.body;
      await auth.updateUser(decodedToken.uid, { password: newPassword });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post("/api/admin/deleteUser", async (req, res) => {
    if (!auth || !db) return res.status(500).json({ success: false, error: "Firebase missing" });
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: "Unauthorized" });
    try {
      const decodedToken = await auth.verifyIdToken(authHeader.split(" ")[1]);
      if (decodedToken.role !== 'admin' && decodedToken.role !== 'owner' && decodedToken.role !== 'head') {
        return res.status(403).json({ success: false, error: "ACCESS_DENIED" });
      }
      const { targetUid } = req.body;
      await auth.deleteUser(targetUid);
      await db.collection("users").doc(targetUid).delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  }
  app.listen(3000, "0.0.0.0", () => console.log("Server running"));
}
startServer();
