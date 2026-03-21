
export const getFirebaseErrorMessage = (error: any): string => {
    const code = error.code || error.message;
    
    switch (code) {
        case 'auth/user-not-found':
            return 'Usuário não encontrado. Verifique o e-mail.';
        case 'auth/wrong-password':
            return 'Senha incorreta.';
        case 'auth/invalid-email':
            return 'O formato do e-mail é inválido.';
        case 'auth/user-disabled':
            return 'Esta conta foi desativada.';
        case 'auth/too-many-requests':
            return 'Muitas tentativas falhas. Tente novamente mais tarde.';
        case 'auth/email-already-in-use':
            return 'Este e-mail já está cadastrado.';
        case 'auth/weak-password':
            return 'A senha deve ter pelo menos 6 caracteres.';
        case 'auth/network-request-failed':
            return 'Erro de conexão. Verifique sua internet.';
        case 'permission-denied':
            return 'Permissão negada. Você não tem acesso a este recurso.';
        default:
            return 'Ocorreu um erro inesperado. Tente novamente.';
    }
};
