import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface FirebaseContextType {
  user: User | null;
  userRole: string | null;
  isAuthorized: boolean;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  userRole: null,
  isAuthorized: false,
  loading: true,
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch user role from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
          setIsAuthorized(true);
        } else {
          // Check if user was pre-added by email
          const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const existingDoc = querySnapshot.docs[0];
            const userData = existingDoc.data();
            
            // Link UID to the user document
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              ...userData,
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || userData.displayName || "User",
              lastLogin: new Date().toISOString()
            });
            
            setUserRole(userData.role);
            setIsAuthorized(true);
          } else if (firebaseUser.email === "shakar0406@gmail.com") {
            // Auto-provision the super admin
            const role = "admin";
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || "Super Admin",
              role: role,
              createdAt: new Date().toISOString()
            });
            setUserRole(role);
            setIsAuthorized(true);
          } else {
            // User exists in Firebase Auth but not in our 'users' collection
            setUserRole(null);
            setIsAuthorized(false);
          }
        }
      } else {
        setUserRole(null);
        setIsAuthorized(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, userRole, isAuthorized, loading }}>
      {children}
    </FirebaseContext.Provider>
  );
};
