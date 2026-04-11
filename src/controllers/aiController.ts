import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const aiController = {
    chat: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ error: 'No autorizado.' });
                return;
            }

            const { message, history } = req.body;
            
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                 res.status(500).json({ error: 'Falta configurar la variable de entorno GEMINI_API_KEY en el servidor (Ej. en Render o local .env).' });
                 return;
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            
            // ─── Recolectando toda la data cruda como el usuario especificó ───
            const userData = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    accounts: true,
                    budgets: true,
                    transactions: {
                        include: { category: true },
                        orderBy: { date: 'desc' }
                    },
                    credits: {
                        include: { installments: true }
                    }
                }
            });

            if (!userData) {
                 res.status(404).json({ error: 'Usuario no encontrado.' });
                 return;
            }

            // Excluir datos confidenciales como contraseñas encriptadas
            const { passwordHash, ...cleanUserData } = userData;

            // Construir el System Instruction (Contexto maestro)
            const systemInstruction = `
Eres un asistente financiero experto altamente analítico, integrado directamente dentro del sistema financiero del usuario.
Tu objetivo es ayudarle a organizar sus finanzas, responder sus dudas sobre gastos, deudas y presupuestos con total claridad.
Debes ser amable y conciso, utilizando listas o formatos legibles en texto si él te pide desgloses o reportes.
Evita usar frases robóticas, compórtate como un asesor personal brillante.

A continuación tienes absolutamente TODOS los datos en crudo de su estado financiero (incluyendo sus cuentas, transacciones y créditos con todas sus cuotas por pagar/pagadas). 

### DATOS DEL USUARIO: ${cleanUserData.name} (Email: ${cleanUserData.email}) ###
${JSON.stringify({
    Cuentas_Bancarias: cleanUserData.accounts,
    Presupuestos_Categorizados: cleanUserData.budgets,
    Historial_Transacciones: cleanUserData.transactions,
    Lista_Creditos_Amortizacion: cleanUserData.credits
}, null, 2)}
### FIN DE LOS DATOS ###

Utiliza exclusivamente estos datos para responder sus preguntas si te piden un estatus, sumatorias, sugerencias y diagnósticos.
`;

            // Utilizando el modelo más rápido y compatible con largas ventanas de contexto
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                systemInstruction: systemInstruction,
            });

            // Reconstruimos la conversación si el FE envió historial
            const chat = model.startChat({
                 history: history || [] 
            });

            // Enviar el prompt (mensaje actual)
            const result = await chat.sendMessage(message);
            const responseText = result.response.text();

            res.json({ reply: responseText });

        } catch (error: any) {
            console.error('[AI Chat Error]', error);
            res.status(500).json({ error: 'Ocurrió un error con el modelo de Gemini.', details: error.message });
        }
    }
};
