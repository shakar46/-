import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type LogType = 'login' | 'logout' | 'action';

interface LogParams {
  userId: string;
  userEmail: string;
  userName: string;
  type: LogType;
  action: string;
  targetId?: string;
  targetType?: string;
  metadata?: any;
}

export const logEvent = async (params: LogParams) => {
  try {
    await addDoc(collection(db, "audit_logs"), {
      ...params,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log event:", error);
  }
};
