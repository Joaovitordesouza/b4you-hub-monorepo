
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { Mail, Lock, ArrowRight, Loader2, Sparkles, ShieldCheck, KeyRound, CheckCircle2, AlertTriangle, ArrowLeft, Ticket } from 'lucide-react';
import { getFirebaseErrorMessage } from '../utils/errorHandling';
import { useToast } from '../contexts/ToastContext';

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Estado para alternar entre Login, Recuperação e Ativação
  const [view, setView] = useState<'LOGIN' | 'FORGOT' | 'ACTIVATE'>('LOGIN');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(''); // Para ativação

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (err: any) {
        console.error(err);
        setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) {
          setError('Digite seu e-mail para recuperar a senha.');
          return;
      }
      
      setError('');
      setSuccessMsg('');
      setLoading(true);

      try {
          await auth.sendPasswordResetEmail(email);
          setSuccessMsg('Email de recuperação enviado! Verifique sua caixa de entrada.');
          setTimeout(() => setView('LOGIN'), 5000); 
      } catch (err: any) {
          console.error(err);
          setError(getFirebaseErrorMessage(err));
      } finally {
          setLoading(false);
      }
  };

  const handleActivateAccount = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
          let pendingDoc;
          try {
              pendingDoc = await db.collection('users').doc(inviteCode.trim()).get();
          } catch (e: any) {
              if (e.code === 'permission-denied') {
                  throw new Error("Convite não encontrado ou código incorreto.");
              }
              throw e;
          }

          if (!pendingDoc.exists) {
              throw new Error("Convite não encontrado ou código incorreto.");
          }

          const pendingData = pendingDoc.data() as any;

          // 2. Valida se o email bate e se o status é pending
          if (pendingData.status !== 'pending') {
              throw new Error("Este convite já foi utilizado ou não é mais válido.");
          }
          if (pendingData.email.toLowerCase() !== email.toLowerCase().trim()) {
              throw new Error("O e-mail informado não corresponde a este convite.");
          }

          // 3. Cria conta no Firebase Auth
          const userCredential = await auth.createUserWithEmailAndPassword(email, password);
          const newUid = userCredential.user?.uid;

          if (!newUid) throw new Error("Falha ao criar autenticação.");

          // 4. Migra dados para novo documento com ID correto (UID)
          const newUserData = {
              ...pendingData,
              id: newUid,
              uid: newUid,
              status: 'active',
              inviteCode: null, // Remove o código usado
              lastLoginAt: new Date().toISOString(),
              createdAt: pendingData.createdAt // Mantém data original
          };

          const batch = db.batch();
          
          // Cria novo doc
          batch.set(db.collection('users').doc(newUid), newUserData);
          
          // Deleta doc antigo (pendente)
          batch.delete(db.collection('users').doc(pendingDoc.id));

          await batch.commit();

          // Sucesso - O Auth listener no AuthContext fará o login automático
          setSuccessMsg("Conta ativada com sucesso! Entrando...");

      } catch (err: any) {
          console.error(err);
          // Tradução manual para erros específicos deste fluxo
          let msg = getFirebaseErrorMessage(err);
          if (err.message.includes("Convite não encontrado")) msg = "Convite não encontrado ou código incorreto.";
          if (err.message.includes("Este convite já foi utilizado")) msg = "Este convite já foi utilizado ou não é mais válido.";
          if (err.message.includes("O e-mail informado não corresponde")) msg = "O e-mail informado não corresponde a este convite.";
          if (err.code === 'auth/email-already-in-use') msg = "Este e-mail já possui uma conta ativa. Tente fazer login.";
          
          setError(msg);
          // Se falhou auth create mas o usuário existe, faz logout preventivo
          if (auth.currentUser) auth.signOut();
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 auth-gradient bg-[#FAFAFA]">
      <div className="max-w-md w-full">
        {/* Card branco com sombra suave */}
        <div className="bg-white rounded-[2rem] shadow-2xl p-10 border border-white/50 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-500 to-brand-700"></div>

          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-brand-100">
                <img 
                   src="https://firebasestorage.googleapis.com/v0/b/b4you-hub.firebasestorage.app/o/logoDark.png?alt=media&token=307bf6df-6078-45f9-83a1-fff18657053b" 
                   alt="B4You" 
                   className="h-8 w-auto object-contain"
                />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                {view === 'LOGIN' ? 'Portal do Colaborador' : view === 'ACTIVATE' ? 'Primeiro Acesso' : 'Recuperar Acesso'}
            </h1>
            <p className="text-gray-500 text-sm font-medium mt-1 text-center">
                {view === 'LOGIN' ? 'Acesso restrito à equipe B4You' : view === 'ACTIVATE' ? 'Valide seu convite para começar.' : 'Insira seu e-mail corporativo.'}
            </p>
          </div>

          {/* TABS DE NAVEGAÇÃO (Login vs Activate) */}
          {view !== 'FORGOT' && (
              <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                  <button onClick={() => { setView('LOGIN'); setError(''); }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'LOGIN' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                      Entrar
                  </button>
                  <button onClick={() => { setView('ACTIVATE'); setError(''); }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'ACTIVATE' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                      Ativar Conta
                  </button>
              </div>
          )}

          {view === 'LOGIN' && (
              <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Corporativo</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors" size={18} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-medium outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                      placeholder="nome@b4you.com.br"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center ml-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Senha</label>
                      <button type="button" onClick={() => { setError(''); setView('FORGOT'); }} className="text-[10px] font-bold text-brand-600 hover:underline">
                          Esqueceu a senha?
                      </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors" size={18} />
                    <input 
                      type="password" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-medium outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 flex items-center gap-2 font-bold animate-pulse">
                    <ShieldCheck size={16} className="shrink-0" />
                    {error}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:shadow-xl transition-all flex items-center justify-center space-x-2 group active:scale-95"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <span>Acessar Workspace</span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
          )}

          {view === 'ACTIVATE' && (
              <form onSubmit={handleActivateAccount} className="space-y-5 animate-in fade-in slide-in-from-right duration-300">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Seu Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors" size={18} />
                      <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-medium outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                        placeholder="email@convidado.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Código de Convite</label>
                    <div className="relative group">
                      <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors" size={18} />
                      <input 
                        type="text" 
                        value={inviteCode}
                        onChange={e => setInviteCode(e.target.value.toUpperCase())}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-mono font-bold outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all uppercase"
                        placeholder="B4-XXXXXX"
                        required
                        maxLength={9}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Crie sua Senha</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors" size={18} />
                      <input 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-medium outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 flex items-center gap-2 font-bold animate-pulse">
                      <AlertTriangle size={16} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 bg-green-50 text-green-700 text-xs rounded-xl border border-green-100 flex items-center gap-2 font-bold">
                      <CheckCircle2 size={16} className="shrink-0" />
                      {successMsg}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading || !!successMsg}
                    className="w-full py-4 bg-black hover:bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 group active:scale-95 disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><Sparkles size={18} /> <span>Validar e Acessar</span></>}
                  </button>
              </form>
          )}

          {view === 'FORGOT' && (
              <form onSubmit={handleResetPassword} className="space-y-6 animate-in fade-in slide-in-from-left duration-300">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Cadastrado</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors" size={18} />
                      <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-medium outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                        placeholder="nome@b4you.com.br"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 flex items-center gap-2 font-bold">
                      <AlertTriangle size={16} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-4 bg-green-50 text-green-700 text-xs rounded-xl border border-green-100 flex items-center gap-2 font-bold">
                      <CheckCircle2 size={16} className="shrink-0" />
                      {successMsg}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading || !!successMsg}
                    className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><KeyRound size={18} /> <span>Enviar Link de Recuperação</span></>}
                  </button>

                  <button 
                    type="button"
                    onClick={() => { setView('LOGIN'); setError(''); setSuccessMsg(''); }}
                    className="w-full py-2 text-gray-500 text-xs font-bold hover:text-gray-900 flex items-center justify-center gap-2"
                  >
                      <ArrowLeft size={14} /> Voltar para o Login
                  </button>
              </form>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
             <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
               <Sparkles size={12} className="text-brand-500" />
               Protegido por Google Cloud Identity
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
