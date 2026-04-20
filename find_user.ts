import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function findUser() {
  const q = query(collection(db, "users"), where("email", "==", "4berserk4@gmail.com"));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    console.log("User not found by email. Trying to list all users to see if there's a match...");
    const allUsers = await getDocs(collection(db, "users"));
    allUsers.forEach(doc => {
      console.log(`ID: ${doc.id}, Data: ${JSON.stringify(doc.data())}`);
    });
  } else {
    querySnapshot.forEach(doc => {
      console.log(`User found: ${JSON.stringify(doc.data())}`);
    });
  }
  process.exit(0);
}

findUser();
