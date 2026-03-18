import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';

interface FirebaseContextType {
  user: User | null;
  userRole: string | null;
  userData: any | null;
  isAuthorized: boolean;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  userRole: null,
  userData: null,
  isAuthorized: false,
  loading: true,
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserData(null);
        setUserRole(null);
        setIsAuthorized(false);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    // Listen for user data changes by email
    const q = query(collection(db, 'users'), where('email', '==', user.email));
    const unsubscribeSnapshot = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const uData = userDoc.data();
        
        // If this is a pre-added user (no UID yet) or if the UID document doesn't exist
        if (!uData.uid || userDoc.id !== user.uid) {
          const finalData = {
            ...uData,
            uid: user.uid,
            displayName: user.displayName || uData.displayName || "User",
            lastLogin: new Date().toISOString()
          };

          // Link UID to the user document (using UID as the document ID is better for security rules)
          await setDoc(doc(db, 'users', user.uid), finalData);
          
          // Delete the old document if it was a pre-added one with a random ID
          if (userDoc.id !== user.uid) {
            await deleteDoc(doc(db, 'users', userDoc.id));
          }
          
          setUserData(finalData);
          setUserRole(uData.role);
          setIsAuthorized(true);
        } else {
          // Update lastLogin if it's been more than 5 minutes since the last update
          const now = new Date();
          const lastUpdate = uData.lastLogin ? new Date(uData.lastLogin) : new Date(0);
          const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

          if (diffMinutes > 5) {
            await setDoc(doc(db, 'users', user.uid), {
              ...uData,
              lastLogin: now.toISOString()
            });
          }

          setUserData(uData);
          setUserRole(uData.role);
          setIsAuthorized(true);
        }
      } else if (user.email === "shakar0406@gmail.com" || user.email === "4berserk4@gmail.com") {
        // Auto-provision the super admin if not found
        const role = "admin";
        const adminData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "Super Admin",
          role: role,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), adminData);
        setUserData(adminData);
        setUserRole(role);
        setIsAuthorized(true);
      } else {
        setUserData(null);
        setUserRole(null);
        setIsAuthorized(false);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore listener error:", error);
      setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [user]);

  return (
    <FirebaseContext.Provider value={{ user, userRole, userData, isAuthorized, loading }}>
      {children}
    </FirebaseContext.Provider>
  );
};
