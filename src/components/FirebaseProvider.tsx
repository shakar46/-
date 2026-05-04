import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, getIdTokenResult } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

import { logEvent } from '../utils/logger';

interface FirebaseContextType {
  user: any | null;
  token: string | null;
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
  token: null,
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
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    if (userData) {
      try {
        await logEvent({
          userId: currentUser?.uid || "unknown",
          userEmail: "",
          userName: userData.displayName,
          login: userData.login,
          type: 'logout',
          action: 'Выход из системы'
        });
      } catch (e) {
        console.error("Logout log error:", e);
      }
    }
    setCurrentUser(null);
    setToken(null);
    setUserData(null);
    setUserRole(null);
    setIsAuthorized(false);
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        try {
          // Force a token refresh to get latest custom claims
          const tokenResult = await getIdTokenResult(fbUser, true);
          const role = tokenResult.claims.role as string;
          const userToken = tokenResult.token;
          
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const uData = userDoc.data();
            setCurrentUser(fbUser);
            setToken(userToken);
            setUserData(uData);
            setUserRole(role || uData.role);
            setIsAuthorized(true);
          } else {
            console.warn("User doc not found, but Auth exists. Creating temporary profile...");
            setCurrentUser(fbUser);
            setToken(userToken);
            setUserData({ uid: fbUser.uid, displayName: fbUser.displayName || fbUser.email, role });
            setUserRole(role);
            setIsAuthorized(true);
          }
        } catch (err: any) {
          console.error("Session sync error:", err);
          setError("Ошибка синхронизации сессии: " + (err.message || String(err)));
          // Don't logout immediately, maybe it's a temporary network error
        }
      } else {
        setIsAuthorized(false);
        setUserData(null);
        setUserRole(null);
        setToken(null);
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (loginName: string, passwordString: string) => {
    setLoading(true);
    setError(null);
    try {
      const email = `${loginName.trim().toLowerCase()}@crm-internal.local`;
      const authResult = await signInWithEmailAndPassword(auth, email, passwordString);
      const fbUser = authResult.user;

      const tokenResult = await getIdTokenResult(fbUser, true);
      const role = tokenResult.claims.role as string;
      const userToken = tokenResult.token;

      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      const uData = userDoc.exists() ? userDoc.data() : { login: loginName, displayName: fbUser.displayName, role };
      
      await logEvent({
        userId: fbUser.uid,
        userEmail: fbUser.email || "",
        userName: uData?.displayName || "User",
        login: loginName.trim(),
        type: 'login',
        action: 'Вход в систему'
      });

      setCurrentUser(fbUser);
      setToken(userToken);
      setUserData(uData);
      setUserRole(role || uData.role);
      setIsAuthorized(true);

    } catch (err: any) {
      let msg = "Ошибка входа";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = "Неверный логин или пароль";
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user: currentUser, token, userRole, userData, isAuthorized, loading, error, login, logout }}>
      {children}
    </FirebaseContext.Provider>
  );
};
