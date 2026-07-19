// config.js

// 1. Supabase Initialisierung
const SUPABASE_URL = 'https://upbxznmaviomljfejlyw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UQcsVD61MLTZBZ15q7jB1Q_b1UF9IVJ';

let supabaseClient = null;
if (SUPABASE_URL !== 'DEINE_SUPABASE_URL') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// 2. Globale System-Variablen (State)
let activeUser = null; 
let presenceChannel = null; 
let dataSubscriptionChannel = null; 
let teamChatChannel = null; 
let currentOpenTeamId = null; 
let currentTeamData = null; 
let currentMyRole = null; 
let currentTeamEvents = []; 
let currentEditEventId = null; 
let contextTargetUserId = null; 
let contextTargetUserName = null; 
let idleTimeout = null;
let isIdle = false; 
let eventTickerInterval = null; 
let currentSetupFolderId = null; 
let setupBreadcrumbs = [{id: null, name: 'Root'}];
let contextSetupId = null; 
let currentSetupRemoved = false; 
let currentGalleryFolderId = null;
let galleryBreadcrumbs = [{id: null, name: 'Root'}]; 
let contextGalleryId = null; 
let currentStintSheet = null; 
let currentStintId = null;

// Hilfsfunktion für Berechtigungen
function isDeveloper() { 
    return activeUser && activeUser.is_developer === true; 
}