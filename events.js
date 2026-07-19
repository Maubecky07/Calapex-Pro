// ================= EVENT / KALENDER FUNKTIONEN =================
        async function sendDiscordWebhook(webhookUrl, payload) { try { const res = await fetch(webhookUrl + "?wait=true", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (res.ok) { const data = await res.json(); return data.id; } } catch (e) { console.error("Discord Webhook Error:", e); } return null; }
        async function editDiscordWebhook(webhookUrl, messageId, payload) { try { await fetch(`${webhookUrl}/messages/${messageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (e) { console.error("Discord Webhook Edit Error:", e); } }
        async function deleteDiscordWebhook(webhookUrl, messageId) { try { await fetch(`${webhookUrl}/messages/${messageId}`, { method: 'DELETE' }); } catch (e) { console.error("Discord Webhook Delete Error:", e); } }
        async function sendDiscordReminderWebhook(webhookUrl, payload) {
            let streamsText = ""; if (payload.streams) { try { let parsed = JSON.parse(payload.streams); if(parsed.length > 0) { let streamLinks = parsed.map(s => `[${s.platform}](${s.url.startsWith('http') ? s.url : 'https://'+s.url})`).join(' | '); streamsText = `\n📺 **Streams:** ${streamLinks}`; } } catch(e){} }
            const embed = { content: "⏳ **Erinnerung:** Ein Event startet in Kürze!", embeds: [{ title: `[${payload.event_type || 'Event'}] ${payload.name}`, description: `Das Event beginnt in **1 Stunde**!\n\n🎮 **Simulator:** ${payload.simulator || '-'}\n🏎️ **Fahrzeug:** ${payload.car || '-'}\n🏁 **Strecke:** ${payload.track || '-'}${streamsText}`, color: 16763904 }] };
            try { await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(embed) }); } catch (e) { console.error("Discord Reminder Webhook Error:", e); }
        }

        function buildDiscordEmbed(payload, ev) {
            let color = 2664261; if (payload.status === 'Unklar') color = 16763904; if (payload.status === 'Entfällt') color = 14431557;
            let dateDisplay = payload.date ? formatDateGerman(payload.date) : 'Nicht festgelegt'; if (payload.date && payload.date_end && payload.date !== payload.date_end) { dateDisplay = `${formatDateGerman(payload.date)} bis ${formatDateGerman(payload.date_end)}`; }
            let timeDisplay = payload.is_all_day ? 'Ganztägig' : `${payload.time_start || '?'} Uhr - ${payload.time_end || '?'} Uhr`;
            const creatorName = ev && ev.creator_name ? ev.creator_name : payload.creator_name || 'Unbekannt';
            let streamsText = "-"; if (payload.streams) { try { let parsed = JSON.parse(payload.streams); if(parsed.length > 0) { streamsText = parsed.map(s => `[${s.platform}](${s.url.startsWith('http') ? s.url : 'https://'+s.url})`).join('\n'); } } catch(e){} }
            let setupText = "-"; if (payload.setup_file_url) { setupText = `[${payload.setup_file_name || 'Download'}](${payload.setup_file_url})`; }
            return { embeds: [{ title: `[${payload.event_type || 'Event'}] ${payload.name}`, color: color, fields: [ { name: "📅 Datum", value: dateDisplay, inline: true }, { name: "🕒 Zeit", value: timeDisplay, inline: true }, { name: "🚦 Status", value: payload.status, inline: true }, { name: "🎮 Simulator", value: payload.simulator || '-', inline: true }, { name: "🏎️ Fahrzeug", value: payload.car || '-', inline: true }, { name: "🏁 Strecke", value: payload.track || '-', inline: true }, { name: "💾 Setup", value: setupText, inline: true }, { name: "📺 Streams", value: streamsText, inline: false } ], footer: { text: `Erstellt von: ${creatorName}` } }] };
        }

        function addStreamInput(platform = 'Twitch', url = '') {
            const container = document.getElementById('streams-container'); const row = document.createElement('div'); row.style.display = 'flex'; row.style.gap = '10px'; row.style.marginBottom = '10px'; row.className = 'stream-input-row';
            row.innerHTML = `<select class="stream-platform" style="padding: 10px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 8px; outline: none; font-size: 1rem; width: 120px;"><option value="Twitch" ${platform==='Twitch'?'selected':''}>Twitch</option><option value="YouTube" ${platform==='YouTube'?'selected':''}>YouTube</option><option value="Instagram" ${platform==='Instagram'?'selected':''}>Instagram</option><option value="TikTok" ${platform==='TikTok'?'selected':''}>TikTok</option><option value="Facebook" ${platform==='Facebook'?'selected':''}>Facebook</option></select><input type="text" class="stream-url" placeholder="z.B. twitch.tv/deinkanal" value="${url}" style="flex: 1; padding: 10px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 8px; outline: none; font-size: 1rem;"><button type="button" onclick="this.parentElement.remove()" style="background: transparent; border: 1px solid #dc3545; color: #dc3545; padding: 0 12px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.2rem;">×</button>`;
            container.appendChild(row);
        }

        function toggleTimeInputs() { const isAllDay = document.getElementById('ev-all-day').checked; document.getElementById('time-inputs-container').style.display = isAllDay ? 'none' : 'grid'; }
        function toggleDateInputs() {
            const isMultiDay = document.getElementById('ev-multi-day').checked; const grid = document.getElementById('date-inputs-grid'); const endGroup = document.getElementById('end-date-group'); const dateLabel = document.getElementById('ev-date-label');
            if (isMultiDay) { grid.style.gridTemplateColumns = '1fr 1fr'; endGroup.style.display = 'block'; dateLabel.innerText = 'Startdatum'; } else { grid.style.gridTemplateColumns = '1fr'; endGroup.style.display = 'none'; dateLabel.innerText = 'Datum'; document.getElementById('ev-date-end').value = ''; }
        }

        async function loadTeamEvents() {
            const container = document.getElementById('team-events-list'); container.innerHTML = '<p style="color:#aaa;">Lade Termine...</p>';
            if (!supabaseClient) return;
            const { data: events, error } = await supabaseClient.from('events').select('*').eq('team_id', currentOpenTeamId).order('date', { ascending: true }).order('time_start', { ascending: true });
            if (error) return container.innerHTML = `<p style="color:var(--primary);">Fehler beim Laden der Termine: ${error.message}</p>`;

            const now = new Date(); let validEvents = []; let idsToDelete = [];
            (events || []).forEach(ev => {
                if (ev.date) {
                    let endTime = parseEventDate(ev.date_end || ev.date, ev.time_end, '23:59:59'); let timeDiff = now.getTime() - endTime.getTime(); let hoursDiff = timeDiff / (1000 * 60 * 60);
                    if (hoursDiff > 24) idsToDelete.push(ev.id); else validEvents.push(ev);
                } else validEvents.push(ev);
            });

            if (idsToDelete.length > 0 && (currentMyRole === 'Admin' || currentMyRole === 'Manager')) supabaseClient.from('events').delete().in('id', idsToDelete).then();
            currentTeamEvents = validEvents; 

            if (currentTeamEvents.length === 0) return container.innerHTML = '<p style="color:#aaa; text-align: center; padding: 20px; border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px; grid-column: 1/-1;">Noch keine Termine vorhanden.</p>';

            let html = '';
            currentTeamEvents.forEach(ev => {
                let statusColor = '#28a745'; if (ev.status === 'Unklar') statusColor = '#ffcc00'; if (ev.status === 'Entfällt') statusColor = '#dc3545'; 
                let dateDisplay = ev.date ? formatDateGerman(ev.date) : 'Nicht festgelegt'; if (ev.date && ev.date_end && ev.date !== ev.date_end) dateDisplay = `${formatDateGerman(ev.date)} bis ${formatDateGerman(ev.date_end)}`;
                let timeDisplay = ev.is_all_day ? 'Ganztägig' : `${ev.time_start || '?'} Uhr - ${ev.time_end || '?'} Uhr`;
                
                let canEdit = false; let canDelete = false;
                if (currentMyRole === 'Admin') { canEdit = true; canDelete = true; } else if (currentMyRole === 'Manager') { canEdit = true; canDelete = (ev.creator_id === activeUser.id); } else if (currentMyRole === 'Mitglied') { canEdit = (ev.creator_id === activeUser.id); canDelete = (ev.creator_id === activeUser.id); }

                let actionsHtml = '';
                if (canEdit || canDelete) {
                    actionsHtml = `<div style="display:flex; gap: 8px; margin-top: 15px;">`;
                    if (canEdit) actionsHtml += `<button onclick="showEventModal('${ev.id}')" style="background: rgba(255,255,255,0.1); border:1px solid #aaa; color:#fff; cursor:pointer; padding: 6px; border-radius: 5px; transition: 0.2s; flex: 1; font-size: 0.85rem;">✏️ Bearbeiten</button>`;
                    if (canDelete) actionsHtml += `<button onclick="deleteEvent('${ev.id}')" style="background: rgba(220,53,69,0.1); border:1px solid #dc3545; color:#dc3545; cursor:pointer; padding: 6px; border-radius: 5px; transition: 0.2s; flex: 1; font-size: 0.85rem;">🗑️ Löschen</button>`;
                    actionsHtml += `</div>`;
                }

                let streamsHtml = '';
                if (ev.streams) {
                    let streamsData = []; try { streamsData = JSON.parse(ev.streams); } catch(e) { streamsData = [{platform: 'Stream', url: ev.streams}]; }
                    if (streamsData.length > 0) {
                        streamsHtml = '<div style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;">';
                        streamsData.forEach(s => {
                            let url = s.url.startsWith('http') ? s.url : 'https://' + s.url; let icon = '📺'; let color = 'var(--primary)'; let bg = 'rgba(209,18,18,0.2)';
                            if (s.platform === 'Twitch') { icon = '🟪'; color = '#a970ff'; bg = 'rgba(169,112,255,0.15)'; } else if (s.platform === 'YouTube') { icon = '🟥'; color = '#ff0000'; bg = 'rgba(255,0,0,0.15)'; } else if (s.platform === 'Instagram') { icon = '📸'; color = '#E1306C'; bg = 'rgba(225,48,108,0.15)'; } else if (s.platform === 'TikTok') { icon = '🎵'; color = '#00f2fe'; bg = 'rgba(0,242,254,0.15)'; } else if (s.platform === 'Facebook') { icon = '🟦'; color = '#1877F2'; bg = 'rgba(24,119,242,0.15)'; }
                            streamsHtml += `<a href="${url}" target="_blank" class="${ev.status === 'Entfällt' ? 'event-canceled-text' : ''}" style="display: block; text-align: center; background: ${bg}; color: ${color}; padding: 6px 12px; border-radius: 5px; text-decoration: none; font-weight: bold; border: 1px solid ${color}; font-size: 0.85rem; transition: 0.2s;">${icon} ${s.platform} ansehen</a>`;
                        });
                        streamsHtml += '</div>';
                    }
                }

                let setupHtml = '';
                if (ev.setup_file_url && currentMyRole !== 'Community') setupHtml = `<a href="${ev.setup_file_url}?download=" download="${ev.setup_file_name || 'setup.sto'}" target="_blank" class="${ev.status === 'Entfällt' ? 'event-canceled-text' : ''}" style="display: block; text-align: center; background: rgba(255,255,255,0.1); color: white; padding: 6px 12px; border-radius: 5px; text-decoration: none; font-weight: bold; border: 1px dashed #aaa; font-size: 0.85rem; transition: 0.2s; margin-top: 10px;">💾 Setup Download (.sto)</a>`;

                html += `
                    <div id="event-card-${ev.id}" class="${ev.status === 'Entfällt' ? 'event-canceled' : ''}" style="background: rgba(20,20,20,0.8); border: 1px solid rgba(255,255,255,0.05); border-left: 5px solid ${statusColor}; padding: 20px; border-radius: 8px; transition: 0.3s; display: flex; flex-direction: column; height: 100%;">
                        <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;"><h4 class="${ev.status === 'Entfällt' ? 'event-canceled-text' : ''}" style="color: white; font-size: 1.2rem; margin-bottom: 0; text-transform: uppercase;"><span style="color: var(--primary); margin-right: 5px; font-size: 0.9rem; display:block;">[${ev.event_type || 'Event'}]</span>${ev.name}</h4><span id="status-badge-${ev.id}" style="background: ${statusColor}15; color: ${statusColor}; padding: 4px 8px; border-radius: 20px; font-size: 0.7rem; font-weight: bold; border: 1px solid ${statusColor}; text-transform: uppercase; white-space: nowrap;">${ev.status}</span></div>
                        <div class="${ev.status === 'Entfällt' ? 'event-canceled-text' : ''}" style="color: #bbb; font-size: 0.95rem; line-height: 1.6; flex-grow: 1;">📅 <strong>Datum:</strong> ${dateDisplay} <br>🕒 <strong>Zeit:</strong> ${timeDisplay} <br>🎮 <strong>Sim:</strong> ${ev.simulator || '-'} <br>🏎️ <strong>Car:</strong> ${ev.car || '-'} <br>🏁 <strong>Track:</strong> ${ev.track || '-'}</div>
                        ${streamsHtml}${setupHtml}
                        <div id="countdown-${ev.id}" style="font-size: 0.95rem; margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); color: #ccc;">Lade Countdown...</div>
                        <div class="${ev.status === 'Entfällt' ? 'event-canceled-text' : ''}" style="color: #666; font-size: 0.8rem; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">Erstellt von: ${ev.creator_name || 'Unbekannt'}</div>
                        ${actionsHtml}
                    </div>
                `;
            });
            container.innerHTML = html; startEventTicker();
        }

        // --- TICKER & COUNTDOWN LOGIK ---
        function parseEventDate(dateStr, timeStr, defaultTime) { if (!dateStr) return null; let t = timeStr || defaultTime; if (t.split(':').length === 2) t += ':00'; return new Date(`${dateStr}T${t}`); }

        function startEventTicker() { if (eventTickerInterval) clearInterval(eventTickerInterval); updateCountdowns(); eventTickerInterval = setInterval(updateCountdowns, 1000); }

        function updateCountdowns() {
            const now = new Date();
            currentTeamEvents.forEach(ev => {
                const card = document.getElementById(`event-card-${ev.id}`); const cd = document.getElementById(`countdown-${ev.id}`); const badge = document.getElementById(`status-badge-${ev.id}`);
                if (!card || !cd) return;
                if (ev.status === 'Entfällt') { cd.innerHTML = '<span style="color: #dc3545; font-weight: bold;">Kein Countdown (Entfällt)</span>'; return; }
                if (!ev.date) { cd.innerHTML = '<span style="color: #aaa;">Kein Datum hinterlegt</span>'; return; }

                let startTime = parseEventDate(ev.date, ev.time_start, '00:00:00'); let endTime = parseEventDate(ev.date_end || ev.date, ev.time_end, '23:59:59');

                if (now < startTime) {
                    card.classList.remove('live-glow'); let diff = startTime - now;
                    let days = Math.floor(diff / (1000 * 60 * 60 * 24)); let hours = Math.floor((diff / (1000 * 60 * 60)) % 24); let mins = Math.floor((diff / 1000 / 60) % 60); let secs = Math.floor((diff / 1000) % 60);
                    let hStr = hours.toString().padStart(2, '0'); let mStr = mins.toString().padStart(2, '0'); let sStr = secs.toString().padStart(2, '0');
                    let cdText = days > 0 ? `${days}d ${hStr}:${mStr}:${sStr}` : `${hStr}:${mStr}:${sStr}`;
                    cd.innerHTML = `⏳ Startet in: <strong style="color: white; font-family: monospace; font-size: 1.05rem;">${cdText}</strong>`;
                    if (badge && badge.innerText === 'LIVE') { badge.innerText = ev.status; let color = ev.status === 'Unklar' ? '#ffcc00' : '#28a745'; badge.style.background = `${color}15`; badge.style.color = color; badge.style.borderColor = color; }

                    if (diff <= 3600000 && diff > 3598000 && !ev._reminderSentLocally) {
                        ev._reminderSentLocally = true; 
                        if ((currentMyRole === 'Admin' || currentMyRole === 'Manager') && currentTeamData && currentTeamData.discord_webhook_url) sendDiscordReminderWebhook(currentTeamData.discord_webhook_url, ev);
                    }
                } else if (now >= startTime && now <= endTime) {
                    card.classList.add('live-glow'); cd.innerHTML = `<span style="color: #ff0000; font-weight: bold; animation: textPulse 1.5s infinite; display: inline-block;">🔴 Event läuft gerade!</span>`;
                    if (badge && badge.innerText !== 'LIVE') { badge.innerText = 'LIVE'; badge.style.background = 'rgba(255,0,0,0.15)'; badge.style.color = '#ff0000'; badge.style.borderColor = '#ff0000'; }
                } else {
                    card.classList.remove('live-glow'); cd.innerHTML = `<span style="color: #aaa;">🏁 Event ist beendet</span>`;
                    if (ev.discord_message_id && currentTeamData && currentTeamData.discord_webhook_url) {
                        if (currentMyRole === 'Admin' || currentMyRole === 'Manager') {
                            deleteDiscordWebhook(currentTeamData.discord_webhook_url, ev.discord_message_id);
                            if (supabaseClient) supabaseClient.from('events').update({ discord_message_id: null }).eq('id', ev.id).then();
                        }
                        ev.discord_message_id = null; 
                    }
                }
            });
        }

        function formatDateGerman(dateString) { if(!dateString) return ''; const parts = dateString.split('-'); if(parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`; return dateString; }

        function removeCurrentSetup() { currentSetupRemoved = true; document.getElementById('ev-setup-current').style.display = 'none'; document.getElementById('ev-setup').value = ''; }

        function showEventModal(eventId = null) {
            document.getElementById('event-modal').style.display = 'flex'; document.getElementById('ev-setup').value = ''; currentSetupRemoved = false;
            
            if (eventId) {
                document.getElementById('event-modal-title').innerText = "Termin bearbeiten"; currentEditEventId = eventId;
                const ev = currentTeamEvents.find(e => e.id === eventId);
                if(ev) {
                    document.getElementById('ev-name').value = ev.name || ''; document.getElementById('ev-type').value = ev.event_type || 'Training';
                    document.getElementById('ev-date').value = ev.date || ''; document.getElementById('ev-date-end').value = ev.date_end || ''; 
                    document.getElementById('ev-all-day').checked = !!ev.is_all_day; document.getElementById('ev-multi-day').checked = !!(ev.date_end && ev.date !== ev.date_end);  
                    document.getElementById('ev-status').value = ev.status || 'Findet statt'; document.getElementById('ev-start').value = ev.time_start || '';
                    document.getElementById('ev-end').value = ev.time_end || ''; document.getElementById('ev-sim').value = ev.simulator || 'iRacing';
                    document.getElementById('ev-car').value = ev.car || ''; document.getElementById('ev-track').value = ev.track || '';

                    if (ev.setup_file_name) { document.getElementById('ev-setup-current').style.display = 'block'; document.getElementById('ev-setup-name').innerText = ev.setup_file_name; } else { document.getElementById('ev-setup-current').style.display = 'none'; }
                    document.getElementById('streams-container').innerHTML = '';
                    if (ev.streams) { try { const parsed = JSON.parse(ev.streams); parsed.forEach(s => addStreamInput(s.platform, s.url)); } catch(e) { addStreamInput('Andere', ev.streams); } }
                    if (document.getElementById('streams-container').children.length === 0) addStreamInput();
                }
            } else {
                document.getElementById('event-modal-title').innerText = "Neuen Termin erstellen"; currentEditEventId = null;
                document.getElementById('ev-name').value = ''; document.getElementById('ev-type').value = 'Training'; document.getElementById('ev-date').value = '';
                document.getElementById('ev-date-end').value = ''; document.getElementById('ev-all-day').checked = false; document.getElementById('ev-multi-day').checked = false;
                document.getElementById('ev-status').value = 'Findet statt'; document.getElementById('ev-start').value = ''; document.getElementById('ev-end').value = '';
                document.getElementById('ev-sim').value = 'iRacing'; document.getElementById('ev-car').value = ''; document.getElementById('ev-track').value = '';
                document.getElementById('ev-setup-current').style.display = 'none'; document.getElementById('streams-container').innerHTML = ''; addStreamInput();
            }
            toggleTimeInputs(); toggleDateInputs();
        }

        function closeEventModal() { document.getElementById('event-modal').style.display = 'none'; currentEditEventId = null; }

        async function saveEvent() {
            if (!supabaseClient) return showToast("Demo-Modus", "info");
            if (currentMyRole === 'Community') return showToast("Keine Berechtigung!", "error");

            const isAllDay = document.getElementById('ev-all-day').checked; const isMultiDay = document.getElementById('ev-multi-day').checked;
            const streamRows = document.querySelectorAll('.stream-input-row'); let streamsArray = [];
            streamRows.forEach(row => { const plat = row.querySelector('.stream-platform').value; const url = row.querySelector('.stream-url').value.trim(); if (url) streamsArray.push({ platform: plat, url: url }); });
            const streamsJson = streamsArray.length > 0 ? JSON.stringify(streamsArray) : null;

            let oldEvent = currentEditEventId ? currentTeamEvents.find(e => e.id === currentEditEventId) : null;
            let setupUrl = oldEvent ? oldEvent.setup_file_url : null; let setupName = oldEvent ? oldEvent.setup_file_name : null;
            if (currentSetupRemoved) { setupUrl = null; setupName = null; }

            const setupInput = document.getElementById('ev-setup');
            if (setupInput.files && setupInput.files.length > 0) {
                const file = setupInput.files[0]; if (!file.name.toLowerCase().endsWith('.sto')) return showToast("Bitte nur .sto Dateien für das Setup hochladen!", "error");
                const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`; showToast("Lade Setup hoch...", "info");
                const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('setups').upload(fileName, file);
                if (uploadError) return showToast("Fehler beim Setup-Upload: " + uploadError.message, "error");
                const { data: publicUrlData } = supabaseClient.storage.from('setups').getPublicUrl(fileName); setupUrl = publicUrlData.publicUrl; setupName = file.name;
            }

            const payload = {
                team_id: currentOpenTeamId, name: document.getElementById('ev-name').value.trim(), event_type: document.getElementById('ev-type').value,
                date: document.getElementById('ev-date').value || null, date_end: isMultiDay ? (document.getElementById('ev-date-end').value || null) : null,
                is_all_day: isAllDay, status: document.getElementById('ev-status').value, time_start: isAllDay ? null : (document.getElementById('ev-start').value || null),
                time_end: isAllDay ? null : (document.getElementById('ev-end').value || null), simulator: document.getElementById('ev-sim').value.trim(),
                car: document.getElementById('ev-car').value.trim(), track: document.getElementById('ev-track').value.trim(), streams: streamsJson, setup_file_url: setupUrl, setup_file_name: setupName
            };

            if (!payload.name) return showToast("Bitte gib dem Event mindestens einen Namen!", "error");
            let msgId = oldEvent ? oldEvent.discord_message_id : null;

            if (currentTeamData && currentTeamData.discord_webhook_url) {
                const embedPayload = buildDiscordEmbed(payload, oldEvent);
                if (currentEditEventId && msgId) await editDiscordWebhook(currentTeamData.discord_webhook_url, msgId, embedPayload);
                else { const newMsgId = await sendDiscordWebhook(currentTeamData.discord_webhook_url, embedPayload); if (newMsgId) payload.discord_message_id = newMsgId; }
            }

            if (currentEditEventId) {
                const { error } = await supabaseClient.from('events').update(payload).eq('id', currentEditEventId);
                if (error) showToast("Fehler beim Aktualisieren: " + error.message, "error"); else showToast("Termin aktualisiert.", "success");
            } else {
                payload.creator_name = `${activeUser.first_name} ${activeUser.last_name}`; if (activeUser.id) payload.creator_id = activeUser.id; 
                const { error } = await supabaseClient.from('events').insert([payload]);
                if (error) showToast("Fehler beim Erstellen: " + error.message, "error"); else showToast("Termin erstellt.", "success");
            }
            closeEventModal(); loadTeamEvents(); updateLiveCalendar(currentOpenTeamId); 
        }

        function deleteEvent(id) {
            customConfirm("Möchtest du diesen Termin wirklich unwiderruflich löschen?", async () => {
                if (!supabaseClient) return;
                const ev = currentTeamEvents.find(e => e.id === id);
                if (ev && ev.discord_message_id && currentTeamData && currentTeamData.discord_webhook_url) await deleteDiscordWebhook(currentTeamData.discord_webhook_url, ev.discord_message_id);
                const { error } = await supabaseClient.from('events').delete().eq('id', id);
                if (error) showToast("Fehler beim Löschen: " + error.message, "error");
                else { showToast("Termin gelöscht.", "success"); loadTeamEvents(); updateLiveCalendar(currentOpenTeamId); }
            });
        }

function toggleIRacingWidget() {
            const content = document.getElementById('iracing-widget-content');
            const icon = document.getElementById('iracing-widget-icon');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.style.transform = 'rotate(180deg)';
            } else {
                content.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';
            }
        }

        function renderIRacingEvents() {
            const events = [
                { m: 'JAN', d: '9-10', t: 'Roar', tr: 'Daytona International Speedway', c: 'LMP2, GT4, Touring', b: '' },
                { m: 'JAN', d: '16-18', t: 'Daytona 24', tr: 'Daytona International Speedway', c: 'GTP, LMP2, GT3', b: 'TEAM EVENT' },
                { m: 'JAN', d: '28TH', t: 'Dale Jr Charity Event', tr: 'Iowa Speedway', c: 'Mini Stock', b: '' },
                { m: 'FEB', d: '11-18', t: 'Daytona 500', tr: 'Daytona International Speedway', c: 'NASCAR Cup', b: '' },
                { m: 'FEB', d: '20-22', t: 'Bathurst 12', tr: 'Mount Panorama Circuit', c: 'GT3', b: 'TEAM EVENT' },
                { m: 'MAR', d: '27-29', t: 'Sebring 12', tr: 'Sebring International Raceway', c: 'GTP, LMP2, GT3', b: 'TEAM EVENT' },
                { m: 'APR', d: '10-11', t: 'Road America 500', tr: 'Road America', c: 'Nissan GTP, Audi 90', b: 'TEAM EVENT' },
                { m: 'MAY', d: '1-3', t: 'Nurburgring 24h', tr: 'Nurburgring - Gesamtstrecke 24H', c: 'GT3, PCup, GT4, Touring', b: 'TEAM EVENT' },
                { m: 'MAY', d: '5-11', t: 'Indy 500 - Fixed', tr: 'Indianapolis Motor Speedway', c: 'Dallara IR-18', b: '' },
                { m: 'MAY', d: '12-18', t: 'Indy 500 - Open', tr: 'Indianapolis Motor Speedway', c: 'Dallara IR-18', b: '' },
                { m: 'MAY', d: '20-25', t: 'World 600', tr: 'Charlotte Motor Speedway', c: 'NASCAR Cup', b: '' },
                { m: 'MAY', d: '29-31', t: '4 Hours at Thruxton', tr: 'Thruxton Circuit', c: 'Touring Cars', b: '' },
                { m: 'JUN', d: '19-21', t: 'Watkins Glen 6 Hour', tr: 'Watkins Glen International', c: 'GTP, LMP2, GT3', b: 'TEAM EVENT' },
                { m: 'JUN/JUL', d: '30 - 6', t: 'Firecracker 400', tr: 'Daytona International Speedway 2007', c: '1987 NASCAR Cup', b: '' },
                { m: 'JUL', d: '10-12', t: 'Spa 24', tr: 'Circuit de Spa-Francorchamps', c: 'GT3', b: 'TEAM EVENT' },
                { m: 'JUL', d: '22-27', t: 'Brickyard 400', tr: 'Indianapolis Motor Speedway', c: 'NASCAR Cup', b: '' },
                { m: 'JUL', d: '24-26', t: '6 Hours of Road America', tr: 'Road America', c: 'GTP, LMP2, GT3', b: 'TEAM EVENT' },
                { m: 'AUG', d: '4-9', t: 'Knoxville Nationals', tr: 'Knoxville Raceway', c: '410 Winged Sprint Car', b: 'SUPER SESSION' },
                { m: 'AUG', d: '14-15', t: 'Portimao 1000km', tr: 'Algarve International Circuit', c: 'HPD, GT1, GT2', b: '' },
                { m: 'AUG', d: '25-30', t: 'Crandon Championship', tr: 'Crandon International Raceway', c: 'Pro 4 Truck', b: 'SUPER SESSION' },
                { m: 'SEP', d: '2-7', t: 'Southern 500', tr: 'Darlington Raceway', c: 'NASCAR Cup', b: '' },
                { m: 'SEP', d: '10-15', t: 'Suzuka 1000km', tr: 'Suzuka Circuit', c: 'GT3', b: 'TEAM EVENT' },
                { m: 'SEP', d: '18-20', t: 'Britcar 24', tr: 'Silverstone', c: 'GT3, GT4', b: 'TEAM EVENT' },
                { m: 'SEP', d: '25-27', t: 'Petit Le Mans', tr: 'Michelin Raceway Road Atlanta', c: 'GTP, LMP2, GT3', b: 'TEAM EVENT' },
                { m: 'OCT', d: '2-4', t: 'Bathurst 1000', tr: 'Mount Panorama Circuit', c: 'Supercars', b: 'TEAM EVENT' },
                { m: 'OCT', d: '16-18', t: '8 Hours of Indianapolis', tr: 'Indianapolis Motor Speedway', c: 'GT3', b: 'TEAM EVENT' },
                { m: 'OCT', d: '30-31', t: 'iRacing FF1600 Festival', tr: 'Brands Hatch', c: 'FF1600', b: '' },
                { m: 'NOV', d: '4-9', t: 'Homestead Championship', tr: 'Homestead Miami Speedway', c: 'NASCAR Cup', b: '' },
                { m: 'NOV', d: '13-15', t: 'SFL Mountain Showdown', tr: 'Mount Panorama Circuit', c: 'Super Formula Light', b: 'SUPER SESSION' },
                { m: 'NOV', d: '17-21', t: 'iRacing Runoffs', tr: 'Road America', c: '6 Classes', b: 'SUPER SESSION' },
                { m: 'DEC', d: '2-7', t: 'Winter Derby', tr: 'Five Flags Speedway', c: 'Super Late Model', b: '' },
                { m: 'DEC', d: '15-20', t: 'Chili Bowl', tr: 'Chili Bowl', c: 'Dirt Midget', b: 'SUPER SESSION' },
                { m: 'DEC', d: '18-19', t: 'THE Production Car Challenge', tr: 'Virginia International Raceway', c: 'PCC Classes', b: '' }
            ];
            let html = '';
            events.forEach(e => {
                let badgeHtml = '';
                if (e.b === 'TEAM EVENT') badgeHtml = `<span class="badge-team">TEAM EVENT</span>`;
                if (e.b === 'SUPER SESSION') badgeHtml = `<span class="badge-super">SUPER SESSION</span>`;
                
                html += `<div class="iracing-event-card"><div style="min-width: 80px;"><span class="iracing-month-label">${e.m}</span><span class="iracing-date-label">${e.d}</span></div><div style="flex: 1; min-width: 200px;"><div class="iracing-title-label">${e.t}</div><div class="iracing-track-label">${e.tr}</div></div><div class="iracing-cars-container">${badgeHtml}<div class="iracing-cars-label">${e.c}</div></div></div>`;
            });
            document.getElementById('iracing-events-container').innerHTML = html;
        }