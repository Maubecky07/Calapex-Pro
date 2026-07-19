// ================= NEWS FUNKTIONEN =================
        async function postToWhatsAppChannel(title, content) {
            const whatsappWebhookUrl = "HIER_DEINE_WHATSAPP_WEBHOOK_URL_EINTRAGEN"; 
            if (!whatsappWebhookUrl || whatsappWebhookUrl === "HIER_DEINE_WHATSAPP_WEBHOOK_URL_EINTRAGEN") return;
            try { await fetch(whatsappWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title, message: content }) }); } catch (e) { console.error("Fehler beim WhatsApp-Post:", e); }
        }

        async function loadNews() {
            openView('view-news'); const container = document.getElementById('news-list'); container.innerHTML = '<p style="color:#aaa;">Lade News...</p>';
            document.getElementById('dev-news-controls').style.display = isDeveloper() ? 'block' : 'none';
            if (!supabaseClient) return container.innerHTML = '<p style="color:#aaa;">Demo-Modus: Keine Datenbankverbindung.</p>';
            const { data: news, error } = await supabaseClient.from('app_news').select('*').order('created_at', { ascending: false });
            if (error) return container.innerHTML = `<p style="color:var(--primary);">Fehler (Tabelle 'app_news' existiert vielleicht nicht?): ${error.message}</p>`;
            if (!news || news.length === 0) return container.innerHTML = '<p style="color:#aaa; text-align: center; padding: 20px; border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px;">Es gibt noch keine Neuigkeiten.</p>';
            let html = '';
            news.forEach(n => {
                const date = new Date(n.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                html += `<div style="background: rgba(20,20,20,0.8); border: 1px solid rgba(255,255,255,0.05); border-left: 5px solid var(--primary); padding: 20px; border-radius: 8px;"><div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;"><h3 style="color: white; margin: 0; font-size: 1.5rem; text-transform: uppercase;">${n.title}</h3><span style="color: #888; font-size: 0.85rem; background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 5px;">📅 ${date} | 👤 ${n.author_name}</span></div><div style="color: #ccc; line-height: 1.6; white-space: pre-wrap; font-size: 1.05rem;">${n.content}</div>${isDeveloper() ? `<div style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; text-align: right;"><button onclick="deleteNews('${n.id}')" style="background: rgba(220,53,69,0.1); border:1px solid #dc3545; color:#dc3545; cursor:pointer; padding: 8px 15px; border-radius: 5px; transition: 0.2s; font-size: 0.9rem; font-weight: bold;">🗑️ Post löschen</button></div>` : ''}</div>`;
            });
            container.innerHTML = html;
        }

        function showNewsModal() { document.getElementById('news-title').value = ''; document.getElementById('news-content').value = ''; document.getElementById('news-modal').style.display = 'flex'; }
        function closeNewsModal() { document.getElementById('news-modal').style.display = 'none'; }

        async function saveNews() {
            const title = document.getElementById('news-title').value.trim(); const content = document.getElementById('news-content').value.trim();
            if (!title || !content) return showToast("Titel und Inhalt dürfen nicht leer sein!", "error");
            if (!supabaseClient) return showToast("Demo-Modus", "info");
            const { error } = await supabaseClient.from('app_news').insert([{ title: title, content: content, author_name: `${activeUser.first_name} ${activeUser.last_name}` }]);
            if (error) showToast("Fehler beim Posten: " + error.message, "error");
            else { postToWhatsAppChannel(title, content); showToast("News erfolgreich gepostet!", "success"); closeNewsModal(); loadNews(); }
        }

        function deleteNews(id) { customConfirm("Möchtest du diese Ankündigung wirklich löschen?", async () => { if (!supabaseClient) return; const { error } = await supabaseClient.from('app_news').delete().eq('id', id); if (error) showToast("Fehler beim Löschen: " + error.message, "error"); else { showToast("News gelöscht.", "success"); loadNews(); } }); }

        // ================= PATCHLOG FUNKTIONEN =================
        async function loadPatchlog() {
            openView('view-patchlog'); const container = document.getElementById('patchlog-list'); container.innerHTML = '<p style="color:#aaa;">Lade Patchlog...</p>';
            document.getElementById('dev-patchlog-controls').style.display = isDeveloper() ? 'block' : 'none';
            if (!supabaseClient) return container.innerHTML = '<p style="color:#aaa;">Demo-Modus: Keine Datenbankverbindung.</p>';
            const { data: logs, error } = await supabaseClient.from('app_patchlog').select('*').order('created_at', { ascending: false });
            if (error) return container.innerHTML = `<p style="color:var(--primary);">Fehler (Tabelle 'app_patchlog' existiert vielleicht nicht?): ${error.message}</p>`;
            if (!logs || logs.length === 0) return container.innerHTML = '<p style="color:#aaa; text-align: center; padding: 20px; border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px;">Es gibt noch keine Patchlog-Einträge.</p>';

            const versionOrder = []; const groupedLogs = {};
            logs.forEach(l => { const v = l.version || 'Sonstige'; if (!groupedLogs[v]) { groupedLogs[v] = []; versionOrder.push(v); } groupedLogs[v].push(l); });

            let html = '';
            versionOrder.forEach(version => {
                html += `<div style="margin-bottom: 40px;"><h3 style="color: var(--primary); font-size: 1.8rem; border-bottom: 2px solid var(--primary); padding-bottom: 5px; margin-bottom: 15px; text-transform: uppercase;">Update ${version}</h3><div style="display: flex; flex-direction: column; gap: 15px;">`;
                groupedLogs[version].forEach(l => {
                    const date = new Date(l.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    let typeColor = '#ccc'; if(l.type === 'NEU') typeColor = '#28a745'; if(l.type === 'ÄNDERUNG') typeColor = '#ffcc00'; if(l.type === 'FIX') typeColor = '#dc3545';
                    html += `<div style="background: rgba(20,20,20,0.8); border: 1px solid rgba(255,255,255,0.05); border-left: 5px solid ${typeColor}; padding: 15px; border-radius: 8px;"><div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;"><h4 style="color: white; margin: 0; font-size: 1.2rem;"><span style="color: ${typeColor}; margin-right: 10px; border: 1px solid ${typeColor}; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">${l.type}</span>${l.title}</h4><span style="color: #888; font-size: 0.8rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 5px;">📅 ${date}</span></div><div style="color: #ccc; line-height: 1.5; white-space: pre-wrap; font-size: 1rem;">${l.content}</div>${isDeveloper() ? `<div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; text-align: right;"><button onclick="deletePatchlog('${l.id}')" style="background: rgba(220,53,69,0.1); border:1px solid #dc3545; color:#dc3545; cursor:pointer; padding: 6px 12px; border-radius: 5px; transition: 0.2s; font-size: 0.85rem; font-weight: bold;">🗑️ Löschen</button></div>` : ''}</div>`;
                });
                html += `</div></div>`;
            });
            container.innerHTML = html;
        }

        function showPatchlogModal() { document.getElementById('patchlog-version').value = 'v0.7.0'; document.getElementById('patchlog-type').value = 'NEU'; document.getElementById('patchlog-title').value = ''; document.getElementById('patchlog-content').value = ''; document.getElementById('patchlog-modal').style.display = 'flex'; }
        function closePatchlogModal() { document.getElementById('patchlog-modal').style.display = 'none'; }

        async function savePatchlog() {
            const version = document.getElementById('patchlog-version').value.trim(); const type = document.getElementById('patchlog-type').value;
            const title = document.getElementById('patchlog-title').value.trim(); const content = document.getElementById('patchlog-content').value.trim();
            if (!title || !content || !version) return showToast("Version, Titel und Inhalt dürfen nicht leer sein!", "error");
            if (!supabaseClient) return showToast("Demo-Modus", "info");

            const { error } = await supabaseClient.from('app_patchlog').insert([{ version: version, type: type, title: title, content: content, author_id: activeUser.id }]);
            if (error) showToast("Fehler beim Speichern: " + error.message, "error");
            else { showToast("Patchlog erfolgreich gespeichert!", "success"); closePatchlogModal(); loadPatchlog(); }
        }

        function deletePatchlog(id) { customConfirm("Möchtest du diesen Patchlog-Eintrag wirklich löschen?", async () => { if (!supabaseClient) return; const { error } = await supabaseClient.from('app_patchlog').delete().eq('id', id); if (error) showToast("Fehler beim Löschen: " + error.message, "error"); else { showToast("Eintrag gelöscht.", "success"); loadPatchlog(); } }); }