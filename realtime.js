function initDataSubscriptions() {
            if (!supabaseClient || dataSubscriptionChannel) return; 
            dataSubscriptionChannel = supabaseClient.channel('db-live-updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload => {
                    if (currentOpenTeamId && (payload.new ? payload.new.team_id : payload.old.team_id) === currentOpenTeamId) loadTeamEvents();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'team_stintplaner' }, payload => {
                    if (currentOpenTeamId && document.getElementById('team-stint-section').style.display === 'block' && currentStintId === null) loadTeamStintplanners();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'team_setups' }, payload => {
                    if (currentOpenTeamId && document.getElementById('team-setups-section').style.display === 'block') loadTeamSetups();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'team_gallery' }, payload => {
                    if (currentOpenTeamId && document.getElementById('team-gallery-section').style.display === 'block') loadTeamGallery();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'app_news' }, payload => {
                    if (document.getElementById('view-news').classList.contains('active')) loadNews();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'app_patchlog' }, payload => {
                    if (document.getElementById('view-patchlog').classList.contains('active')) loadPatchlog();
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, payload => {
                    if (currentOpenTeamId && payload.new.id === currentOpenTeamId) {
                        currentTeamData.name = payload.new.name;
                        currentTeamData.sim = payload.new.sim;
                        currentTeamData.logo_url = payload.new.logo_url;
                        currentTeamData.description = payload.new.description;
                        currentTeamData.discord_webhook_url = payload.new.discord_webhook_url;
                        document.getElementById('calendar-team-name').innerText = payload.new.name;
                        
                        if (payload.new.is_blocked) { showToast("Dieses Team wurde vom Administrator gesperrt.", "error"); openView('view-teams-main'); }
                    }
                    if (document.getElementById('view-teams-main').classList.contains('active')) loadMyTeams();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, payload => {
                    const affectedTeamId = payload.new ? payload.new.team_id : payload.old.team_id;
                    const affectedUserId = payload.new ? payload.new.user_id : payload.old.user_id;
                    if (currentOpenTeamId && affectedTeamId === currentOpenTeamId) {
                        if (affectedUserId === activeUser.id) {
                            if (payload.eventType === 'DELETE') {
                                showToast("Du wurdest vom Admin aus dem Team entfernt.", "error"); document.getElementById('member-sidebar').classList.remove('open');
                                currentOpenTeamId = null; openView('view-teams-main'); return;
                            } else if (payload.new && payload.new.role) {
                                currentMyRole = payload.new.role;
                                const adminControls = document.getElementById('admin-controls'); const btnEditTeam = document.getElementById('btn-edit-team');
                                if (currentMyRole === 'Admin' || currentMyRole === 'Manager') {
                                    adminControls.style.display = 'flex'; document.getElementById('sidebar-admin-hint').style.display = 'block';
                                    btnEditTeam.style.display = currentMyRole === 'Admin' ? 'inline-block' : 'none';
                                    document.getElementById('gallery-action-btns').style.display = 'flex'; document.getElementById('stint-action-btns').style.display = 'flex';
                                } else {
                                    adminControls.style.display = 'none'; document.getElementById('sidebar-admin-hint').style.display = 'none';
                                    document.getElementById('gallery-action-btns').style.display = 'none';
                                    document.getElementById('stint-action-btns').style.display = currentMyRole === 'Mitglied' ? 'flex' : 'none';
                                }
                                document.getElementById('btn-new-event').style.display = currentMyRole === 'Community' ? 'none' : 'inline-block';
                                if (currentMyRole === 'Community') {
                                    document.getElementById('setup-action-btns').style.display = 'none'; document.getElementById('tab-btn-setups').style.display = 'none';
                                    document.getElementById('tab-btn-gallery').style.display = 'none'; document.getElementById('tab-btn-stint').style.display = 'none';
                                    if(document.getElementById('team-setups-section').style.display === 'block' || document.getElementById('team-gallery-section').style.display === 'block' || document.getElementById('team-stint-section').style.display === 'block') switchTeamSubTab('calendar');
                                } else {
                                    document.getElementById('setup-action-btns').style.display = 'flex'; document.getElementById('tab-btn-setups').style.display = '';
                                    document.getElementById('tab-btn-gallery').style.display = ''; document.getElementById('tab-btn-stint').style.display = '';
                                }
                                loadTeamEvents(); 
                            }
                        }
                        loadSidebarMembers(currentOpenTeamId); updateRequestBadge(currentOpenTeamId);
                        if (document.getElementById('requests-modal').style.display === 'flex') openRequestsModal();
                    }
                    if (document.getElementById('view-teams-main').classList.contains('active') && affectedUserId === activeUser.id) { loadMyTeams(); if (document.getElementById('search-result-box').style.display === 'block') searchTeam(); }
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_global_chat' }, payload => { 
                    appendChatMessage(payload.new); 
                    if (document.getElementById('view-home').classList.contains('active')) scrollToChatBottom(); 
                })
                .subscribe();
        }

        function cleanupDataSubscriptions() { if (dataSubscriptionChannel && supabaseClient) { supabaseClient.removeChannel(dataSubscriptionChannel); dataSubscriptionChannel = null; } }

        function subscribeToTeamChat(teamId) {
            if (!supabaseClient) return;
            if (teamChatChannel) {
                supabaseClient.removeChannel(teamChatChannel);
            }
            teamChatChannel = supabaseClient.channel(`live_team_chat_${teamId}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_chat', filter: `team_id=eq.${teamId}` }, payload => {
                    appendTeamChatMessage(payload.new);
                    if (document.getElementById('team-calendar-section').style.display === 'block') {
                        scrollToTeamChatBottom();
                    }
                })
                .subscribe();
        }

        function initPresence() {
            if (!supabaseClient || !activeUser) return;
            cleanupPresence();
            const safeUserId = activeUser.id ? activeUser.id.toString() : 'user_' + Math.floor(Math.random()*1000);
            presenceChannel = supabaseClient.channel('online_users', { config: { presence: { key: safeUserId } } });
            presenceChannel.on('presence', { event: 'sync' }, () => { if (presenceChannel) renderOnlineUsers(presenceChannel.presenceState()); })
                .on('presence', { event: 'join' }, () => { if (presenceChannel) renderOnlineUsers(presenceChannel.presenceState()); })
                .on('presence', { event: 'leave' }, () => { if (presenceChannel) renderOnlineUsers(presenceChannel.presenceState()); })
                .subscribe(async (status) => { if (status === 'SUBSCRIBED') { await presenceChannel.track({ user_name: `${activeUser.first_name} ${activeUser.last_name}`, status: 'online' }); startIdleTracking(); } });
        }

        function startIdleTracking() { stopIdleTracking(); window.addEventListener('mousemove', resetIdleTimer); window.addEventListener('keydown', resetIdleTimer); window.addEventListener('touchstart', resetIdleTimer); window.addEventListener('scroll', resetIdleTimer); resetIdleTimer(); }
        function stopIdleTracking() { clearTimeout(idleTimeout); window.removeEventListener('mousemove', resetIdleTimer); window.removeEventListener('keydown', resetIdleTimer); window.removeEventListener('touchstart', resetIdleTimer); window.removeEventListener('scroll', resetIdleTimer); }
        function resetIdleTimer() { if (isIdle) { isIdle = false; updatePresenceStatus('online'); } clearTimeout(idleTimeout); idleTimeout = setTimeout(() => { isIdle = true; updatePresenceStatus('away'); }, 600000); }
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && activeUser && presenceChannel) resetIdleTimer(); });
        async function updatePresenceStatus(newStatus) { if (!presenceChannel || !activeUser) return; await presenceChannel.track({ user_name: `${activeUser.first_name} ${activeUser.last_name}`, status: newStatus }); }

        function renderOnlineUsers(state) {
            try {
                const listDiv = document.getElementById('online-users-list'); if(!listDiv) return;
                listDiv.innerHTML = ''; let count = 0; let onlineCount = 0; let awayCount = 0;
                for (const id in state) {
                    const connections = state[id]; if (!connections || connections.length === 0) continue; count++;
                    let finalStatus = 'away'; let userName = connections[0].user_name || 'Unbekannt';
                    for (const conn of connections) { if (conn.status === 'online') { finalStatus = 'online'; break; } }
                    if (finalStatus === 'online') onlineCount++; else awayCount++;
                    const isAway = finalStatus === 'away'; const dotColor = isAway ? '#ffcc00' : '#00ff00'; const glowColor = isAway ? 'rgba(255, 204, 0, 0.6)' : 'rgba(0, 255, 0, 0.6)';
                    const statusText = isAway ? '<span style="color: #ffcc00; font-size: 0.8rem; margin-left: 5px;">(Abwesend)</span>' : '';
                    listDiv.innerHTML += `<div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 8px; font-size: 0.95rem; color: white; display: flex; align-items: center; gap: 8px;"><span style="display:inline-block; width:8px; height:8px; background:${dotColor}; border-radius:50%; box-shadow: 0 0 8px ${glowColor}; flex-shrink: 0;"></span><span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${userName}</span> ${statusText}</div>`;
                }
                const titleSpan = document.getElementById('online-status-counts');
                if(titleSpan) titleSpan.innerHTML = count === 0 ? 'Online Fahrer' : `<span style="color:#00ff00;">${onlineCount} Online</span> <span style="color:#aaa;">|</span> <span style="color:#ffcc00;">${awayCount} Abwesend</span>`;
                if (count === 0) listDiv.innerHTML = `<span style="color: #aaa; font-size: 0.9rem;">Derzeit niemand online</span>`;
            } catch(e) { console.error("Fehler beim Rendern der Online-Liste:", e); }
        }

        function cleanupPresence() { if (presenceChannel) { presenceChannel.untrack(); supabaseClient.removeChannel(presenceChannel); presenceChannel = null; } }