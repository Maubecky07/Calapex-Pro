// ================= STREAM CENTER FUNKTIONEN (streams.js) =================

let currentStreamMode = 'official'; // 'official' oder 'community'
let loadedStreams = [];
let finalEmbedUrl = ""; 
let dsgvoAccepted = false;

// 1. Die Hauptfunktion, die aufgerufen wird, wenn man auf die neuen Buttons klickt
async function openStreamCenter(mode) {
    currentStreamMode = mode;
    openView('view-streams');
    
    const title = document.getElementById('stream-center-title');
    const playlistTitle = document.getElementById('playlist-title');
    const container = document.getElementById('playlist-container');
    
    // UI Reset, damit die Ansicht sauber startet
    container.innerHTML = '<p style="color:#aaa; text-align: center;">Lade Streams...</p>';
    document.getElementById('video-box-container').innerHTML = `
        <div class="placeholder" style="display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; text-align: center; height: 100%;">
            <h3 id="placeholder-title" style="color: white; margin-bottom: 10px;">Wähle einen Stream</h3>
            <p id="placeholder-text" style="color: #aaa;">Klicke rechts auf ein Event, um die Übertragung zu starten.</p>
            <button class="btn-submit" id="activation-button" style="display:none; width: auto; background-color: #ff4500;" onclick="triggerVideoLoad()">Stream jetzt laden</button>
        </div>`;
    document.getElementById('stream-info-box').style.display = 'none';

    // Je nach Button den richtigen Bereich laden
    if (mode === 'official') {
        title.innerHTML = '📺 Offizielle Serien';
        playlistTitle.innerText = 'Serien & Meisterschaften';
        await loadOfficialStreams();
    } else {
        title.innerHTML = '🎮 Community Live';
        playlistTitle.innerText = 'Live aus den Cockpits';
        await loadCommunityStreams();
    }
}

// 2. Datenbank-Abfrage: Manuell gepflegte Serien
async function loadOfficialStreams() {
    if (!supabaseClient) return;
    
    const { data, error } = await supabaseClient
        .from('official_series')
        .select('*')
        .eq('is_active', true)
        .order('start_time', { ascending: false });

    console.log("Supabase Error:", error);
    console.log("Supabase Daten:", data);

    if (error) {
        document.getElementById('playlist-container').innerHTML = `<p style="color:red;">Fehler: ${error.message}</p>`;
        return;
    }
    
    loadedStreams = data || [];
    renderPlaylist();
}

// 3. Datenbank-Abfrage: Automatisch aus den Team-Kalendern
async function loadCommunityStreams() {
    if (!supabaseClient) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    const { data, error } = await supabaseClient
        .from('events')
        .select(`
            id, name, event_type, date, time_start, time_end, simulator, streams, team_id,
            teams ( name, logo_url )
        `)
        .gte('date', todayString)
        .not('streams', 'is', null);

    if (error) {
        document.getElementById('playlist-container').innerHTML = `<p style="color:red;">Fehler: ${error.message}</p>`;
        return;
    }

    let communityStreams = [];
    
    if(data) {
        data.forEach(ev => {
            let streamLinks = [];
            // Parse das gespeicherte JSON Array aus dem Kalender
            try { streamLinks = JSON.parse(ev.streams); } catch(e) { streamLinks = [{ platform: 'Andere', url: ev.streams }]; }
            
            streamLinks.forEach(linkObj => {
                if(linkObj.url && linkObj.url.trim() !== "") {
                    communityStreams.push({
                        id: ev.id + '_' + Math.random(),
                        series_name: ev.teams ? ev.teams.name : 'Community Stream',
                        round_name: `[${ev.event_type}] ${ev.name}`,
                        simulator: ev.simulator,
                        start_time: ev.date + 'T' + (ev.time_start || '00:00:00'),
                        duration_minutes: 120,
                        stream_url: linkObj.url,
                        platform: linkObj.platform,
                        team_logo: ev.teams ? ev.teams.logo_url : null
                    });
                }
            });
        });
    }

    communityStreams.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    loadedStreams = communityStreams;
    renderPlaylist();
}

// 4. Die Liste rechts aufbauen
function renderPlaylist() {
    const container = document.getElementById('playlist-container');
    const filterSim = document.getElementById('stream-filter-sim').value;
    
    container.innerHTML = '';
    let visibleCount = 0;

    loadedStreams.forEach((stream) => {
        if (filterSim !== 'all' && stream.simulator !== filterSim) return;
        visibleCount++;

        const streamStart = new Date(stream.start_time);
        const streamEnde = new Date(streamStart.getTime() + (stream.duration_minutes || 120) * 60 * 1000);
        const jetztZeit = new Date();

        let statusClass = "";
        let statusText = "";
        let anzeigeDatum = streamStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + " Uhr";

        if (jetztZeit < streamStart) {
            statusClass = "geplant"; statusText = "GEPLANT";
        } else if (jetztZeit >= streamStart && jetztZeit <= streamEnde) {
            statusClass = "live"; statusText = "LIVE";
            anzeigeDatum = `Seit ${streamStart.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'})} Uhr`;
        } else {
            statusClass = "vod"; statusText = "VOD";
            anzeigeDatum = `Gefahren am ${streamStart.toLocaleDateString('de-DE')}`;
        }

        const item = document.createElement('div');
        item.style.backgroundColor = '#262626';
        item.style.padding = '12px';
        item.style.marginBottom = '10px';
        item.style.borderRadius = '6px';
        item.style.cursor = 'pointer';
        item.style.borderLeft = `4px solid ${statusClass === 'live' ? '#e50914' : '#555'}`;
        
        item.onclick = () => selectStream(stream.stream_url, item, stream);

        item.innerHTML = `
            <span style="float: right; font-size: 10px; padding: 2px 6px; border-radius: 3px; font-weight: bold; background-color: ${statusClass === 'live' ? '#e50914' : (statusClass === 'geplant' ? '#007bff' : '#555')}; color: white;">${statusText}</span>
            <div style="font-size: 11px; color: #ff4500; font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">${stream.series_name}</div>
            <div style="font-weight: bold; font-size: 14px; color: white;">${stream.round_name}</div>
            <div style="font-size: 12px; color: #aaa; margin-top: 4px;">🎮 ${stream.simulator || 'Unbekannt'} | 🕒 ${anzeigeDatum}</div>
        `;
        container.appendChild(item);
    });

    if (visibleCount === 0) {
        container.innerHTML = '<p style="color:#aaa; text-align: center; padding: 20px;">Keine Streams in dieser Kategorie gefunden.</p>';
    }
}

function applyStreamFilters() {
    renderPlaylist();
}

// 5. Stream auswählen und Player bauen
function selectStream(url, element, streamData) {
    const alleItems = document.getElementById('playlist-container').children;
    for(let i=0; i<alleItems.length; i++) { 
        alleItems[i].style.backgroundColor = '#262626'; 
    }
    element.style.backgroundColor = '#333';

    finalEmbedUrl = parseStreamUrl(url);

    if (!finalEmbedUrl) {
        document.getElementById('video-box-container').innerHTML = `
            <div class="placeholder" style="display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; text-align: center; height: 100%;">
                <h3 style="color: white; margin-bottom: 10px;">Externer Stream</h3>
                <p style="color: #aaa;">Dieser Stream wird auf einer externen Plattform gehostet.</p>
                <a href="${url}" target="_blank" class="btn-submit" style="text-decoration: none; display: inline-block; width: auto; background-color: var(--primary);">Stream in neuem Tab öffnen</a>
            </div>`;
        return;
    }

    if (!dsgvoAccepted) {
        const container = document.getElementById('video-box-container');
        container.innerHTML = `
            <div class="placeholder" style="display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; text-align: center; height: 100%;">
                <h3 id="placeholder-title" style="color: white; margin-bottom: 10px;">${streamData.round_name}</h3>
                <p id="placeholder-text" style="color: #aaa;">Hinweis: Beim Laden des Videos werden Daten an die Streaming-Plattform übertragen.</p>
                <button class="btn-submit" id="activation-button" style="width: auto; background-color: #ff4500;" onclick="triggerVideoLoad()">Stream jetzt laden</button>
            </div>`;
    } else {
        loadVideoDirectly();
    }
    
    const infoBox = document.getElementById('stream-info-box');
    infoBox.style.display = 'block';
    infoBox.innerHTML = `
        <h4 style="color: white; margin-top: 0; margin-bottom: 10px; font-size: 1.2rem;">${streamData.round_name}</h4>
        <p style="color: #ccc; margin-bottom: 5px; font-size: 0.95rem;"><strong>Serie/Team:</strong> ${streamData.series_name}</p>
        <p style="color: #ccc; margin-bottom: 0; font-size: 0.95rem;"><strong>Simulator:</strong> ${streamData.simulator || '-'}</p>
    `;
}

function triggerVideoLoad() { 
    dsgvoAccepted = true; 
    loadVideoDirectly(); 
}

function loadVideoDirectly() {
    const container = document.getElementById('video-box-container');
    container.innerHTML = `<iframe src="${finalEmbedUrl}" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"></iframe>`;
}

function parseStreamUrl(url) {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        if (videoId) {
            const timeMatch = url.match(/[?&]t=(\d+)/);
            let timeParams = timeMatch ? `&start=${timeMatch[1]}` : '';
            return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1${timeParams}`;
        }
    }
    if (url.includes('twitch.tv')) {
        const parts = url.split('/');
        const channelName = parts[parts.length - 1];
        if (channelName && !url.includes('/videos/')) {
            return `https://player.twitch.tv/?channel=${channelName}&parent=${window.location.hostname || 'localhost'}`;
        }
    }
    return null;
}

// 6. Navigation (Zurück-Button)
function closeStreamCenter() {
    // Stoppt das Video beim Verlassen (entfernt den iframe)
    const container = document.getElementById('video-box-container');
    if (container) {
        container.innerHTML = '';
    }
    
    if (activeUser) {
        openView('view-home'); // Dashboard
    } else {
        openView('view-landing'); // Startseite
    }
}