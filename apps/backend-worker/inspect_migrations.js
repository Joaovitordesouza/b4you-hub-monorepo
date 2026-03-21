const admin = require('firebase-admin');
// Initialize with default credential (from env var) without forcing projectId
try { admin.initializeApp(); } catch(e) {}
const db = admin.firestore();

async function inspect() {
    console.log("Listing recent migrations...");
    let snapshot;
    try {
        snapshot = await db.collection('migrations').orderBy('createdAt', 'desc').limit(1).get();
    } catch (e) {
        console.log("OrderBy createdAt failed, fetching all (limit 1)...");
        try {
            snapshot = await db.collection('migrations').limit(1).get();
        } catch (err) {
            console.error("Failed to fetch migrations:", err);
            return;
        }
    }

    if (snapshot.empty) {
        console.log("No migrations found.");
        return;
    }

    for (const doc of snapshot.docs) {
        console.log(`\n=== Migration: ${doc.id} ===`);
        console.log("Status:", doc.data().status);
        // console.log(JSON.stringify(doc.data(), null, 2));

        console.log("\nChecking 'tasks' subcollection...");
        const tasks = await doc.ref.collection('tasks').get();
        console.log(`Found ${tasks.size} tasks.`);
        tasks.docs.slice(0, 3).forEach(t => {
            console.log(`- Task ${t.id}: ${t.data().status} (${t.data().type})`);
        });

        console.log("\nChecking 'lessons' subcollection...");
        const lessons = await doc.ref.collection('lessons').get();
        console.log(`Found ${lessons.size} lessons.`);
        lessons.docs.slice(0, 3).forEach(l => {
            console.log(`- Lesson ${l.id}: ${l.data().status} (Video: ${l.data().videoUrl ? 'Yes' : 'No'})`);
        });
    }
}

inspect().catch(console.error);
