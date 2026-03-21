import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

// Função auxiliar para sanitização (remove tudo que não for dígito)
const sanitize = (str: string) => str.replace(/\D/g, '');

// Implementação Segura via Environment Variable
export const importProducers = onRequest({ region: "us-central1", maxInstances: 10, memory: "512MiB" }, async (req, res) => {
    // 1. Autenticação Segura
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Token inválido ou ausente" });
        return;
    }

    const token = authHeader.split("Bearer ")[1];
    // O secret é carregado das variáveis de ambiente (.env.production)
    const secret = process.env.INTERNAL_API_KEY;

    if (!secret) {
        console.error("INTERNAL_API_KEY não disponível no ambiente.");
        res.status(500).json({ error: "Erro de configuração do servidor" });
        return;
    }

    try {
        const bufferToken = Buffer.from(token);
        const bufferSecret = Buffer.from(secret);
        
        // Timing Safe Equal exige buffers de mesmo tamanho
        if (bufferToken.length !== bufferSecret.length || !crypto.timingSafeEqual(bufferToken, bufferSecret)) {
            res.status(401).json({ error: "Token inválido ou ausente" });
            return;
        }
    } catch (e) {
        // Se houver erro na criação do Buffer (ex: token vazio), falha a auth
        res.status(401).json({ error: "Token inválido ou ausente" });
        return;
    }

    // 2. Validação de Payload
    const payload = req.body;
    const { id, nome, email, whatsapp, cpf, kycVerificado } = payload;

    const errors: string[] = [];
    if (!id) errors.push("Campo 'id' é obrigatório");
    if (!nome) errors.push("Campo 'nome' é obrigatório");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Campo 'email' inválido");
    // CPF é obrigatório segundo spec? Sim, "12345678900".
    if (!cpf) errors.push("Campo 'cpf' é obrigatório");

    if (errors.length > 0) {
        res.status(400).json({ error: "Payload inválido", details: errors });
        return;
    }

    // 3. Sanitização e Mapeamento
    const producerData = {
        id: id,
        nome_display: nome,
        email_contato: email,
        whatsapp_contato: whatsapp ? sanitize(whatsapp) : null,
        cpf: sanitize(cpf),
        cnpj: payload.cnpj ? sanitize(payload.cnpj) : null,
        kyc_status: kycVerificado ?? false, // [FIX] Evita 'undefined' que quebra o Firestore
        
        // Campos Default
        stage: "ONBOARDING",
        status_health: "SAUDAVEL",
        health_score: 100,
        gerente_conta: "Sistema",
        tags: admin.firestore.FieldValue.arrayUnion("Integração KYC", "Novo Produtor"),
        foto_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=random`,
        
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // 4. Persistência (Idempotência)
    try {
        const db = admin.firestore();
        const docRef = db.collection("producers").doc(id);
        
        // Use set com merge para idempotência (cria ou atualiza)
        await docRef.set(producerData, { merge: true });

        console.log(`Produtor importado com sucesso: ${id} (${email})`);

        res.status(200).json({
            success: true,
            producerId: id,
            action: "processed"
        });
    } catch (error) {
        console.error("Erro ao persistir produtor:", error);
        res.status(500).json({ error: "Erro interno ao processar dados" });
    }
});
