
import { KiwifyCourse, MigrationStatus, LocalCourse, Module, Lesson } from '../types';
import { db, functions, auth, fieldValue } from '../firebase';

const handleFirestoreError = (error: any) => {
  console.error("Firestore Error:", error);
  if (error.message?.includes("index")) {
    console.warn("⚠️ ALERTA DE ÍNDICE: Verifique o arquivo indices.md para criar os índices compostos necessários.");
  }
};

export const bridgeApi = {
  async listCourses(token: string): Promise<KiwifyCourse[]> {
    try {
      const listKiwifyCoursesFn = functions.httpsCallable('listKiwifyCourses');
      const result = await listKiwifyCoursesFn({ token });
      return (result.data as KiwifyCourse[]) || [];
    } catch (error: any) {
      throw new Error(error.message || "Falha ao listar cursos da Kiwify.");
    }
  },

  async migrateCourse(courseId: string, workspaceId: string, token: string, courseName?: string, coverImage?: string, leadId?: string): Promise<{ success: boolean, migrationId: string }> {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const docId = `${workspaceId}_${courseId}`;
    const docRef = db.collection('migrations').doc(docId);
    
    // Inicia a migração respeitando o schema v7.0
    await docRef.set({
      userId: user.uid,
      workspaceId,
      courseId,
      courseName: courseName || 'Curso Kiwify',
      coverImage: coverImage || '', 
      token, 
      leadId: leadId || null, // Vínculo com o Lead
      status: 'pending',
      progress: 0,
      completedLessons: 0,
      totalLessons: 0,
      createdAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true, migrationId: docId };
  },

  subscribeToWorkspaceMigrations(workspaceId: string, callback: (migrations: MigrationStatus[]) => void): () => void {
    const user = auth.currentUser;
    if (!user) return () => {};

    // Escuta em tempo real usando o campo 'progress' nativo do backend v7.0
    return db.collection('migrations')
      .where('userId', '==', user.uid)
      .where('workspaceId', '==', workspaceId)
      .onSnapshot((snapshot) => {
        const migrations = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            courseId: data.courseId,
            status: data.status || 'pending',
            progress: data.progress ?? 0,
            error: data.errorMessage || data.error,
            totalLessons: data.totalLessons,
            completedLessons: data.completedLessons,
            completedModules: data.completedModules, 
            totalModules: data.totalModules,         
            workerId: data.workerId,                 
            updatedAt: data.updatedAt,
            coverImage: data.coverImage || data.cover_image
          } as MigrationStatus;
        });
        callback(migrations);
      }, handleFirestoreError);
  },

  // Nova função para buscar migração por Lead ID
  subscribeToLeadMigration(leadId: string, callback: (migration: MigrationStatus | null) => void): () => void {
      const user = auth.currentUser;
      if (!user) return () => {};

      // Pega a migração mais recente vinculada a este lead
      return db.collection('migrations')
        .where('userId', '==', user.uid)
        .where('leadId', '==', leadId)
        .limit(1)
        .onSnapshot((snapshot) => {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                callback({
                    courseId: data.courseId,
                    status: data.status || 'pending',
                    progress: data.progress ?? 0,
                    error: data.errorMessage || data.error,
                    totalLessons: data.totalLessons,
                    completedLessons: data.completedLessons,
                    updatedAt: data.updatedAt,
                    coverImage: data.coverImage
                } as MigrationStatus);
            } else {
                callback(null);
            }
        }, handleFirestoreError);
  },

  async getGalleryMetadata(workspaceId?: string): Promise<LocalCourse[]> {
    const user = auth.currentUser;
    if (!user) return [];

    let query = db.collection('migrations')
      .where('userId', '==', user.uid)
      .where('status', 'in', ['completed', 'processing', 'preparing']); 

    if (workspaceId && workspaceId !== 'all') {
      query = query.where('workspaceId', '==', workspaceId);
    }

    try {
      const snapshot = await query.get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          dirName: data.courseId,
          workspaceId: data.workspaceId,
          // Mapeia o leadId para uso no front
          leadId: data.leadId,
          course: {
            id: data.courseId,
            name: data.courseName,
            config: { 
              premium_members_area: { 
                cover_image_desktop: data.coverImage || data.cover_image || '' 
              } 
            },
            modules: []
          }
        };
      });
    } catch (e) {
      handleFirestoreError(e);
      return [];
    }
  },

  subscribeToCourseLessons(migrationId: string, callback: (lessons: Lesson[]) => void): () => void {
    const lessonsRef = db.collection('migrations').doc(migrationId).collection('lessons');
    return lessonsRef.orderBy('moduleIndex').orderBy('lessonIndex').onSnapshot((snapshot) => {
      const lessons = snapshot.docs.map(doc => this.mapLessonData(doc.id, doc.data()));
      callback(lessons);
    }, (err) => {
      handleFirestoreError(err);
      lessonsRef.get().then(snap => {
        const mapped = snap.docs.map(doc => this.mapLessonData(doc.id, doc.data()));
        callback(mapped);
      });
    });
  },

  mapLessonData(id: string, data: any): Lesson {
    return {
      id: id,
      title: data.title || 'Aula sem título',
      isMigrated: data.status === 'completed',
      processingStatus: data.status || 'completed',
      video: {
        name: data.title || '',
        streamUrl: data.videoUrl || '', 
        duration: data.duration
      },
      module_name: data.moduleName || 'Geral',
      moduleIndex: data.moduleIndex ?? 0,
      lessonIndex: data.lessonIndex ?? 0
    };
  }
};
