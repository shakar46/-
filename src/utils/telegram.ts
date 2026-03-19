import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function sendTelegramMessage(text: string, type: 'main' | 'audit' = 'main', photo?: string) {
  try {
    const docRef = doc(db, "settings", "telegram");
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.warn("Telegram settings not found");
      return false;
    }

    const settings = docSnap.data();
    
    const token = type === 'main' ? settings.telegram_token : settings.audit_token;
    const chatId = type === 'main' ? settings.telegram_chat_id : settings.audit_chat_id;
    const enabled = type === 'main' ? settings.notifications_enabled : settings.audit_enabled;

    if (!enabled || !token || !chatId) {
      return false;
    }

    let url = `https://api.telegram.org/bot${token}/sendMessage`;
    let body: any = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML"
    };

    if (photo) {
      url = `https://api.telegram.org/bot${token}/sendPhoto`;
      // If photo is base64, we need to convert it to a blob or just send the URL if it's a URL
      // But Telegram API for sendPhoto usually expects a file or a URL.
      // Since we store base64 in Firestore, we can try to send it as a blob.
      
      if (photo.startsWith('data:image')) {
        const base64Data = photo.split(',')[1];
        const blob = await (await fetch(photo)).blob();
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', blob, 'photo.jpg');
        formData.append('caption', text);
        formData.append('parse_mode', 'HTML');

        const response = await fetch(url, {
          method: "POST",
          body: formData
        });
        return response.ok;
      } else {
        body = {
          chat_id: chatId,
          photo: photo,
          caption: text,
          parse_mode: "HTML"
        };
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return false;
  }
}

export async function sendTelegramFile(file: Blob, fileName: string, caption: string, type: 'main' | 'audit' = 'main') {
  try {
    const docRef = doc(db, "settings", "telegram");
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return false;

    const settings = docSnap.data();
    const token = type === 'main' ? settings.telegram_token : settings.audit_token;
    const chatId = type === 'main' ? settings.telegram_chat_id : settings.audit_chat_id;
    const enabled = type === 'main' ? settings.notifications_enabled : settings.audit_enabled;

    if (!enabled || !token || !chatId) return false;

    const url = `https://api.telegram.org/bot${token}/sendDocument`;
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', file, fileName);
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');

    const response = await fetch(url, {
      method: "POST",
      body: formData
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending Telegram file:", error);
    return false;
  }
}
