import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function sendTelegramMessage(text: string) {
  try {
    const docRef = doc(db, "settings", "telegram");
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.warn("Telegram settings not found");
      return false;
    }

    const settings = docSnap.data();
    if (!settings.notifications_enabled || !settings.telegram_token || !settings.telegram_chat_id) {
      return false;
    }

    const url = `https://api.telegram.org/bot${settings.telegram_token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: settings.telegram_chat_id,
        text: text,
        parse_mode: "HTML"
      })
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return false;
  }
}
