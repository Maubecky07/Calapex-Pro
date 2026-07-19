 // ================= GLOBAL CHAT FUNKTIONEN =================
        async function loadGlobalChat() {
            const container = document.getElementById('global-chat-messages'); container.innerHTML = '<p style="color:#aaa; text-align:center; padding: 20px;">Lade Nachrichten...</p>';
            if (!supabaseClient) return container.innerHTML = '<p style="color:#aaa; text-align:center; padding: 20px;">Demo-Modus: Keine Datenbankverbindung.</p>';
            const { data, error } = await supabaseClient.from('app_global_chat').select('*').order('created_at', { ascending: true }).limit(100);
            if (error) return container.innerHTML = `<p style="color:var(--primary); padding: 20px;">Fehler (Tabelle fehlt?): ${error.message}</p>`;
            container.innerHTML = '';
            if (!data || data.length === 0) container.innerHTML = '<p id="no-msg-hint" style="color:#aaa; text-align:center; padding: 20px;">Noch keine Nachrichten. Sei der Erste!</p>';
            else data.forEach(msg => appendChatMessage(msg));
            scrollToChatBottom();
        }

        function appendChatMessage(msg) {
            const container = document.getElementById('global-chat-messages');
            if (msg.id && document.getElementById('chat-msg-' + msg.id)) return; 
            const noMsgHint = document.getElementById('no-msg-hint'); if (noMsgHint) noMsgHint.remove();
            const isOwn = activeUser && msg.user_id === activeUser.id;
            const time = new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute:'2-digit' });
            const div = document.createElement('div'); div.className = `chat-message ${isOwn ? 'own' : ''}`; if (msg.id) div.id = 'chat-msg-' + msg.id;
            div.innerHTML = `<div style="font-size: 0.85rem; color: ${isOwn ? '#ffaaaa' : '#aaa'}; margin-bottom: 5px; font-weight: bold;">${msg.user_name} <span style="font-weight: normal; color: #777; margin-left: 5px;">${time}</span></div><div style="color: white; line-height: 1.4; word-break: break-word; font-size: 1.05rem;">${msg.message}</div>`;
            container.appendChild(div);
        }

        function scrollToChatBottom() { const container = document.getElementById('global-chat-messages'); container.scrollTop = container.scrollHeight; }

        async function sendGlobalChatMessage() {
            const input = document.getElementById('global-chat-input'); const text = input.value.trim(); if (!text || !activeUser) return;
            input.value = ''; 
            if (!supabaseClient) {
                showToast("Demo-Modus: Chat funktioniert ohne Datenbank nur lokal.", "info");
                appendChatMessage({ id: 'demo-' + Date.now(), user_id: activeUser.id, user_name: `${activeUser.first_name} ${activeUser.last_name}`, message: text, created_at: new Date().toISOString() });
                scrollToChatBottom(); return;
            }
            const payload = { user_id: activeUser.id, user_name: `${activeUser.first_name} ${activeUser.last_name}`, message: text };
            const { data, error } = await supabaseClient.from('app_global_chat').insert([payload]).select();
            if (error) showToast("Fehler beim Senden: " + error.message, "error");
            else if (data && data.length > 0) { appendChatMessage(data[0]); scrollToChatBottom(); }
        }

        // ================= TEAM CHAT FUNKTIONEN =================
        async function loadTeamChat() {
            const container = document.getElementById('team-chat-messages');
            container.innerHTML = '<p style="color:#aaa; text-align:center; padding: 20px;">Lade Chat...</p>';
            if (!supabaseClient) return container.innerHTML = '<p style="color:#aaa; text-align:center; padding: 20px;">Demo-Modus</p>';
            
            const { data, error } = await supabaseClient.from('team_chat').select('*').eq('team_id', currentOpenTeamId).order('created_at', { ascending: true }).limit(100);
            if (error) return container.innerHTML = `<p style="color:var(--primary); padding: 20px;">Fehler: ${error.message}</p>`;
            
            container.innerHTML = '';
            if (!data || data.length === 0) container.innerHTML = '<p id="no-team-msg-hint" style="color:#aaa; text-align:center; padding: 20px; font-size: 0.9rem;">Noch keine Nachrichten in diesem Team.</p>';
            else data.forEach(msg => appendTeamChatMessage(msg));
            scrollToTeamChatBottom();
        }

        function appendTeamChatMessage(msg) {
            const container = document.getElementById('team-chat-messages');
            if (msg.id && document.getElementById('team-chat-msg-' + msg.id)) return;
            const hint = document.getElementById('no-team-msg-hint'); if (hint) hint.remove();
            
            const isOwn = activeUser && msg.user_id === activeUser.id;
            const time = new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute:'2-digit' });
            
            const div = document.createElement('div');
            div.className = `chat-message ${isOwn ? 'own' : ''}`;
            if (msg.id) div.id = 'team-chat-msg-' + msg.id;
            div.style.maxWidth = '90%';
            div.style.padding = '8px 12px';
            
            div.innerHTML = `<div style="font-size: 0.75rem; color: ${isOwn ? '#ffaaaa' : '#aaa'}; margin-bottom: 3px; font-weight: bold;">${msg.user_name} <span style="font-weight: normal; color: #777; margin-left: 5px;">${time}</span></div><div style="color: white; line-height: 1.3; word-break: break-word; font-size: 0.95rem;">${msg.message}</div>`;
            container.appendChild(div);
        }

        function scrollToTeamChatBottom() {
            const container = document.getElementById('team-chat-messages');
            container.scrollTop = container.scrollHeight;
        }

        async function sendTeamChatMessage() {
            const input = document.getElementById('team-chat-input');
            const text = input.value.trim();
            if (!text || !activeUser || !currentOpenTeamId) return;
            input.value = '';
            
            if (!supabaseClient) {
                appendTeamChatMessage({ id: 'demo-' + Date.now(), user_id: activeUser.id, user_name: `${activeUser.first_name} ${activeUser.last_name}`, message: text, created_at: new Date().toISOString() });
                scrollToTeamChatBottom();
                return;
            }
            
            const payload = { team_id: currentOpenTeamId, user_id: activeUser.id, user_name: `${activeUser.first_name} ${activeUser.last_name}`, message: text };
            const { data, error } = await supabaseClient.from('team_chat').insert([payload]).select();
            if (error) showToast("Fehler beim Senden: " + error.message, "error");
            else if (data && data.length > 0) { appendTeamChatMessage(data[0]); scrollToTeamChatBottom(); }
        }