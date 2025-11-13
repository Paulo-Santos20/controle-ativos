/**
 * Código do BACKEND (Firebase Cloud Functions)
 * Local: functions/index.js
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Função 'onCall' para criar usuário (CORS é tratado automaticamente pelo SDK)
exports.createNewUser = functions.https.onCall(async (data, context) => {
  // 1. Verificação de Segurança: Apenas Admins podem criar
  // (Descomente isso quando tiver seu usuário admin configurado)
  /*
  if (!context.auth || !context.auth.token.role === 'admin_geral') {
    throw new functions.https.HttpsError(
      'permission-denied', 
      'Apenas administradores podem criar usuários.'
    );
  }
  */

  const { email, displayName, role } = data;

  // Validação básica
  if (!email || !displayName || !role) {
    throw new functions.https.HttpsError(
      'invalid-argument', 
      'Faltam dados obrigatórios (email, nome, role).'
    );
  }

  try {
    // 2. Criar o usuário no Authentication (Gera o UID)
    // A senha será temporária ou você pode enviar um link de reset depois
    const userRecord = await admin.auth().createUser({
      email: email,
      emailVerified: false,
      displayName: displayName,
      disabled: false,
    });

    // 3. Criar o documento do usuário no Firestore
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      email: email,
      displayName: displayName,
      role: role,
      assignedUnits: [], // Começa sem unidades
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. (Opcional) Enviar link de redefinição de senha para o e-mail
    // const link = await admin.auth().generatePasswordResetLink(email);
    // (Aqui você enviaria o e-mail usando um serviço como SendGrid ou Nodemailer)

    console.log(`Usuário criado com sucesso: ${userRecord.uid}`);

    return { success: true, message: "Usuário criado com sucesso!" };

  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    // Retorna o erro para o front-end
    throw new functions.https.HttpsError('internal', error.message);
  }
});