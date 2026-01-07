import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onValue, Database } from "firebase/database";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile, 
  User as FirebaseUser,
  Auth
} from "firebase/auth";
import { firebaseConfig } from "../firebaseConfig";
import { Board } from "../types";

// Initialize Firebase
let db: Database | null = null;
let auth: Auth | null = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  auth = getAuth(app);
} catch (e) {
  console.error("Firebase Initialization Error:", e);
}

// --- DB API ---

export const createBoardInCloud = async (board: Board): Promise<void> => {
  if (!db) return;
  try {
    // We store boards under the 'boards' node using their UUID
    await set(ref(db, 'boards/' + board.id), board);
  } catch (e) {
    console.error("Error creating board:", e);
    throw e;
  }
};

export const updateBoardInCloud = async (board: Board): Promise<void> => {
  if (!db) return;
  try {
    // Update the entire board state (simple but effective for this scale)
    await update(ref(db, 'boards/' + board.id), board);
  } catch (e) {
    console.error("Error updating board:", e);
  }
};

export const subscribeToBoard = (boardId: string, onUpdate: (board: Board | null) => void) => {
  if (!db) return () => {};
  
  const boardRef = ref(db, 'boards/' + boardId);
  
  const unsubscribe = onValue(boardRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Ensure items is an array even if empty in DB
      if (!data.items) data.items = [];
      onUpdate(data as Board);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    console.error("Subscription error:", error);
  });

  return unsubscribe; // Return cleanup function
};

// --- AUTH API ---

export const loginWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth not initialized");
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  if (!auth) throw new Error("Firebase Auth not initialized");
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(userCredential.user, { displayName: name });
  return userCredential.user;
};

export const loginWithEmail = async (email: string, pass: string) => {
  if (!auth) throw new Error("Firebase Auth not initialized");
  return signInWithEmailAndPassword(auth, email, pass);
};

export const logoutUser = async () => {
  if (!auth) return;
  return signOut(auth);
};

export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export const isFirebaseReady = () => !!db && !!auth;