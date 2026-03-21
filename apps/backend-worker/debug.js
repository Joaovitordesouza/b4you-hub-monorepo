const admin = require('firebase-admin');

// Tenta usar ADC (Application Default Credentials)
try {
    admin.initializeApp({
        projectId: 'b4you-hub'
    });
} catch (e) {
    console.error("Erro ao inicializar app:", e);
}

const db = admin.firestore();

async function checkErrors() {
    console.log("Buscando migrações com erro...");
    try {
        const snapshot = await db.collection('migrations')
            .where('status', '==', 'error')
            .orderBy('updatedAt', 'desc')
            .limit(5)
            .get();

        if (snapshot.empty) {
            console.log("Nenhuma migração com status 'error' encontrada.");
        } else {
            snapshot.forEach(doc => {
                console.log(`\nID: ${doc.id}`);
                console.log(`Data: ${JSON.stringify(doc.data(), null, 2)}`);
            });
        }
        
        // Também buscar logs recentes de tasks com erro
        console.log("\nBuscando tasks com erro...");
        const tasksSnap = await db.collectionGroup('tasks')
            .where('status', '==', 'error')
            .orderBy('errorAt', 'desc')
            .limit(5)
            .get();
            
        tasksSnap.forEach(doc => {
            console.log(`\nTask ID: ${doc.id} (Parent: ${doc.ref.parent.parent.id})`);
            console.log(`Data: ${JSON.stringify(doc.data(), null, 2)}`);
        });
    } catch (err) {
        console.error("Erro ao acessar Firestore:", err);
    }
}

checkErrors().catch(console.error);
