import dotenv from "dotenv";
import admin from "firebase-admin";
dotenv.config();
// 測試先隔開
if (process.env.NODE_ENV !== 'test') {

  if (process.env.FIREBASE_PRIVATE_KEY === undefined) {
    throw new Error("沒有定義環境變數FIREBASE_PRIVATE_KEY");
  }
  // 從環境變數中製作firebase的config
  const config = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  };

  // 連線firebase
  admin.initializeApp({
    credential: admin.credential.cert(config as admin.ServiceAccount),
    storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
  });

}
export default admin;
