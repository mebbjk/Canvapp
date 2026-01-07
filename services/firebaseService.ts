
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onValue, get, remove, query, orderByChild, limitToLast, Database } from "firebase/database";
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
    const updates: any = {};
    updates['boards/' + board.id] = board;
    
    // If board is public, also update the public metadata
    if (board.isPublic) {
        // Lightweight metadata for the list
        const publicMeta = {
            id: board.id,
            topic: board.topic,
            host: board.host,
            createdAt: board.createdAt,
            // We do NOT store items or background images here to keep list fast
        };
        updates['public_boards/' + board.id] = publicMeta;
    } else {
        // If it was public but now is false, we should remove it from public_boards (handled separately usually, but here for consistency)
        // Note: remove() is a separate Op, but we can set to null in multi-path update
        updates['public_boards/' + board.id] = null;
    }

    await update(ref(db), updates);
  } catch (e) {
    console.error("Error updating board:", e);
  }
};

export const deleteBoardFromCloud = async (boardId: string): Promise<void> => {
    if (!db) return;
    try {
        const updates: any = {};
        updates['boards/' + boardId] = null;
        updates['public_boards/' + boardId] = null;
        await update(ref(db), updates);
    } catch (e) {
        console.error("Error deleting board:", e);
        throw e;
    }
}

// Fetch only the metadata of public boards
export const getPublicBoards = async (): Promise<any[]> => {
    if (!db) return [];
    try {
        const publicBoardsRef = query(ref(db, 'public_boards'), limitToLast(50));
        const snapshot = await get(publicBoardsRef);
        if (snapshot.exists()) {
            return Object.values(snapshot.val()).reverse(); // Newest first
        }
        return [];
    } catch (e) {
        console.error("Error fetching public boards:", e);
        return [];
    }
}

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
