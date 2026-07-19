// ================= STINTPLANER FUNKTIONEN =================
        
        async function loadTeamStintplanners() {
            const container = document.getElementById('team-stint-list'); container.innerHTML = '<p style="color:#aaa;">Lade Stintpläne...</p>';
            document.getElementById('team-stint-list').style.display = 'grid'; document.getElementById('team-stint-editor').style.display = 'none';
            document.getElementById('stint-action-btns').style.display = currentMyRole === 'Community' ? 'none' : 'flex';
            if (!supabaseClient) return;

            const { data, error } = await supabaseClient.from('team_stintplaner').select('*').eq('team_id', currentOpenTeamId).order('created_at', { ascending: false });
            if (error) return container.innerHTML = `<p style="color:var(--primary);">Fehler: ${error.message}</p>`;
            if (data.length === 0) return container.innerHTML = `<p style="color:#aaa; grid-column: 1/-1;">Noch keine Stintpläne vorhanden.</p>`;

            let html = '';
            data.forEach(plan => {
                html += `<div style="background: rgba(20,20,20,0.8); border: 1px solid rgba(255,255,255,0.05); border-left: 5px solid #17a2b8; padding: 20px; border-radius: 8px; transition: 0.3s; position: relative;"><h4 style="color: white; margin: 0 0 10px 0; font-size: 1.2rem;">📊 ${plan.name}</h4><p style="color: #888; font-size: 0.8rem; margin-bottom: 15px;">Erstellt von: ${plan.created_by_name || 'Unbekannt'}</p><div style="display: flex; gap: 10px;"><button class="btn-submit" style="padding: 6px 12px; font-size: 0.9rem; flex: 1;" onclick="openStintEditor('${plan.id}')">Öffnen / Bearbeiten</button></div>${(currentMyRole === 'Admin' || currentMyRole === 'Manager' || plan.created_by === activeUser.id) ? `<div style="position: absolute; top: 15px; right: 15px; cursor: pointer; color: #dc3545;" onclick="deleteStintPlan('${plan.id}')">🗑️</div>` : ''}</div>`;
            });
            container.innerHTML = html;
        }

        async function createNewStintPlan() {
            if(currentMyRole === 'Community') return;
            const name = prompt("Name für den neuen Stintplan (z.B. Nürburgring 24h):"); if (!name || name.trim() === '') return;
            const defaultData = {
                data: [ [1, "Max Mustermann", "15:00", 60, 7, 110, "Soft", "Sonnig", "Startstint", "=D1*E1"], [2, "", "", "", "", "", "", "", "", ""], [3, "", "", "", "", "", "", "", "", ""], [4, "", "", "", "", "", "", "", "", ""], [5, "", "", "", "", "", "", "", "", ""] ],
                columns: [ { type: 'text', title: 'Stint', width: 60, align: 'center' }, { type: 'text', title: 'Fahrer', width: 150 }, { type: 'text', title: 'Startzeit', width: 100, align: 'center' }, { type: 'numeric', title: 'Dauer (Min)', width: 100, align: 'center' }, { type: 'numeric', title: 'Runden', width: 80, align: 'center' }, { type: 'numeric', title: 'Tank (L)', width: 80, align: 'center' }, { type: 'text', title: 'Reifen', width: 100, align: 'center' }, { type: 'text', title: 'Wetter', width: 100, align: 'center' }, { type: 'text', title: 'Bemerkung', width: 250 }, { type: 'text', title: 'Berechnung', width: 100, align: 'center' } ],
                style: {}
            };
            const { error } = await supabaseClient.from('team_stintplaner').insert([{ team_id: currentOpenTeamId, name: name.trim(), data: defaultData, created_by: activeUser.id, created_by_name: `${activeUser.first_name} ${activeUser.last_name}` }]);
            if (error) showToast("Fehler beim Erstellen: " + error.message, "error"); else { showToast("Stintplan erstellt!", "success"); loadTeamStintplanners(); }
        }

        async function openStintEditor(id) {
            currentStintId = id; document.getElementById('team-stint-list').style.display = 'none'; document.getElementById('stint-action-btns').style.display = 'none'; document.getElementById('team-stint-editor').style.display = 'block'; document.getElementById('spreadsheet').innerHTML = ''; 
            const { data: plan, error } = await supabaseClient.from('team_stintplaner').select('*').eq('id', id).single();
            if (error) { showToast("Fehler beim Laden: " + error.message, "error"); closeStintEditor(); return; }
            document.getElementById('stint-editor-title').innerText = `Bearbeite: ${plan.name}`;
            let config = plan.data || {};
            currentStintSheet = jspreadsheet(document.getElementById('spreadsheet'), {
                data: config.data || [['','',''], ['','','']], columns: config.columns || [], style: config.style || {},
                parseFormulas: true, secureFormulas: false, minDimensions: [15, 30], defaultColWidth: 100, tableOverflow: true, tableWidth: "100%", tableHeight: "600px", freezeColumns: 2, search: true, allowInsertRow: true, allowManualInsertColumn: true, allowInsertColumn: true, allowDeleteRow: true, allowDeleteColumn: true, allowRenameColumn: true, wordWrap: false,
                toolbar: [ { type: 'i', content: 'undo', onclick: function() { currentStintSheet.undo(); } }, { type: 'i', content: 'redo', onclick: function() { currentStintSheet.redo(); } }, { type: 'i', content: 'save', onclick: function() { saveStintPlan(); } }, { type: 'i', content: 'format_align_left', k: 'text-align', v: 'left' }, { type: 'i', content: 'format_align_center', k: 'text-align', v: 'center' }, { type: 'i', content: 'format_align_right', k: 'text-align', v: 'right' }, { type: 'i', content: 'format_bold', k: 'font-weight', v: 'bold' }, { type: 'color', content: 'format_color_text', k: 'color' }, { type: 'color', content: 'format_color_fill', k: 'background-color' } ]
            });
            if (currentMyRole === 'Community') { document.getElementById('stint-save-btn').style.display = 'none'; showToast("Du bist im Lese-Modus (Community).", "info"); } else { document.getElementById('stint-save-btn').style.display = 'block'; }
        }

        function closeStintEditor() {
            document.getElementById('team-stint-editor').style.display = 'none'; document.getElementById('team-stint-list').style.display = 'grid'; document.getElementById('stint-action-btns').style.display = currentMyRole === 'Community' ? 'none' : 'flex';
            if (currentStintSheet) { jspreadsheet.destroy(document.getElementById('spreadsheet')); currentStintSheet = null; }
            currentStintId = null;
        }

        async function saveStintPlan() {
            if (!currentStintSheet || !currentStintId) return; showToast("Speichere...", "info");
            
            if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); 
            if (currentStintSheet.destroyEditor) currentStintSheet.destroyEditor(true);

            setTimeout(async () => {
                try {
                    let colConfig = []; let cols = currentStintSheet.options.columns ? currentStintSheet.options.columns.length : currentStintSheet.headers.length;
                    for(let i=0; i<cols; i++) { let optCol = currentStintSheet.options.columns[i] || {}; colConfig.push({ width: currentStintSheet.getWidth(i), title: currentStintSheet.getHeader(i), type: optCol.type || 'text', align: optCol.align || 'center' }); }
                    
                    let rawData = []; let sourceData = currentStintSheet.options.data;
                    for(let j=0; j<sourceData.length; j++) { 
                        let row = []; 
                        for(let i=0; i<cols; i++) { 
                            let val = sourceData[j][i];
                            let cellObj = currentStintSheet.records && currentStintSheet.records[j] && currentStintSheet.records[j][i] ? currentStintSheet.records[j][i] : null;
                            if (cellObj && cellObj.element && cellObj.element.getAttribute('data-formula')) {
                                val = "=" + cellObj.element.getAttribute('data-formula');
                            }
                            row.push(val !== undefined && val !== null ? val : ""); 
                        } 
                        rawData.push(row); 
                    }
                    const saveData = { data: rawData, style: currentStintSheet.getStyle(), columns: colConfig };
                    const { error } = await supabaseClient.from('team_stintplaner').update({ data: saveData }).eq('id', currentStintId);
                    if (error) { showToast("Fehler beim Speichern in DB: " + error.message, "error"); console.error("DB Error:", error); } else { showToast("Erfolgreich gespeichert!", "success"); }
                } catch (e) { console.error("Save Error:", e); showToast("Interner Fehler beim Speichern! Konsole prüfen.", "error"); }
            }, 150);
        }

        async function deleteStintPlan(id) { customConfirm("Möchtest du diesen Stintplan wirklich löschen?", async () => { const { error } = await supabaseClient.from('team_stintplaner').delete().eq('id', id); if (error) showToast("Fehler beim Löschen: " + error.message, "error"); else { showToast("Stintplan gelöscht.", "success"); loadTeamStintplanners(); } }); }

        // ================= STINTPLANER FORMEL-HACK =================
        window.isFormulaEditing = false;
        window.currentFormulaEditor = null;

        document.addEventListener('mousedown', function(e) {
            if (window.isFormulaEditing && window.currentFormulaEditor) {
                if (!document.body.contains(window.currentFormulaEditor) || window.currentFormulaEditor.offsetParent === null) {
                    window.isFormulaEditing = false;
                    window.currentFormulaEditor = null;
                    return;
                }

                let target = e.target;
                if (target.nodeType === 3) target = target.parentNode; 
                let td = target.closest('.jexcel tbody td[data-x]');
                
                if (td && !window.currentFormulaEditor.contains(target) && target !== window.currentFormulaEditor) {
                    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();

                    let x = parseInt(td.getAttribute('data-x'));
                    let y = parseInt(td.getAttribute('data-y'));
                    let colName = ""; let tempX = x;
                    while (tempX >= 0) { colName = String.fromCharCode(tempX % 26 + 65) + colName; tempX = Math.floor(tempX / 26) - 1; }
                    let cellName = colName + (y + 1);
                    
                    let editor = window.currentFormulaEditor;
                    let val = editor.value || "";
                    let start = typeof editor.selectionStart === 'number' ? editor.selectionStart : val.length;
                    let end = typeof editor.selectionEnd === 'number' ? editor.selectionEnd : val.length;
                    
                    let newVal = val.substring(0, start) + cellName + val.substring(end);
                    editor.value = newVal;
                    let newPos = start + cellName.length;
                    if (typeof editor.setSelectionRange === 'function') editor.setSelectionRange(newPos, newPos);
                    
                    let oldBg = td.style.backgroundColor;
                    td.style.transition = 'background-color 0.2s';
                    td.style.backgroundColor = 'rgba(23, 162, 184, 0.6)';
                    setTimeout(() => { td.style.backgroundColor = oldBg; td.style.transition = ''; }, 400);

                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                    editor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
                    setTimeout(() => { editor.focus(); }, 10);
                }
            }
        }, true); 

        document.addEventListener('keydown', function(e) {
            if (window.isFormulaEditing && window.currentFormulaEditor) {
                if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
                    window.isFormulaEditing = false;
                    window.currentFormulaEditor.classList.remove('formula-active');
                    window.currentFormulaEditor = null;
                    return;
                }
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.stopPropagation();
            }
        }, true);

        document.addEventListener('input', function(e) {
            let target = e.target;
            if (target && target.tagName && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') && target.closest('.jexcel')) {
                if (target.value && target.value.trim().startsWith('=')) {
                    target.classList.add('formula-active');
                    window.isFormulaEditing = true;
                    window.currentFormulaEditor = target;
                } else {
                    target.classList.remove('formula-active');
                    window.isFormulaEditing = false;
                    window.currentFormulaEditor = null;
                }
            }
        }, true);
        
        document.addEventListener('focusout', function(e) {
             if (e.target === window.currentFormulaEditor) {
                 setTimeout(() => {
                     if (document.activeElement !== window.currentFormulaEditor) {
                        window.isFormulaEditing = false;
                        window.currentFormulaEditor = null;
                     }
                 }, 100);
             }
        });