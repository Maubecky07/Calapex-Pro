function reveal() {
            var reveals = document.querySelectorAll(".reveal");
            for (var i = 0; i < reveals.length; i++) {
                var windowHeight = window.innerHeight;
                var elementTop = reveals[i].getBoundingClientRect().top;
                var elementVisible = 100;
                if (elementTop < windowHeight - elementVisible && elementTop !== 0) reveals[i].classList.add("active");
            }
        }
        window.addEventListener("scroll", reveal);

        async function checkSystemStatus() {
            if (!supabaseClient) return;
            const { data } = await supabaseClient.from('system_status').select('*').eq('id', 1).single();
            if (data) applySystemStatus(data);
        }

        function applySystemStatus(status) {
            const overlay = document.getElementById('maintenance-overlay');
            if (status && status.maintenance_mode) overlay.style.display = 'flex';
            else overlay.style.display = 'none';
        }

        function showToast(msg, type = 'info') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = 'toast';
            if (type === 'error') toast.style.borderLeftColor = '#dc3545';
            else if (type === 'success') toast.style.borderLeftColor = '#28a745';
            else toast.style.borderLeftColor = 'var(--primary)';
            toast.innerText = msg; container.appendChild(toast);
            setTimeout(() => { toast.style.animation = 'fadeOutUp 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 4000);
        }

        let pendingConfirmCallback = null;
        function customConfirm(msg, callback) { document.getElementById('confirm-msg-text').innerText = msg; document.getElementById('custom-confirm').style.display = 'flex'; pendingConfirmCallback = callback; }
        function closeCustomConfirm(result) { document.getElementById('custom-confirm').style.display = 'none'; if (result && pendingConfirmCallback) pendingConfirmCallback(); pendingConfirmCallback = null; }

        function toggleAuth(mode) { document.getElementById('login-box').style.display = mode === 'login' ? 'block' : 'none'; document.getElementById('register-box').style.display = mode === 'register' ? 'block' : 'none'; }
        function openAuthView(mode) { openView('view-auth'); toggleAuth(mode); window.scrollTo({ top: 0, behavior: 'smooth' }); }

        function openView(viewId) {
            const views = document.querySelectorAll('.view');
            views.forEach(view => view.classList.remove('active'));
            setTimeout(() => { document.getElementById(viewId).classList.add('active'); reveal(); }, 50);
            
            if(viewId === 'view-teams-main') loadMyTeams();
            if(viewId === 'view-home' && activeUser) loadGlobalChat(); 

            const onlineWidget = document.getElementById('online-users-widget');
            if (onlineWidget && activeUser) onlineWidget.style.display = viewId === 'view-home' ? 'block' : 'none';

            const iracingWidget = document.getElementById('iracing-widget');
            if (iracingWidget) iracingWidget.style.display = viewId === 'view-team-calendar' ? 'block' : 'none';

            if (viewId !== 'view-team-calendar') {
                document.getElementById('member-sidebar').classList.remove('open');
                if (eventTickerInterval) clearInterval(eventTickerInterval); 
            }
        }

        function switchTab(tabId, btnElement) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            btnElement.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            if(tabId === 'tab-search-team') { document.getElementById('search-result-box').style.display = 'none'; document.getElementById('search-team-code').value = ''; }
        }

        function switchTeamSubTab(tab) {
            if ((tab === 'setups' || tab === 'gallery' || tab === 'stint') && currentMyRole === 'Community') { showToast("Keine Berechtigung für diesen Bereich.", "error"); return; }
            document.getElementById('tab-btn-calendar').classList.remove('active');
            document.getElementById('tab-btn-setups').classList.remove('active');
            document.getElementById('tab-btn-gallery').classList.remove('active');
            document.getElementById('tab-btn-stint').classList.remove('active');
            document.getElementById('team-calendar-section').style.display = 'none';
            document.getElementById('team-setups-section').style.display = 'none';
            document.getElementById('team-gallery-section').style.display = 'none';
            document.getElementById('team-stint-section').style.display = 'none';

            if(tab === 'calendar') { document.getElementById('tab-btn-calendar').classList.add('active'); document.getElementById('team-calendar-section').style.display = 'block'; if (currentOpenTeamId) loadTeamChat(); } 
            else if(tab === 'setups') { document.getElementById('tab-btn-setups').classList.add('active'); document.getElementById('team-setups-section').style.display = 'block'; currentSetupFolderId = null; setupBreadcrumbs = [{id: null, name: 'Root'}]; loadTeamSetups(); } 
            else if(tab === 'gallery') { document.getElementById('tab-btn-gallery').classList.add('active'); document.getElementById('team-gallery-section').style.display = 'block'; currentGalleryFolderId = null; galleryBreadcrumbs = [{id: null, name: 'Root'}]; loadTeamGallery(); } 
            else if(tab === 'stint') { document.getElementById('tab-btn-stint').classList.add('active'); document.getElementById('team-stint-section').style.display = 'block'; loadTeamStintplanners(); }
        }

        function toggleMemberSidebar() { document.getElementById('member-sidebar').classList.toggle('open'); }
        function toggleOnlineWidget() { const list = document.getElementById('online-users-list'); const icon = document.getElementById('online-widget-icon'); list.classList.toggle('collapsed-list'); icon.innerText = list.classList.contains('collapsed-list') ? '▲' : '▼'; }

        document.addEventListener('click', (e) => { if(e.button !== 2) document.getElementById('context-menu').style.display = 'none'; });