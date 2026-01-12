import { initializeApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'dummy_key_development_only',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dummy.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dummy-project',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dummy.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'dummy',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || 'dummy:web:dummy',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'dummy',
    // IMPORTANT: Leave databaseURL empty - we'll use localStorage as primary storage
    databaseURL: ''
};

let app: any;
let db: Database | null = null;

try {
    app = initializeApp(firebaseConfig);
    // Only try to get database if a real databaseURL is configured
    const dbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL;
    if (dbUrl && dbUrl.includes('firebaseio.com')) {
        try {
            db = getDatabase(app);
        } catch (err) {
            console.warn('Database initialization failed, will use localStorage only', err);
        }
    } else {
        console.log('Firebase database not configured, using localStorage as primary storage');
    }
} catch (error) {
    console.warn('Firebase initialization failed, app will use localStorage only', error);
}

export { db };
