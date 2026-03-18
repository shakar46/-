import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch user role from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setUserRole(data.role);
          setIsAuthorized(true);
        } else {
          // Check if user was pre-added by email
          const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const existingDoc = querySnapshot.docs[0];
            const uData = existingDoc.data();
            
            const finalData = {
              ...uData,
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || uData.displayName || "User",
              lastLogin: new Date().toISOString()
            };

            // Link UID to the user document
            await setDoc(doc(db, 'users', firebaseUser.uid), finalData);
            
            setUserData(finalData);
            setUserRole(uData.role);
            setIsAuthorized(true);
          } else if (firebaseUser.email === "shakar0406@gmail.com") {
            // Auto-provision the super admin
            const role = "admin";
            const adminData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || "Super Admin",
              role: role,
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), adminData);
            setUserData(adminData);
            setUserRole(role);
            setIsAuthorized(true);
          } else {
            // User exists in Firebase Auth but not in our 'users' collection
            setUserData(null);
            setUserRole(null);
            setIsAuthorized(false);
          }
        }
      } else {
        setUserData(null);
        setUserRole(null);
        setIsAuthorized(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, userRole, userData, isAuthorized, loading }}>
      {children}
    </FirebaseContext.Provider>
  );
};
