import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface FirebaseContextType {
  user: any | null;
  userRole: string | null;
  userData: any | null;
  isAuthorized: boolean;
  loading: boolean;
  error: string | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  userRole: null,
  userData: null,
  isAuthorized: false,
  loading: true,
  error: null,
  login: async () => {},
  logout: () => {},
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    localStorage.removeItem('crm_session_id');
    localStorage.removeItem('crm_login');
    setCurrentUser(null);
    setUserData(null);
    setUserRole(null);
    setIsAuthorized(false);
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const loginName = localStorage.getItem('crm_login');
        if (loginName) {
           const id = loginName.trim().toLowerCase().replace(/\s+/g, '_');
           try {
             const userDoc = await getDoc(doc(db, 'users', id));
             if (userDoc.exists()) {
               const uData = userDoc.data();
               if (uData.uid === fbUser.uid) {
                  setCurrentUser(fbUser);
                  setUserData(uData);
                  setUserRole(uData.role);
                  setIsAuthorized(true);
               } else {
                 await logout();
               }
             } else {
               await logout();
             }
           } catch (err) {
             console.error("Session sync error:", err);
           }
        }
      } else {
        setIsAuthorized(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (loginName: string, passwordString: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Authenticate anonymously for Firebase context
      const authResult = await signInAnonymously(auth);
      const fbUser = authResult.user;

      // 2. Derive ID and Fetch user doc directly (uses 'get' permission which is open)
      const id = loginName.trim().toLowerCase().replace(/\s+/g, '_');
      const userDoc = await getDoc(doc(db, 'users', id));
      
      if (!userDoc.exists()) {
        throw new Error("Пользователь не найден");
      }

      const uData = userDoc.data();
      
      // 3. Verify password
      if (uData.password !== passwordString.trim()) {
        throw new Error("Неверный пароль");
      }
      
      // 4. Create a session mapping for security rules FIRST
      await setDoc(doc(db, 'session_uids', fbUser.uid), {
        login: loginName.trim(),
        role: uData.role,
        email: uData.email || "",
        createdAt: new Date().toISOString()
      });

      // 5. Link Anonymous UID to this user record for Firestore Rules (now hasSession() will be true)
      await setDoc(doc(db, 'users', userDoc.id), {
        ...uData,
        uid: fbUser.uid,
        lastLogin: new Date().toISOString()
      }, { merge: true });

      localStorage.setItem('crm_session_id', userDoc.id);
      localStorage.setItem('crm_login', loginName.trim());
      
      setCurrentUser(fbUser);
      setUserData({ ...uData, uid: fbUser.uid });
      setUserRole(uData.role);
      setIsAuthorized(true);

    } catch (err: any) {
      setError(err.message || "Ошибка входа");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user: currentUser, userRole, userData, isAuthorized, loading, error, login, logout }}>
      {children}
    </FirebaseContext.Provider>
  );
};
