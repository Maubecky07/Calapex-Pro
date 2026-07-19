// --- Auth Functions ---
        async function registerUser() {
            const fn = document.getElementById('reg-firstname').value.trim(); const ln = document.getElementById('reg-lastname').value.trim();
            const em = document.getElementById('reg-email').value.trim(); const pw = document.getElementById('reg-password').value;
            if(!fn || !ln || !em || !pw) return showToast("Bitte alle Felder ausfüllen!", "error");
            if(!supabaseClient) return showToast("Demo-Modus: Datenbank nicht verbunden.", "error");

            const { data, error } = await supabaseClient.auth.signUp({ email: em, password: pw, options: { data: { first_name: fn, last_name: ln } } });
            if (error) showToast("Fehler bei der Registrierung: " + error.message, "error");
            else {
                if (data.user) await supabaseClient.from('app_users').insert([{ id: data.user.id, first_name: fn, last_name: ln, email: em, password: null }]);
                showToast("Registrierung erfolgreich! Bitte überprüfe dein E-Mail-Postfach und bestätige deine Adresse.", "success");
                toggleAuth('login');
            }
        }

        async function loginUser() {
            const fn = document.getElementById('login-firstname').value.trim(); const ln = document.getElementById('login-lastname').value.trim(); const pw = document.getElementById('login-password').value;
            if(!fn || !ln || !pw) return showToast("Bitte alle Felder ausfüllen!", "error");
            if(!supabaseClient) { activeUser = { id: 'demo-uuid-123', first_name: fn, last_name: ln, email: 'demo@beispiel.de', is_developer: true }; return processLoginSuccess(); }

            const { data: dbUser, error: dbError } = await supabaseClient.from('app_users').select('*').eq('first_name', fn).eq('last_name', ln).single();
            if (dbError || !dbUser) return showToast("Vorname oder Nachname nicht gefunden!", "error");
            if (dbUser.password && dbUser.password === pw) { activeUser = dbUser; return processLoginSuccess(); }
            if (dbUser.email) {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email: dbUser.email, password: pw });
                if (error) return showToast(error.message.includes('Email not confirmed') ? "Bitte bestätige zuerst deine E-Mail-Adresse im Postfach!" : "Vorname, Nachname oder Passwort falsch!", "error");
                activeUser = { id: data.user.id, first_name: dbUser.first_name, last_name: dbUser.last_name, email: dbUser.email, is_developer: dbUser.is_developer };
                return processLoginSuccess();
            }
            showToast("Vorname, Nachname oder Passwort falsch!", "error");
        }

        function processLoginSuccess() {
            document.getElementById('profile-name').innerText = `${activeUser.first_name} ${activeUser.last_name}`;
            document.getElementById('profile-badge').style.display = 'flex';
            document.getElementById('online-users-widget').style.display = 'block'; 
            if (isDeveloper()) { const devBtn = document.getElementById('btn-dev-fahrer'); if (devBtn) devBtn.style.display = 'block'; }
            openView('view-home'); loadGlobalChat(); initPresence(); initDataSubscriptions(); 
        }

        function logout() {
            cleanupPresence(); cleanupDataSubscriptions(); stopIdleTracking();
            if (teamChatChannel && supabaseClient) { supabaseClient.removeChannel(teamChatChannel); teamChatChannel = null; }
            activeUser = null; document.getElementById('profile-badge').style.display = 'none'; document.getElementById('online-users-widget').style.display = 'none'; 
            const devBtn = document.getElementById('btn-dev-fahrer'); if (devBtn) devBtn.style.display = 'none';
            if (eventTickerInterval) clearInterval(eventTickerInterval);
            if(supabaseClient) supabaseClient.auth.signOut();
            openView('view-landing'); 
        }
        
        async function loadAllUsers() {
            openView('view-fahrer');
            const container = document.getElementById('all-users-list');
            container.innerHTML = '<p style="color:#aaa;">Lade Fahrer-Datenbank...</p>';
            if (!supabaseClient) return container.innerHTML = '<p style="color:#aaa;">Demo-Modus: Keine Datenbankverbindung.</p>';

            const { data: users, error } = await supabaseClient.from('app_users').select('*').order('first_name', { ascending: true });
            if (error) return container.innerHTML = `<p style="color:var(--primary);">Fehler: ${error.message}</p>`;

            if (!users || users.length === 0) return container.innerHTML = '<p style="color:#aaa;">Keine Benutzer gefunden.</p>';

            let html = '';
            users.forEach(u => {
                html += `<div style="background: rgba(20,20,20,0.8); border: 1px solid rgba(255,255,255,0.05); border-left: 5px solid #a970ff; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <div style="color: white; font-size: 1.2rem; font-weight: bold;">${u.first_name} ${u.last_name}</div>
                        <div style="color: #aaa; font-size: 0.9rem;">ID: ${u.id} | Email: ${u.email}</div>
                    </div>
                    ${u.is_developer ? '<span style="background: rgba(169,112,255,0.2); color: #a970ff; padding: 5px 10px; border-radius: 5px; font-size: 0.8rem; font-weight: bold; border: 1px solid #a970ff;">Developer</span>' : ''}
                </div>`;
            });
            container.innerHTML = html;
        }