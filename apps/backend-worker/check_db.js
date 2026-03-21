const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "b4you-f8606"
});
const db = admin.firestore();

async function run() {
    const messages = await db.collection("instances").limit(1).get();
    const instanceId = messages.docs[0].id;
    const chats = await db.collection(`instances/${instanceId}/chats`).limit(1).get();
    const chatId = chats.docs[0].id;
    const msgs = await db.collection(`instances/${instanceId}/chats/${chatId}/messages`).limit(5).get();
    msgs.forEach(d => console.log(d.data().fromMe, d.data().text, d.data().sender));
    process.exit(0);
}
run().catch(console.error);
