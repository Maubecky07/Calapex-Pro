// ================= TEAM MANAGEMENT =================
        function generateInviteCode() { return Math.random().toString(36).substring(2, 7).toUpperCase(); }

        async function createTeam() {
            const name = document.getElementById('create-team-name').value.trim(); const sim = document.getElementById('create-team-sim').value; const logoInput = document.getElementById('create-team-logo');
            const desc = document.getElementById('create-team-desc').value.trim();
            if(!name) return showToast("Team Name ist erforderlich!", "error");
            let logoUrl = "https://via.placeholder.com/150/222222/FFFFFF?text=Logo"; 

            if (logoInput.files && logoInput.files.length > 0 && supabaseClient) {
                const file = logoInput.files[0]; const fileExt = file.name.split('.').pop(); const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const { error: uploadError } = await supabaseClient.storage.from('team-logos').upload(fileName, file);
                if (uploadError) return showToast("Fehler beim Logo-Upload: " + uploadError.message, "error");
                const { data: publicUrlData } = supabaseClient.storage.from('team-logos').getPublicUrl(fileName); logoUrl = publicUrlData.publicUrl;
            }

            const code = generateInviteCode();
            if(!supabaseClient) return showToast("Demo: Team erstellt.", "info");

            const { data, error } = await supabaseClient.from('teams').insert([{ name: name, logo_url: logoUrl, sim: sim, description: desc, invite_code: code, admin_id: activeUser.id }]).select();
            if(error) return showToast("Fehler beim Erstellen: " + error.message, "error");

            const teamId = data[0].id; const userName = `${activeUser.first_name} ${activeUser.last_name}`;
            await supabaseClient.from('team_members').insert([{ team_id: teamId, user_id: activeUser.id, user_name: userName, role: 'Admin' }]);

            showToast(`Team erfolgreich gegründet!\nDein Einladungscode lautet: ${code}`, "success");
            document.getElementById('create-team-name').value = ''; document.getElementById('create-team-desc').value = ''; document.getElementById('create-team-logo').value = '';
            openTeamCalendar(teamId);
        }
        
        function openEditTeamModal() {
            if(!currentTeamData) return;
            document.getElementById('edit-team-name').value = currentTeamData.name; document.getElementById('edit-team-sim').value = currentTeamData.sim;
            document.getElementById('edit-team-desc').value = currentTeamData.description || '';
            document.getElementById('edit-team-webhook').value = currentTeamData.discord_webhook_url || ''; document.getElementById('edit-team-logo').value = '';
            document.getElementById('edit-team-modal').style.display = 'flex';
        }

        function closeEditTeamModal() { document.getElementById('edit-team-modal').style.display = 'none'; }

        async function saveTeamEdit() {
            const name = document.getElementById('edit-team-name').value.trim(); const sim = document.getElementById('edit-team-sim').value;
            const desc = document.getElementById('edit-team-desc').value.trim();
            const webhookUrl = document.getElementById('edit-team-webhook').value.trim(); const logoInput = document.getElementById('edit-team-logo');
            if(!name) return showToast("Team Name ist erforderlich!", "error");
            let logoUrl = currentTeamData.logo_url;

            if (logoInput.files && logoInput.files.length > 0 && supabaseClient) {
                const file = logoInput.files[0]; const fileExt = file.name.split('.').pop(); const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const { error: uploadError } = await supabaseClient.storage.from('team-logos').upload(fileName, file);
                if (uploadError) return showToast("Fehler beim Logo-Upload: " + uploadError.message, "error");
                const { data: publicUrlData } = supabaseClient.storage.from('team-logos').getPublicUrl(fileName); logoUrl = publicUrlData.publicUrl;
            }

            if(!supabaseClient) { showToast("Demo: Team gespeichert.", "info"); return closeEditTeamModal(); }

            const { error } = await supabaseClient.from('teams').update({ name: name, sim: sim, logo_url: logoUrl, description: desc, discord_webhook_url: webhookUrl }).eq('id', currentOpenTeamId);
            if(error) return showToast("Fehler beim Speichern: " + error.message, "error");

            showToast("Team erfolgreich aktualisiert!", "success"); closeEditTeamModal();
            currentTeamData.name = name; currentTeamData.sim = sim; currentTeamData.logo_url = logoUrl; currentTeamData.description = desc; currentTeamData.discord_webhook_url = webhookUrl;
            document.getElementById('calendar-team-name').innerText = name;
        }

        async function loadMyTeams() {
            const container = document.getElementById('grid-my-teams');
            if(!supabaseClient) return container.innerHTML = `<p>Demo-Modus</p>`;
            container.innerHTML = `<p style="color:#aaa;">Lade Teams...</p>`;

            const { data: memberships, error } = await supabaseClient.from('team_members').select('role, teams(*)').eq('user_id', activeUser.id).neq('role', 'Anfrage');
            if(error) return container.innerHTML = `<p>Fehler beim Laden.</p>`;
            if(!memberships || memberships.length === 0) return container.innerHTML = `<p style="color:#aaa; grid-column: 1/-1; text-align: center;">Du bist noch in keinem Team.<br>Gründe ein neues oder suche nach einer ID.</p>`;

            let html = '';
            memberships.forEach(m => {
                const team = m.teams;
                let clickAction = team.is_blocked ? `showToast('Dieses Team wurde temporär vom Administrator gesperrt.', 'error')` : `openTeamCalendar('${team.id}')`;
                let blockBanner = team.is_blocked ? `<div style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px; font-size: 0.8rem; font-weight: bold; text-align: center; margin-bottom: 10px; border: 1px solid #ef4444; border-radius: 4px;">TEAM GESPERRT</div>` : '';
                
                html += `<div class="team-card" onclick="${clickAction}"><div class="team-badge">${m.role}</div>${team.logo_url ? `<img src="${team.logo_url}" class="team-logo" alt="Logo">` : ''}${blockBanner}<div class="team-title">${team.name}</div><div style="color: #aaa; font-size: 0.9rem;">🎮 Simulator: ${team.sim}</div><div style="margin-top: 15px; color: var(--primary); font-size: 0.9rem; font-weight: bold;">➜ Zum Kalender klicken</div></div>`;
            });
            container.innerHTML = html;
        }

        async function searchTeam() {
            const code = document.getElementById('search-team-code').value.trim().toUpperCase();
            if(!code) return showToast("Bitte Code eingeben.", "error");
            const resBox = document.getElementById('search-result-box'); if(!supabaseClient) return;

            const { data: team, error } = await supabaseClient.from('teams').select('*').eq('invite_code', code).single();
            if(error || !team) { resBox.style.display = 'block'; resBox.innerHTML = `<p style="color: var(--primary); font-weight: bold;">Kein Team mit diesem Code gefunden.</p>`; return; }

            const { data: existing } = await supabaseClient.from('team_members').select('role').eq('team_id', team.id).eq('user_id', activeUser.id).single();
            let btnHtml = `<button class="btn-submit" onclick="sendJoinRequest('${team.id}')">Beitrittsanfrage senden</button>`;
            if(existing) btnHtml = existing.role === 'Anfrage' ? `<div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; color: #ffcc00; text-align: center; font-weight: bold;">⏳ Deine Anfrage ist ausstehend.</div>` : `<div style="background: rgba(0,255,0,0.1); padding: 10px; border-radius: 8px; color: #00ff00; text-align: center; font-weight: bold;">✔ Du bist bereits in diesem Team.</div>`;

            let descHtml = team.description ? `<p style="color: #ccc; margin-top: 10px; font-size: 0.95rem; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">${team.description}</p>` : '';

            resBox.style.display = 'block';
            resBox.innerHTML = `<div style="display:flex; align-items:flex-start; gap: 15px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px;"><img src="${team.logo_url}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover; border: 1px solid #444;"><div><h3 style="color: white; margin: 0; font-size: 1.5rem;">${team.name}</h3><p style="color: #aaa; margin: 0; font-size: 0.9rem;">🎮 Simulator: ${team.sim}</p>${descHtml}</div></div>${btnHtml}`;
        }

        async function sendJoinRequest(teamId) {
            const userName = `${activeUser.first_name} ${activeUser.last_name}`;
            const { error } = await supabaseClient.from('team_members').insert([{ team_id: teamId, user_id: activeUser.id, user_name: userName, role: 'Anfrage' }]);
            if(error) showToast("Fehler: " + error.message, "error");
            else { showToast("Deine Beitrittsanfrage wurde an den Admin gesendet!", "success"); searchTeam(); }
        }

        function leaveCurrentTeam() {
            customConfirm("Möchtest du dieses Team wirklich verlassen?\nWenn du wieder eintreten möchtest, musst du eine neue Beitrittsanfrage stellen.", async () => {
                if (!supabaseClient) return showToast("Demo-Modus.", "info");
                const { error } = await supabaseClient.from('team_members').delete().eq('team_id', currentOpenTeamId).eq('user_id', activeUser.id).select();
                if (error) return showToast("Fehler beim Verlassen des Teams: " + error.message, "error");
                showToast("Du hast das Team erfolgreich verlassen.", "success");
                
                if (teamChatChannel && supabaseClient) { supabaseClient.removeChannel(teamChatChannel); teamChatChannel = null; }

                document.getElementById('member-sidebar').classList.remove('open'); currentOpenTeamId = null; openView('view-teams-main');
            });
        }

        async function openTeamCalendar(teamId) {
            const { data: checkTeam } = await supabaseClient.from('teams').select('is_blocked').eq('id', teamId).single();
            if (checkTeam && checkTeam.is_blocked) {
                showToast('Dieses Team wurde vom Administrator gesperrt.', 'error');
                return;
            }

            currentOpenTeamId = teamId;
            switchTeamSubTab('calendar');
            
            const { data: memberData } = await supabaseClient.from('team_members').select('role, teams(*)').eq('user_id', activeUser.id).eq('team_id', teamId).single();
            if(!memberData) return showToast("Fehler beim Laden des Teams.", "error");

            currentTeamData = memberData.teams; currentMyRole = memberData.role; 
            document.getElementById('calendar-team-name').innerText = currentTeamData.name;
            
            const adminControls = document.getElementById('admin-controls'); const btnEditTeam = document.getElementById('btn-edit-team'); const btnNewEvent = document.getElementById('btn-new-event');
            btnNewEvent.style.display = currentMyRole === 'Community' ? 'none' : 'inline-block';

            if(currentMyRole === 'Admin' || currentMyRole === 'Manager') {
                adminControls.style.display = 'flex'; document.getElementById('calendar-team-id').innerText = currentTeamData.invite_code; document.getElementById('sidebar-admin-hint').style.display = 'block'; updateRequestBadge(teamId);
                btnEditTeam.style.display = currentMyRole === 'Admin' ? 'inline-block' : 'none';
                document.getElementById('gallery-action-btns').style.display = 'flex'; document.getElementById('stint-action-btns').style.display = 'flex';
            } else {
                adminControls.style.display = 'none'; document.getElementById('sidebar-admin-hint').style.display = 'none';
                document.getElementById('gallery-action-btns').style.display = 'none'; document.getElementById('stint-action-btns').style.display = currentMyRole === 'Mitglied' ? 'flex' : 'none';
            }

            if (currentMyRole === 'Community') {
                document.getElementById('setup-action-btns').style.display = 'none'; document.getElementById('tab-btn-setups').style.display = 'none'; document.getElementById('tab-btn-gallery').style.display = 'none'; document.getElementById('tab-btn-stint').style.display = 'none';
            } else {
                document.getElementById('setup-action-btns').style.display = 'flex'; document.getElementById('tab-btn-setups').style.display = ''; document.getElementById('tab-btn-gallery').style.display = ''; document.getElementById('tab-btn-stint').style.display = '';
            }

            loadSidebarMembers(teamId); 
            loadTeamEvents(); 
            openView('view-team-calendar');
            
            loadTeamChat(); 
            subscribeToTeamChat(teamId); 
        }

        // --- Admin Rechteverwaltung ---
        function showContextMenu(e, userId, userName, role) {
            e.preventDefault(); contextTargetUserId = userId; contextTargetUserName = userName;
            const menu = document.getElementById('context-menu');
            let html = `<div style="font-size: 0.8rem; color: #888; cursor: default; padding-bottom: 5px;" id="context-user-name-display">Aktion für: ${userName}</div><hr>`;
            if (currentMyRole === 'Admin') html += `<div onclick="updateMemberRole('Admin')">👑 Admin</div>`;
            html += `<div onclick="updateMemberRole('Manager')">🛠️ Manager</div><div onclick="updateMemberRole('Mitglied')">👤 Mitglied</div><div onclick="updateMemberRole('Community')">👋 Community</div><hr style="border-color:#555;"><div style="color:#dc3545;" onclick="kickTargetMember()">🚫 Aus Team entfernen</div>`;
            menu.innerHTML = html; menu.style.display = 'block';
            let x = e.clientX; let y = e.clientY;
            if (x + 200 > window.innerWidth) x -= 200; if (y + 250 > window.innerHeight) y -= 250;
            menu.style.left = x + 'px'; menu.style.top = y + 'px';
        }

        async function updateMemberRole(newRole) {
            document.getElementById('context-menu').style.display = 'none'; if (!supabaseClient) return;
            const { data, error } = await supabaseClient.from('team_members').update({ role: newRole }).eq('team_id', currentOpenTeamId).eq('user_id', contextTargetUserId).select();
            if (error) showToast("Fehler beim Aktualisieren der Rolle: " + error.message, "error");
            else if (data && data.length === 0) showToast("Blockiert! Dir fehlen die Datenbank-Rechte (Supabase RLS).", "error");
            else { loadSidebarMembers(currentOpenTeamId); showToast(`Rolle erfolgreich auf ${newRole} geändert.`, "success"); }
        }

        function kickTargetMember() {
            document.getElementById('context-menu').style.display = 'none';
            customConfirm(`Möchtest du ${contextTargetUserName} wirklich aus dem Team entfernen?`, async () => {
                if (!supabaseClient) return;
                const { data, error } = await supabaseClient.from('team_members').delete().eq('team_id', currentOpenTeamId).eq('user_id', contextTargetUserId).select();
                if (error) showToast("Fehler beim Entfernen: " + error.message, "error");
                else if (data && data.length === 0) showToast("Blockiert! Dir fehlen die Datenbank-Rechte (Supabase RLS).", "error");
                else { loadSidebarMembers(currentOpenTeamId); showToast("Mitglied erfolgreich entfernt.", "success"); }
            });
        }

        async function loadSidebarMembers(teamId) {
            const { data: members } = await supabaseClient.from('team_members').select('user_id, user_name, role').eq('team_id', teamId).neq('role', 'Anfrage').order('role', { ascending: true }); 
            let html = '';
            members.forEach(m => {
                let color = '#aaa'; if(m.role === 'Admin') color = 'var(--primary)'; if(m.role === 'Manager') color = '#ffcc00'; if(m.role === 'Mitglied') color = '#28a745'; if(m.role === 'Community') color = '#17a2b8';
                const isSelf = m.user_id === activeUser.id; const targetIsAdmin = m.role === 'Admin'; let canManageUser = false;
                if (currentMyRole === 'Admin' && !isSelf) canManageUser = true; if (currentMyRole === 'Manager' && !isSelf && !targetIsAdmin) canManageUser = true;
                const isAdminHoverClass = canManageUser ? 'admin-hover' : ''; const contextAttr = canManageUser ? `oncontextmenu="showContextMenu(event, '${m.user_id}', '${m.user_name}', '${m.role}')"` : '';
                html += `<div class="member-item ${isAdminHoverClass}" ${contextAttr}><div style="width: 40px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">${m.user_name.charAt(0)}</div><div><div style="color: white; font-size: 1.1rem; font-weight: 500;">${m.user_name}</div><div style="color: ${color}; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">${m.role}</div></div>${canManageUser ? '<div style="margin-left: auto; color: #555; font-size: 0.8rem;">⚙️</div>' : ''}</div>`;
            });
            document.getElementById('sidebar-member-list').innerHTML = html;
        }

        async function updateRequestBadge(teamId) {
            const { count } = await supabaseClient.from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', teamId).eq('role', 'Anfrage');
            const badge = document.getElementById('request-count-badge'); badge.innerText = count || 0; badge.style.display = count > 0 ? 'flex' : 'none';
        }

        async function openRequestsModal() {
            document.getElementById('requests-modal').style.display = 'flex'; const container = document.getElementById('requests-list'); container.innerHTML = '<p style="color:#aaa;">Lade Anfragen...</p>';
            const { data: requests } = await supabaseClient.from('team_members').select('user_id, user_name').eq('team_id', currentOpenTeamId).eq('role', 'Anfrage');
            if(!requests || requests.length === 0) return container.innerHTML = '<p style="color:#aaa; text-align: center; margin-top: 20px;">Keine offenen Beitrittsanfragen.</p>';
            let html = '';
            requests.forEach(req => {
                html += `<div style="display:flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 3px solid var(--primary); flex-wrap: wrap; gap: 10px;"><span style="color:white; font-size: 1.1rem; font-weight: 500;">${req.user_name}</span><div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;"><select id="role-select-${req.user_id}" style="padding: 8px; border-radius: 5px; background: rgba(0,0,0,0.5); color: white; border: 1px solid rgba(255,255,255,0.2); outline: none;"><option value="Mitglied">Mitglied</option><option value="Manager">Manager</option><option value="Admin">Admin</option><option value="Community">Community</option></select><button onclick="handleRequest('${req.user_id}', 'accept')" style="background: #28a745; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">✓ Annehmen</button><button onclick="handleRequest('${req.user_id}', 'decline')" style="background: transparent; color: #dc3545; border: 1px solid #dc3545; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">✕ Ablehnen</button></div></div>`;
            });
            container.innerHTML = html;
        }

        async function handleRequest(userId, action) {
            if (!supabaseClient) return; let result;
            if(action === 'accept') { const roleSelect = document.getElementById(`role-select-${userId}`); const selectedRole = roleSelect ? roleSelect.value : 'Mitglied'; result = await supabaseClient.from('team_members').update({ role: selectedRole }).eq('team_id', currentOpenTeamId).eq('user_id', userId).select(); } 
            else if(action === 'decline') { result = await supabaseClient.from('team_members').delete().eq('team_id', currentOpenTeamId).eq('user_id', userId).select(); }
            if (result && result.error) return showToast("Fehler bei der Aktion: " + result.error.message, "error");
            else if (result && result.data && result.data.length === 0) return showToast("Blockiert! Dir fehlen die Datenbank-Rechte (Supabase RLS).", "error");
            openRequestsModal(); updateRequestBadge(currentOpenTeamId); loadSidebarMembers(currentOpenTeamId);
        }

        function closeRequestsModal() { document.getElementById('requests-modal').style.display = 'none'; }