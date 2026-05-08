import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";

export type LogType = 'login' | 'logout' | 'action' | 'change';

interface LogParams {
  userId: string;
  userEmail: string;
  userName: string;
  login?: string;
  type: LogType;
  action: string;
  targetId?: string;
  targetType?: string;
  metadata?: any;
}

export const logEvent = async (params: LogParams) => {
  try {
    // Try to use back-end API if we have a token (more reliable for audit)
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        if (token) {
          const response = await fetch("/api/audit/log", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              action: params.action,
              entityType: params.targetType || params.type || "System",
              entityId: params.targetId || params.userId,
              metadata: {
                ...params,
                clientSource: "web-sdk"
              }
            })
          });
          if (response.ok) return;
        }
      } catch (apiErr) {
        console.warn("API audit log failed, falling back to direct Firestore write:", apiErr);
      }
    }

    // Fallback to direct Firestore write if API fails or no user session
    await addDoc(collection(db, "audit_logs"), {
      ...params,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log event:", error);
  }
};
