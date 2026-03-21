const admin = require('firebase-admin');

try {
    admin.initializeApp({
        projectId: 'b4you-hub-prodv1'
    });
} catch(e) {}

const email = 'joao.diroteldes@gmail.com';
const password = 'B4YouAdmin2024!';

async function createAdmin() {
    try {
        console.log('Iniciando criação de admin...');
        let user;
        try {
            user = await admin.auth().getUserByEmail(email);
            console.log('Usuário já existe:', user.uid);
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.log('Criando novo usuário...');
                user = await admin.auth().createUser({
                    email: email,
                    password: password,
                    emailVerified: true
                });
                console.log('Usuário criado:', user.uid);
            } else {
                throw e;
            }
        }

        console.log('Atribuindo role admin no Firestore...');
        await admin.firestore().collection('users').doc(user.uid).set({
            email: email,
            role: 'admin',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('SUCESSO: Usuário admin configurado.');
        console.log('Email:', email);
        console.log('Senha Temporária:', password);
    } catch (error) {
        console.error('ERRO:', error);
        process.exit(1);
    }
}

createAdmin();
