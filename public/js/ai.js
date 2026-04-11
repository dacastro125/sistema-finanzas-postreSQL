// Estado global de la conversación (memoria corto plazo en el FE para Gemini)
let chatHistory = [];

window.initPage_ai = function() {
    initAI();
};

function initAI() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatBox = document.getElementById('chatBox');
    const typingIndicator = document.getElementById('typingIndicator');
    const sendBtn = document.getElementById('sendBtn');

    if (!chatForm) return;

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const message = chatInput.value.trim();
        if (!message) return;

        // 1. Mostrar el mensaje del usuario
        appendMessage('user', message);
        chatInput.value = '';
        sendBtn.disabled = true;

        // 2. Mostrar "Escribiendo..."
        typingIndicator.classList.add('active');
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message,
                    history: chatHistory
                })
            });

            const data = await res.json();
            
            typingIndicator.classList.remove('active');
            
            if (res.ok) {
                // Registrar histórial localmente para contexto futuro de chat
                chatHistory.push({ role: 'user', parts: [{ text: message }] });
                chatHistory.push({ role: 'model', parts: [{ text: data.reply }] });
                
                // 3. Imprimir respuesta
                appendMessage('model', data.reply);
            } else {
                appendMessage('model', `**Error interno reportado por Gemini:**\n${data.details || 'Revisa tu terminal, el error fue silencioso.'}\n\n*Nota técnica: ${data.error}*`);
            }

        } catch (error) {
            typingIndicator.classList.remove('active');
            console.error(error);
            appendMessage('model', '**Fallo del servidor.** No se pudo contactar con la Inteligencia Artificial.');
        } finally {
            sendBtn.disabled = false;
            chatInput.focus();
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    });

    function appendMessage(role, text) {
        // Remover el indicador temporalmente para insertar el msj antes de él
        chatBox.removeChild(typingIndicator);

        const row = document.createElement('div');
        row.className = `message-row ${role}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'msg-avatar';
        avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        
        // ConvertTextToHTML hace un parseo simplificado de Markdown nativo a HTML estructurado
        bubble.innerHTML = parseMarkdownToHTML(text);

        row.appendChild(avatar);
        row.appendChild(bubble);
        
        chatBox.appendChild(row);
        chatBox.appendChild(typingIndicator); // Ponerlo siempre al final
        
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Un parseador extremadamente eficiente y ligero para Markdown (Negritas, Listas, Saltos)
    function parseMarkdownToHTML(md) {
        // Enlaces (Opcional, previene XSS minimamente escapando brackets)
        let html = md.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        // Negritas
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        
        // Headers (### Título) - convertimos en strong
        html = html.replace(/###\s(.*?)\n/g, "<p><strong>$1</strong></p>");
        html = html.replace(/##\s(.*?)\n/g, "<p><strong>$1</strong></p>");
        
        // Listas desordenadas
        html = html.replace(/^\*\s(.*)$/gm, "<li>$1</li>");
        html = html.replace(/<li>.*<\/li>/s, match => `<ul>${match}</ul>`); // envuelve en ul iterativo básico
        // Corrección de wrapping UL rápida
        html = html.replace(/<\/li>\n<li>/g, "</li><li>");
        
        // Saltos de línea
        html = html.split('\n\n').map(p => {
             // Si el string ya tiene block tags, no lo envuelvas en p
             if (p.startsWith('<ul') || p.startsWith('<p>')) return p;
             return `<p>${p.replace(/\n/g, "<br>")}</p>`;
        }).join('');

        return html;
    }
}
