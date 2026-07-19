// ================= SETUP FUNKTIONEN =================
        function renderSetupBreadcrumbs() {
            const bc = document.getElementById('setup-breadcrumb'); let html = '📂 ';
            setupBreadcrumbs.forEach((crumb, index) => { if (index === setupBreadcrumbs.length - 1) { html += `<span style="color: white;">${crumb.name}</span>`; } else { html += `<span style="color: var(--primary); cursor: pointer; text-decoration: underline;" onclick="navigateToBreadcrumb(${index})">${crumb.name}</span> / `; } });
            bc.innerHTML = html;
        }

        async function loadTeamSetups() {
            const container = document.getElementById('team-setups-list'); container.innerHTML = '<p style="color:#aaa;">Lade Setups...</p>';
            let query = supabaseClient.from('team_setups').select('*').eq('team_id', currentOpenTeamId); query = currentSetupFolderId === null ? query.is('parent_id', null) : query.eq('parent_id', currentSetupFolderId);
            const { data, error } = await query.order('is_folder', { ascending: false }).order('name', { ascending: true });
            if (error) return container.innerHTML = `<p style="color:var(--primary);">Fehler: ${error.message}</p>`;
            renderSetupBreadcrumbs(); let html = '';
            if (currentSetupFolderId !== null) html += `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; cursor: pointer; text-align: center; border: 1px dashed #555;" onclick="navigateSetupUp()"><div style="font-size: 2.5rem;">⬆️</div><div style="margin-top: 10px; font-weight: bold; color: #aaa;">Zurück</div></div>`;
            if (data.length === 0 && currentSetupFolderId === null) html += `<p style="color:#aaa; grid-column: 1/-1;">Noch keine Setups oder Ordner vorhanden.</p>`;
            data.forEach(item => {
                if (item.is_folder) { html += `<div style="background: rgba(20,20,20,0.8); padding: 15px; border-radius: 8px; cursor: pointer; text-align: center; border: 1px solid var(--primary); transition: 0.2s;" onclick="openSetupFolder('${item.id}', '${item.name}')" oncontextmenu="showSetupContext(event, '${item.id}', true)"><div style="font-size: 2.5rem; color: #ffcc00;">📁</div><div style="margin-top: 10px; font-weight: bold; color: white;">${item.name}</div></div>`; } 
                else { html += `<div style="background: rgba(20,20,20,0.8); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.1); position: relative;" oncontextmenu="showSetupContext(event, '${item.id}', false)"><div style="font-size: 2.5rem; color: #aaa;">📄</div><div style="margin-top: 10px; font-weight: bold; color: white; word-break: break-all; font-size: 0.9rem;">${item.name}</div><a href="${item.file_url}?download=" download="${item.name}" target="_blank" class="btn-submit" style="display: block; margin-top: 15px; padding: 6px; font-size: 0.85rem; background: #28a745;">💾 Download</a></div>`; }
            });
            container.innerHTML = html;
        }

        function openSetupFolder(id, name) { currentSetupFolderId = id; setupBreadcrumbs.push({id, name}); loadTeamSetups(); }
        function navigateSetupUp() { setupBreadcrumbs.pop(); currentSetupFolderId = setupBreadcrumbs[setupBreadcrumbs.length - 1].id; loadTeamSetups(); }
        function navigateToBreadcrumb(index) { setupBreadcrumbs = setupBreadcrumbs.slice(0, index + 1); currentSetupFolderId = setupBreadcrumbs[setupBreadcrumbs.length - 1].id; loadTeamSetups(); }

        async function createSetupFolder() {
            const name = prompt("Name des neuen Ordners:"); if (!name || name.trim() === '') return;
            const { error } = await supabaseClient.from('team_setups').insert([{ team_id: currentOpenTeamId, parent_id: currentSetupFolderId, name: name.trim(), is_folder: true }]);
            if (error) showToast("Fehler beim Erstellen: " + error.message, "error"); else loadTeamSetups();
        }

        async function uploadSetupFile(event) {
            const files = event.target.files; if (!files || files.length === 0) return; showToast(`Lade ${files.length} Setup(s) hoch...`, "info");
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (!file.name.toLowerCase().endsWith('.sto')) { showToast(`Überspringe ${file.name} (nur .sto erlaubt)`, "error"); continue; }
                const fileName = `${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('setups').upload(fileName, file);
                if (uploadError) { showToast(`Fehler bei ${file.name}: ` + uploadError.message, "error"); continue; }
                const { data: publicUrlData } = supabaseClient.storage.from('setups').getPublicUrl(fileName);
                const { error: dbError } = await supabaseClient.from('team_setups').insert([{ team_id: currentOpenTeamId, parent_id: currentSetupFolderId, name: file.name, is_folder: false, file_url: publicUrlData.publicUrl }]);
                if (dbError) showToast(`Fehler beim Speichern von ${file.name}: ` + dbError.message, "error");
            }
            showToast("Setup-Upload abgeschlossen!", "success");
            event.target.value = ''; loadTeamSetups();
        }

        function showSetupContext(e, id, isFolder) {
            e.preventDefault(); e.stopPropagation(); if (currentMyRole !== 'Admin' && currentMyRole !== 'Manager') return;
            contextSetupId = id; const menu = document.getElementById('context-menu');
            menu.innerHTML = `<div style="font-size: 0.8rem; color: #888; cursor: default; padding-bottom: 5px;">Aktion für ${isFolder ? 'Ordner' : 'Setup'}</div><hr><div style="color:#dc3545;" onclick="deleteSetupItem()">🗑️ Löschen</div>`;
            menu.style.display = 'block'; let x = e.clientX; let y = e.clientY; if (x + 200 > window.innerWidth) x -= 200; if (y + 250 > window.innerHeight) y -= 250; menu.style.left = x + 'px'; menu.style.top = y + 'px';
        }

        async function deleteSetupItem() { document.getElementById('context-menu').style.display = 'none'; if(!contextSetupId) return; customConfirm("Möchtest du dieses Element wirklich löschen?\nAlle darin enthaltenen Daten werden unwiderruflich entfernt.", async () => { const { error } = await supabaseClient.from('team_setups').delete().eq('id', contextSetupId); if (error) showToast("Fehler beim Löschen: " + error.message, "error"); else { showToast("Erfolgreich gelöscht.", "success"); loadTeamSetups(); } }); }

        // ================= GALERIE FUNKTIONEN =================
        function renderGalleryBreadcrumbs() {
            const bc = document.getElementById('gallery-breadcrumb'); let html = '📂 ';
            galleryBreadcrumbs.forEach((crumb, index) => { if (index === galleryBreadcrumbs.length - 1) { html += `<span style="color: white;">${crumb.name}</span>`; } else { html += `<span style="color: var(--primary); cursor: pointer; text-decoration: underline;" onclick="navigateToGalleryBreadcrumb(${index})">${crumb.name}</span> / `; } });
            bc.innerHTML = html;
        }

        async function loadTeamGallery() {
            const foldersContainer = document.getElementById('team-gallery-folders'); const imagesContainer = document.getElementById('team-gallery-images');
            foldersContainer.innerHTML = '<p style="color:#aaa;">Lade Ordner...</p>'; imagesContainer.innerHTML = '';
            let query = supabaseClient.from('team_gallery').select('*').eq('team_id', currentOpenTeamId); query = currentGalleryFolderId === null ? query.is('parent_id', null) : query.eq('parent_id', currentGalleryFolderId);
            const { data, error } = await query.order('is_folder', { ascending: false }).order('name', { ascending: true });
            if (error) return foldersContainer.innerHTML = `<p style="color:var(--primary);">Fehler: ${error.message}</p>`;
            renderGalleryBreadcrumbs(); let foldersHtml = ''; let imagesHtml = '';
            if (currentGalleryFolderId !== null) foldersHtml += `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; cursor: pointer; text-align: center; border: 1px dashed #555;" onclick="navigateGalleryUp()"><div style="font-size: 2.5rem;">⬆️</div><div style="margin-top: 10px; font-weight: bold; color: #aaa;">Zurück</div></div>`;
            if (data.length === 0 && currentGalleryFolderId === null) foldersHtml += `<p style="color:#aaa; grid-column: 1/-1;">Noch keine Bilder oder Ordner vorhanden.</p>`;
            data.forEach(item => {
                if (item.is_folder) { foldersHtml += `<div style="background: rgba(20,20,20,0.8); padding: 15px; border-radius: 8px; cursor: pointer; text-align: center; border: 1px solid var(--primary); transition: 0.2s;" onclick="openGalleryFolder('${item.id}', '${item.name}')" oncontextmenu="showGalleryContext(event, '${item.id}', true)"><div style="font-size: 2.5rem; color: #ffcc00;">📁</div><div style="margin-top: 10px; font-weight: bold; color: white;">${item.name}</div></div>`; } 
                else { imagesHtml += `<div class="masonry-item" oncontextmenu="showGalleryContext(event, '${item.id}', false)"><a href="${item.file_url}" target="_blank"><img src="${item.file_url}" alt="${item.name}"></a><div style="margin-top: 5px; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.5); padding: 8px; border-radius: 0 0 8px 8px; border: 1px solid rgba(255,255,255,0.05); border-top: none;"><span style="color: #ccc; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 75%;">${item.name}</span><a href="${item.file_url}?download=" download="${item.name}" target="_blank" style="color: white; text-decoration: none; background: var(--primary); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;" title="Herunterladen">💾</a></div></div>`; }
            });
            foldersContainer.innerHTML = foldersHtml; imagesContainer.innerHTML = imagesHtml;
        }

        function openGalleryFolder(id, name) { currentGalleryFolderId = id; galleryBreadcrumbs.push({id, name}); loadTeamGallery(); }
        function navigateGalleryUp() { galleryBreadcrumbs.pop(); currentGalleryFolderId = galleryBreadcrumbs[galleryBreadcrumbs.length - 1].id; loadTeamGallery(); }
        function navigateToGalleryBreadcrumb(index) { galleryBreadcrumbs = galleryBreadcrumbs.slice(0, index + 1); currentGalleryFolderId = galleryBreadcrumbs[galleryBreadcrumbs.length - 1].id; loadTeamGallery(); }

        async function createGalleryFolder() {
            const name = prompt("Name des neuen Ordners:"); if (!name || name.trim() === '') return;
            const { error } = await supabaseClient.from('team_gallery').insert([{ team_id: currentOpenTeamId, parent_id: currentGalleryFolderId, name: name.trim(), is_folder: true }]);
            if (error) showToast("Fehler beim Erstellen: " + error.message, "error"); else loadTeamGallery();
        }

        async function uploadGalleryImage(event) {
            const files = event.target.files; if (!files || files.length === 0) return; showToast(`Lade ${files.length} Bild(er) hoch...`, "info");
            for (let i = 0; i < files.length; i++) {
                const file = files[i]; if (!file.type.startsWith('image/')) { showToast(`Überspringe ${file.name} (kein Bild)`, "error"); continue; }
                const fileName = `${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('gallery').upload(fileName, file);
                if (uploadError) { showToast(`Fehler bei ${file.name}: ` + uploadError.message, "error"); continue; }
                const { data: publicUrlData } = supabaseClient.storage.from('gallery').getPublicUrl(fileName);
                const { error: dbError } = await supabaseClient.from('team_gallery').insert([{ team_id: currentOpenTeamId, parent_id: currentGalleryFolderId, name: file.name, is_folder: false, file_url: publicUrlData.publicUrl }]);
                if (dbError) showToast(`Fehler beim Speichern von ${file.name}: ` + dbError.message, "error");
            }
            showToast("Bilder-Upload abgeschlossen!", "success"); event.target.value = ''; loadTeamGallery();
        }

        function showGalleryContext(e, id, isFolder) {
            e.preventDefault(); e.stopPropagation(); if (currentMyRole !== 'Admin' && currentMyRole !== 'Manager') return;
            contextGalleryId = id; const menu = document.getElementById('context-menu');
            menu.innerHTML = `<div style="font-size: 0.8rem; color: #888; cursor: default; padding-bottom: 5px;">Aktion für ${isFolder ? 'Ordner' : 'Bild'}</div><hr><div style="color:#dc3545;" onclick="deleteGalleryItem()">🗑️ Löschen</div>`;
            menu.style.display = 'block'; let x = e.clientX; let y = e.clientY; if (x + 200 > window.innerWidth) x -= 200; if (y + 250 > window.innerHeight) y -= 250; menu.style.left = x + 'px'; menu.style.top = y + 'px';
        }

        async function deleteGalleryItem() { document.getElementById('context-menu').style.display = 'none'; if(!contextGalleryId) return; customConfirm("Möchtest du dieses Bild/Diesen Ordner wirklich löschen?", async () => { const { error } = await supabaseClient.from('team_gallery').delete().eq('id', contextGalleryId); if (error) showToast("Fehler beim Löschen: " + error.message, "error"); else { showToast("Erfolgreich gelöscht.", "success"); loadTeamGallery(); } }); }