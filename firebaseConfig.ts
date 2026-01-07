// --- FIREBASE YAPILANDIRMASI ---
// En iyi uygulama: Projenin ana dizininde .env dosyası oluşturun ve bilgileri oraya girin.
// Ancak kolay kurulum için varsayılan değerleri buraya ekledik.

// Helper to safely access environment variables
const getEnv = (key: string, fallback: string): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const val = import.meta.env[key];
      if (val) return val;
    }
  } catch (e) {
    // Ignore access errors
  }
  return fallback;
};

export const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyC7yWnQo60T7LqBOzCoCq33FlEJTib3ItQ"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "jamwall-3c82b.firebaseapp.com"),
  // Not: Database URL genelde proje-id + default-rtdb şeklindedir. Eğer çalışmazsa Firebase konsolundan kontrol edin.
  databaseURL: getEnv("VITE_FIREBASE_DATABASE_URL", "https://jamwall-3c82b-default-rtdb.firebaseio.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "jamwall-3c82b"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "jamwall-3c82b.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "811228260272"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:811228260272:web:0c7e08396dfb7e24c79875")
};