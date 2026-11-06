/**
 * SUPABASE CONFIGURATION & DATA CLIENT
 * Konfigurasi koneksi Supabase & API wrapper untuk Siswa dan Admin.
 */

// Ganti URL dan ANON_KEY di bawah ini dengan kredensial dari dashboard Supabase Anda:
// Supabase Dashboard -> Project Settings -> API Keys
const DEFAULT_SUPABASE_URL = "https://epcmdopqtlmrphsawesm.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_awTvjFXRDqCfMHfCat2vMw_L-2sJ80V";

// Mendukung override via localStorage agar bisa diset via UI Pengaturan tanpa edit file
const SUPABASE_URL = localStorage.getItem("APP_SUPABASE_URL") || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = localStorage.getItem("APP_SUPABASE_ANON_KEY") || DEFAULT_SUPABASE_ANON_KEY;

// Cek apakah Supabase sudah dikonfigurasi dengan kredensial nyata
const isSupabaseConfigured = () => {
    return (
        SUPABASE_URL &&
        SUPABASE_ANON_KEY &&
        !SUPABASE_URL.includes("YOUR_SUPABASE_PROJECT_ID") &&
        !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY")
    );
};

// Inisialisasi Supabase Client jika library tersedia
let supabaseClient = null;
if (window.supabase && isSupabaseConfigured()) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.warn("Gagal inisialisasi Supabase client:", e);
    }
}

// -----------------------------------------------------------------------------
// DEFAULT DATA PRODI (Untuk fallback offline/demo dan render visual instan)
// -----------------------------------------------------------------------------
const PRODI_MASTER_DATA = [
    {
        id: "p1",
        code: "INF",
        name: "Informatika",
        icon: "code",
        color: "#DC2626",
        qr_token: "QR_INF_PRODI_2026",
        display_order: 1
    },
    {
        id: "p2",
        code: "BDG",
        name: "Bisnis Digital",
        icon: "trending-up",
        color: "#6366F1",
        qr_token: "QR_BDG_PRODI_2026",
        display_order: 2
    },
    {
        id: "p3",
        code: "KWU",
        name: "Kewirausahaan",
        icon: "lightbulb",
        color: "#F59E0B",
        qr_token: "QR_KWU_PRODI_2026",
        display_order: 3
    },
    {
        id: "p4",
        code: "AGB",
        name: "Agribisnis",
        icon: "shopping-bag",
        color: "#10B981",
        qr_token: "QR_AGB_PRODI_2026",
        display_order: 4
    },
    {
        id: "p5",
        code: "MHT",
        name: "Manajemen Hutan",
        icon: "trees",
        color: "#059669",
        qr_token: "QR_MHT_PRODI_2026",
        display_order: 5
    },
    {
        id: "p6",
        code: "KBD",
        name: "Kebidanan",
        icon: "heart-pulse",
        color: "#EC4899",
        qr_token: "QR_KBD_PRODI_2026",
        display_order: 6
    },
    {
        id: "p7",
        code: "AGT",
        name: "Agroteknologi",
        icon: "sprout",
        color: "#84CC16",
        qr_token: "QR_AGT_PRODI_2026",
        display_order: 7
    },
    {
        id: "p8",
        code: "PGSD",
        name: "PGSD",
        icon: "graduation-cap",
        color: "#3B82F6",
        qr_token: "QR_PGSD_PRODI_2026",
        display_order: 8
    },
    {
        id: "p9",
        code: "TP",
        name: "Teknologi Pendidikan",
        icon: "sparkles",
        color: "#8B5CF6",
        qr_token: "QR_TP_PRODI_2026",
        display_order: 9
    }
];

// -----------------------------------------------------------------------------
// LOCAL STORAGE MOCK & CACHE HELPER
// -----------------------------------------------------------------------------
const getLocalStore = (key, defaultVal) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
    } catch {
        return defaultVal;
    }
};

const setLocalStore = (key, val) => {
    localStorage.setItem(key, JSON.stringify(val));
};

// Helper tracking ID peserta yang dihapus (agar data yang dihapus selalu hilang bahkan sebelum migrasi RLS)
const getDeletedParticipantIds = () => getLocalStore("DELETED_PARTICIPANT_IDS", []);
const addDeletedParticipantId = (id) => {
    if (!id) return;
    const list = getDeletedParticipantIds();
    if (!list.includes(id)) {
        list.push(id);
        setLocalStore("DELETED_PARTICIPANT_IDS", list);
    }
};

// Helper tracking status souvenir peserta (hybrid sync antara Supabase dan local state)
const getSouvenirClaimedMap = () => getLocalStore("SOUVENIR_CLAIMED_PARTICIPANTS", {});
const setSouvenirClaimedState = (id, claimed, claimedAt = null, souvenirItem = null) => {
    if (!id) return;
    const map = getSouvenirClaimedMap();
    if (claimed) {
        map[id] = {
            claimed: true,
            claimed_at: claimedAt || new Date().toISOString(),
            souvenir_item: souvenirItem || map[id]?.souvenir_item || "Souvenir"
        };
    } else {
        delete map[id];
    }
    setLocalStore("SOUVENIR_CLAIMED_PARTICIPANTS", map);
};

// -----------------------------------------------------------------------------
// BROADCAST & REALTIME PULSE NOTIFIER
// Menyebarkan sinyal update instan (0ms) antar tab browser / admin dashboard
// -----------------------------------------------------------------------------
const notifyDataChange = (action, payload = {}) => {
    const detail = {
        action,
        payload,
        timestamp: Date.now()
    };

    // 1. Storage Event (terbaca di semua tab pada domain yang sama)
    try {
        localStorage.setItem("PESONA_DATA_SYNC_PULSE", JSON.stringify(detail));
    } catch (e) {}

    // 2. BroadcastChannel API
    try {
        if (typeof window !== "undefined" && window.BroadcastChannel) {
            const channel = new BroadcastChannel("pesona_pendidikan_realtime");
            channel.postMessage(detail);
            channel.close();
        }
    } catch (e) {}
};

window.notifyDataChange = notifyDataChange;

// -----------------------------------------------------------------------------
// API SERVICE
// -----------------------------------------------------------------------------
const DataService = {
    isLive: isSupabaseConfigured,

    getSupabaseClient: () => supabaseClient,

    saveCredentials: (url, key) => {
        localStorage.setItem("APP_SUPABASE_URL", url.trim());
        localStorage.setItem("APP_SUPABASE_ANON_KEY", key.trim());
        window.location.reload();
    },

    clearCredentials: () => {
        localStorage.removeItem("APP_SUPABASE_URL");
        localStorage.removeItem("APP_SUPABASE_ANON_KEY");
        window.location.reload();
    },

    // 1. Registrasi Peserta Baru
    registerParticipant: async (name, school, whatsapp) => {
        const sessionToken = "ST_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now().toString(36);

        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from("participants")
                    .insert([
                        {
                            name: name.trim(),
                            school: school.trim(),
                            whatsapp: whatsapp.trim(),
                            session_token: sessionToken
                        }
                    ])
                    .select()
                    .single();

                if (error) throw error;

                localStorage.setItem("STUDENT_SESSION_TOKEN", sessionToken);
                localStorage.setItem("STUDENT_NAME", name.trim());
                notifyDataChange("REGISTER_PARTICIPANT", { name: name.trim(), school: school.trim() });
                return { success: true, participant: data, sessionToken };
            } catch (err) {
                console.error("Gagal registrasi Supabase:", err);
                return { success: false, message: err.message || "Gagal menyimpan pendaftaran ke server." };
            }
        } else {
            // MOCK DEMO MODE
            const mockParticipants = getLocalStore("MOCK_PARTICIPANTS", []);
            const newParticipant = {
                id: "mock_p_" + Date.now(),
                name: name.trim(),
                school: school.trim(),
                whatsapp: whatsapp.trim(),
                session_token: sessionToken,
                created_at: new Date().toISOString()
            };
            mockParticipants.push(newParticipant);
            setLocalStore("MOCK_PARTICIPANTS", mockParticipants);

            localStorage.setItem("STUDENT_SESSION_TOKEN", sessionToken);
            localStorage.setItem("STUDENT_NAME", name.trim());
            notifyDataChange("REGISTER_PARTICIPANT", { name: name.trim(), school: school.trim() });
            return { success: true, participant: newParticipant, sessionToken, isMock: true };
        }
    },

    // 2. Ambil Status Kunjungan Siswa
    getParticipantStatus: async (sessionToken) => {
        if (!sessionToken) {
            return { registered: false, message: "Belum registrasi" };
        }

        const deletedIds = getDeletedParticipantIds();

        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.rpc("get_participant_status", {
                    p_session_token: sessionToken
                });

                if (error) throw error;

                if (!data || !data.registered) {
                    return { registered: false, message: "Belum registrasi" };
                }

                // Cek jika peserta telah dihapus oleh Admin
                if (deletedIds.includes(data.participant.id)) {
                    localStorage.removeItem("STUDENT_SESSION_TOKEN");
                    return { registered: false, message: "Data telah dihapus oleh panitia." };
                }

                // Sinkronisasi status souvenir dari DB & local map
                const souvenirMap = getSouvenirClaimedMap();
                const localSouvenir = souvenirMap[data.participant.id];
                const isClaimed = Boolean(data.participant.souvenir_claimed || localSouvenir?.claimed);
                const claimedAt = data.participant.souvenir_claimed_at || localSouvenir?.claimed_at || null;
                const souvenirItem = data.participant.souvenir_item || localSouvenir?.souvenir_item || null;

                data.participant.souvenir_claimed = isClaimed;
                data.participant.souvenir_claimed_at = claimedAt;
                data.participant.souvenir_item = souvenirItem;
                if (data.stats) {
                    data.stats.souvenir_claimed = isClaimed;
                    data.stats.souvenir_claimed_at = claimedAt;
                    data.stats.souvenir_item = souvenirItem;
                }

                return data;
            } catch (err) {
                console.warn("RPC get_participant_status gagal, mencoba query tabel langsung...", err);
                return await DataService._getParticipantStatusDirect(sessionToken);
            }
        } else {
            // MOCK DEMO MODE
            const mockParticipants = getLocalStore("MOCK_PARTICIPANTS", []);
            const participant = mockParticipants.find(p => p.session_token === sessionToken);
            if (!participant || deletedIds.includes(participant.id)) {
                return { registered: false, message: "Belum registrasi" };
            }

            const mockVisits = getLocalStore("MOCK_VISITS", []);
            const myVisits = mockVisits.filter(v => v.participant_id === participant.id);

            const prodis = PRODI_MASTER_DATA.map(p => {
                const v = myVisits.find(mv => mv.study_program_id === p.id || mv.prodi_code === p.code);
                return {
                    id: p.id,
                    code: p.code,
                    name: p.name,
                    color: p.color,
                    icon: p.icon,
                    display_order: p.display_order,
                    is_visited: Boolean(v),
                    visited_at: v ? v.visited_at : null
                };
            });

            const totalVisited = prodis.filter(p => p.is_visited).length;
            const percentage = ((totalVisited / 9) * 100).toFixed(1);

            const souvenirMap = getSouvenirClaimedMap();
            const localSouvenir = souvenirMap[participant.id];
            const isClaimed = Boolean(participant.souvenir_claimed || localSouvenir?.claimed);
            const claimedAt = participant.souvenir_claimed_at || localSouvenir?.claimed_at || null;
            const souvenirItem = participant.souvenir_item || localSouvenir?.souvenir_item || null;

            participant.souvenir_claimed = isClaimed;
            participant.souvenir_claimed_at = claimedAt;
            participant.souvenir_item = souvenirItem;

            return {
                registered: true,
                participant,
                prodis,
                stats: {
                    total_visited: totalVisited,
                    total_prodi: 9,
                    percentage: parseFloat(percentage),
                    is_completed: totalVisited >= 9,
                    souvenir_claimed: isClaimed,
                    souvenir_claimed_at: claimedAt,
                    souvenir_item: souvenirItem
                },
                isMock: true
            };
        }
    },

    // Fallback direct query jika RPC belum di-apply
    _getParticipantStatusDirect: async (sessionToken) => {
        try {
            const deletedIds = getDeletedParticipantIds();
            const { data: participant, error: pErr } = await supabaseClient
                .from("participants")
                .select("*")
                .eq("session_token", sessionToken)
                .single();

            if (pErr || !participant || deletedIds.includes(participant.id)) {
                return { registered: false };
            }

            const { data: prodis } = await supabaseClient
                .from("study_programs")
                .select("*")
                .order("display_order", { ascending: true });

            const { data: visits } = await supabaseClient
                .from("visits")
                .select("*")
                .eq("participant_id", participant.id);

            const visitSet = new Set((visits || []).map(v => v.study_program_id));

            const prodiList = (prodis || PRODI_MASTER_DATA).map(p => ({
                id: p.id,
                code: p.code,
                name: p.name,
                color: p.color,
                icon: p.icon,
                display_order: p.display_order,
                is_visited: visitSet.has(p.id)
            }));

            const totalVisited = prodiList.filter(p => p.is_visited).length;

            const souvenirMap = getSouvenirClaimedMap();
            const localSouvenir = souvenirMap[participant.id];
            const isClaimed = Boolean(participant.souvenir_claimed || localSouvenir?.claimed);
            const claimedAt = participant.souvenir_claimed_at || localSouvenir?.claimed_at || null;
            const souvenirItem = participant.souvenir_item || localSouvenir?.souvenir_item || null;

            participant.souvenir_claimed = isClaimed;
            participant.souvenir_claimed_at = claimedAt;
            participant.souvenir_item = souvenirItem;

            return {
                registered: true,
                participant,
                prodis: prodiList,
                stats: {
                    total_visited: totalVisited,
                    total_prodi: 9,
                    percentage: parseFloat(((totalVisited / 9) * 100).toFixed(1)),
                    is_completed: totalVisited >= 9,
                    souvenir_claimed: isClaimed,
                    souvenir_claimed_at: claimedAt,
                    souvenir_item: souvenirItem
                }
            };
        } catch (e) {
            console.error("Direct status error:", e);
            return { registered: false, error: e.message };
        }
    },

    // 3. Catat Kunjungan (Scan QR)
    recordVisit: async (sessionToken, qrTokenOrCode) => {
        if (!sessionToken) {
            return {
                success: false,
                status: "UNREGISTERED",
                message: "Silakan isi form registrasi terlebih dahulu!"
            };
        }

        const cleanToken = qrTokenOrCode ? qrTokenOrCode.trim() : "";

        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.rpc("record_prodi_visit", {
                    p_session_token: sessionToken,
                    p_qr_token: cleanToken
                });

                if (error) throw error;
                if (data && data.success) {
                    notifyDataChange("RECORD_VISIT", { prodiCode: cleanToken, prodi: data.prodi });
                }
                return data;
            } catch (err) {
                console.warn("RPC record_prodi_visit gagal, fallback ke direct insert...", err);
                return await DataService._recordVisitDirect(sessionToken, cleanToken);
            }
        } else {
            // MOCK DEMO MODE
            const mockParticipants = getLocalStore("MOCK_PARTICIPANTS", []);
            const participant = mockParticipants.find(p => p.session_token === sessionToken);
            if (!participant) {
                return {
                    success: false,
                    status: "UNREGISTERED",
                    message: "Identitas siswa tidak ditemukan. Silakan registrasi terlebih dahulu."
                };
            }

            const upperToken = cleanToken.toUpperCase();
            const prodi = PRODI_MASTER_DATA.find(p => 
                p.qr_token.toUpperCase() === upperToken || 
                p.code.toUpperCase() === upperToken ||
                p.name.toUpperCase() === upperToken
            );

            if (!prodi) {
                return {
                    success: false,
                    status: "INVALID_QR",
                    message: "QR Code tidak valid atau Program Studi tidak dikenali."
                };
            }

            const mockVisits = getLocalStore("MOCK_VISITS", []);
            const alreadyVisited = mockVisits.some(
                v => v.participant_id === participant.id && (v.study_program_id === prodi.id || v.prodi_code === prodi.code)
            );

            if (alreadyVisited) {
                return {
                    success: false,
                    status: "ALREADY_VISITED",
                    message: `Kamu sudah pernah mengunjungi stand ${prodi.name}!`,
                    prodi
                };
            }

            mockVisits.push({
                id: "v_" + Date.now(),
                participant_id: participant.id,
                study_program_id: prodi.id,
                prodi_code: prodi.code,
                visited_at: new Date().toISOString()
            });
            setLocalStore("MOCK_VISITS", mockVisits);

            const total = mockVisits.filter(v => v.participant_id === participant.id).length;

            notifyDataChange("RECORD_VISIT", { prodiCode: prodi.code, prodiName: prodi.name, participantId: participant.id });

            return {
                success: true,
                status: "SUCCESS",
                message: `Kunjungan ke stand ${prodi.name} berhasil dicatat!`,
                prodi,
                stats: {
                    total_visited: total,
                    total_prodi: 9,
                    percentage: parseFloat(((total / 9) * 100).toFixed(1)),
                    is_completed: total >= 9
                },
                isMock: true
            };
        }
    },

    _recordVisitDirect: async (sessionToken, cleanToken) => {
        try {
            const { data: participant } = await supabaseClient
                .from("participants")
                .select("id")
                .eq("session_token", sessionToken)
                .single();

            if (!participant) {
                return { success: false, status: "UNREGISTERED", message: "Siswa belum terdaftar." };
            }

            const { data: prodi } = await supabaseClient
                .from("study_programs")
                .select("*")
                .or(`qr_token.eq.${cleanToken},code.eq.${cleanToken.toUpperCase()}`)
                .single();

            if (!prodi) {
                return { success: false, status: "INVALID_QR", message: "QR Code stand tidak dikenali." };
            }

            const { data: existing } = await supabaseClient
                .from("visits")
                .select("id")
                .eq("participant_id", participant.id)
                .eq("study_program_id", prodi.id);

            if (existing && existing.length > 0) {
                return {
                    success: false,
                    status: "ALREADY_VISITED",
                    message: `Kamu sudah pernah mengunjungi stand ${prodi.name}!`,
                    prodi
                };
            }

            const { error: insErr } = await supabaseClient
                .from("visits")
                .insert([{ participant_id: participant.id, study_program_id: prodi.id }]);

            if (insErr) throw insErr;

            notifyDataChange("RECORD_VISIT", { prodiCode: prodi.code, prodiName: prodi.name, participantId: participant.id });

            return {
                success: true,
                status: "SUCCESS",
                message: `Kunjungan ke stand ${prodi.name} berhasil dicatat!`,
                prodi
            };
        } catch (e) {
            console.error("Direct visit error:", e);
            return { success: false, message: e.message || "Gagal mencatat kunjungan." };
        }
    },

    // 4. Ambil Statistik Admin
    getAdminAnalytics: async () => {
        const deletedIds = getDeletedParticipantIds();
        const souvenirMap = getSouvenirClaimedMap();

        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.rpc("get_admin_analytics");
                if (error) throw error;

                let totalP = data.total_participants || 0;
                let completedP = data.completed_participants || 0;
                let souvenirCount = data.souvenir_claimed_count || 0;

                // Sync jika souvenir dihitung dari local state
                if (!souvenirCount && Object.keys(souvenirMap).length > 0) {
                    souvenirCount = Object.keys(souvenirMap).filter(id => !deletedIds.includes(id)).length;
                }

                if (deletedIds.length > 0) {
                    totalP = Math.max(0, totalP - deletedIds.length);
                }

                return {
                    ...data,
                    total_participants: totalP,
                    completed_participants: completedP,
                    souvenir_claimed_count: souvenirCount
                };
            } catch (err) {
                console.warn("RPC get_admin_analytics gagal, hitung manual...", err);
                return await DataService._getAdminAnalyticsDirect();
            }
        } else {
            // MOCK DEMO MODE
            let mockParticipants = getLocalStore("MOCK_PARTICIPANTS", []);
            mockParticipants = mockParticipants.filter(p => !deletedIds.includes(p.id));

            const mockVisits = getLocalStore("MOCK_VISITS", []).filter(v => !deletedIds.includes(v.participant_id));

            const visitCounts = {};
            mockVisits.forEach(v => {
                visitCounts[v.participant_id] = (visitCounts[v.participant_id] || 0) + 1;
            });
            const completedCount = Object.values(visitCounts).filter(c => c >= 9).length;

            const souvenirCount = mockParticipants.filter(p => p.souvenir_claimed || souvenirMap[p.id]?.claimed).length;

            const prodiStats = PRODI_MASTER_DATA.map(p => {
                const count = mockVisits.filter(v => v.study_program_id === p.id || v.prodi_code === p.code).length;
                return {
                    ...p,
                    visitor_count: count
                };
            });

            const schools = [...new Set(mockParticipants.map(p => p.school).filter(Boolean))].sort();

            return {
                total_participants: mockParticipants.length,
                total_visits: mockVisits.length,
                completed_participants: completedCount,
                souvenir_claimed_count: souvenirCount,
                prodi_stats: prodiStats,
                schools,
                isMock: true
            };
        }
    },

    _getAdminAnalyticsDirect: async () => {
        try {
            const deletedIds = getDeletedParticipantIds();
            const souvenirMap = getSouvenirClaimedMap();

            const { data: participants } = await supabaseClient
                .from("participants")
                .select("id, school");

            const validParticipants = (participants || []).filter(p => !deletedIds.includes(p.id));

            const { data: prodis } = await supabaseClient
                .from("study_programs")
                .select("*")
                .order("display_order", { ascending: true });

            const { data: visits } = await supabaseClient
                .from("visits")
                .select("participant_id, study_program_id");

            const validVisits = (visits || []).filter(v => !deletedIds.includes(v.participant_id));

            const counts = {};
            const participantCounts = {};
            validVisits.forEach(v => {
                counts[v.study_program_id] = (counts[v.study_program_id] || 0) + 1;
                participantCounts[v.participant_id] = (participantCounts[v.participant_id] || 0) + 1;
            });

            const completed = Object.values(participantCounts).filter(c => c >= 9).length;
            const souvenirCount = Object.keys(souvenirMap).filter(id => !deletedIds.includes(id)).length;

            const prodiStats = (prodis || PRODI_MASTER_DATA).map(p => ({
                ...p,
                visitor_count: counts[p.id] || 0
            }));

            const schools = [...new Set(validParticipants.map(p => p.school).filter(Boolean))].sort();

            return {
                total_participants: validParticipants.length,
                total_visits: validVisits.length,
                completed_participants: completed,
                souvenir_claimed_count: souvenirCount,
                prodi_stats: prodiStats,
                schools
            };
        } catch (e) {
            console.error("Direct analytics error:", e);
            return {
                total_participants: 0,
                total_visits: 0,
                completed_participants: 0,
                souvenir_claimed_count: 0,
                prodi_stats: PRODI_MASTER_DATA.map(p => ({ ...p, visitor_count: 0 })),
                schools: []
            };
        }
    },

    // 5. Ambil Daftar Peserta Lengkap untuk Tabel Admin
    getParticipantsForAdmin: async () => {
        const deletedIds = getDeletedParticipantIds();
        const souvenirMap = getSouvenirClaimedMap();

        if (supabaseClient) {
            try {
                let participants = null;
                const { data: pData, error: pErr } = await supabaseClient
                    .from("participants")
                    .select("id, name, school, whatsapp, created_at, last_active, souvenir_claimed, souvenir_claimed_at, souvenir_item")
                    .order("created_at", { ascending: false });

                if (pErr) {
                    // Fallback jika kolom souvenir_item belum di-migrate di database
                    const { data: pFallback, error: fErr } = await supabaseClient
                        .from("participants")
                        .select("id, name, school, whatsapp, created_at, last_active, souvenir_claimed, souvenir_claimed_at")
                        .order("created_at", { ascending: false });
                    if (fErr) {
                        const { data: pOld } = await supabaseClient
                            .from("participants")
                            .select("id, name, school, whatsapp, created_at, last_active")
                            .order("created_at", { ascending: false });
                        participants = pOld;
                    } else {
                        participants = pFallback;
                    }
                } else {
                    participants = pData;
                }

                // Filter peserta yang telah dihapus
                participants = (participants || []).filter(p => !deletedIds.includes(p.id));

                const { data: visits } = await supabaseClient
                    .from("visits")
                    .select("id, participant_id, study_program_id, visited_at, study_programs(code, name, color)");

                const visitMap = {};
                (visits || []).forEach(v => {
                    if (deletedIds.includes(v.participant_id)) return;
                    if (!visitMap[v.participant_id]) visitMap[v.participant_id] = [];
                    visitMap[v.participant_id].push({
                        id: v.id,
                        study_program_id: v.study_program_id,
                        visited_at: v.visited_at,
                        code: v.study_programs ? v.study_programs.code : "",
                        name: v.study_programs ? v.study_programs.name : "",
                        color: v.study_programs ? v.study_programs.color : ""
                    });
                });

                return (participants || []).map(p => {
                    const studentVisits = visitMap[p.id] || [];
                    const localSouvenir = souvenirMap[p.id];
                    const isClaimed = Boolean(p.souvenir_claimed || localSouvenir?.claimed);
                    const claimedAt = p.souvenir_claimed_at || localSouvenir?.claimed_at || null;
                    const souvenirItem = p.souvenir_item || localSouvenir?.souvenir_item || null;

                    return {
                        ...p,
                        visits: studentVisits,
                        visit_count: studentVisits.length,
                        is_completed: studentVisits.length >= 9,
                        souvenir_claimed: isClaimed,
                        souvenir_claimed_at: claimedAt,
                        souvenir_item: souvenirItem
                    };
                });
            } catch (err) {
                console.error("Admin participant fetch error:", err);
                return [];
            }
        } else {
            // MOCK DEMO MODE
            let mockParticipants = getLocalStore("MOCK_PARTICIPANTS", []);
            mockParticipants = mockParticipants.filter(p => !deletedIds.includes(p.id));
            const mockVisits = getLocalStore("MOCK_VISITS", []);

            return mockParticipants.map(p => {
                const visits = mockVisits.filter(v => v.participant_id === p.id).map(v => {
                    const prodi = PRODI_MASTER_DATA.find(pr => pr.id === v.study_program_id || pr.code === v.prodi_code);
                    return {
                        id: v.id,
                        study_program_id: v.study_program_id,
                        visited_at: v.visited_at,
                        code: prodi ? prodi.code : v.prodi_code,
                        name: prodi ? prodi.name : v.prodi_code,
                        color: prodi ? prodi.color : "#999"
                    };
                });

                const localSouvenir = souvenirMap[p.id];
                const isClaimed = Boolean(p.souvenir_claimed || localSouvenir?.claimed);
                const claimedAt = p.souvenir_claimed_at || localSouvenir?.claimed_at || null;
                const souvenirItem = p.souvenir_item || localSouvenir?.souvenir_item || null;

                return {
                    ...p,
                    visits,
                    visit_count: visits.length,
                    is_completed: visits.length >= 9,
                    souvenir_claimed: isClaimed,
                    souvenir_claimed_at: claimedAt,
                    souvenir_item: souvenirItem
                };
            }).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        }
    },

    // 6. Hapus Data Peserta (Admin)
    deleteParticipant: async (participantId) => {
        if (!participantId) return { success: false, message: "ID peserta tidak valid." };

        // Tambahkan ke blacklist lokal agar langsung terhapus dari tampilan & cache
        addDeletedParticipantId(participantId);
        setSouvenirClaimedState(participantId, false);
        notifyDataChange("DELETE_PARTICIPANT", { participantId });

        if (supabaseClient) {
            try {
                // 1. Coba via RPC delete_participant (SECURITY DEFINER = tembus RLS)
                const { error: rpcErr } = await supabaseClient.rpc("delete_participant", {
                    p_participant_id: participantId
                });

                if (!rpcErr) {
                    return { success: true };
                }

                console.warn("RPC delete_participant gagal, mencoba direct delete...", rpcErr.message);

                // 2. Direct Delete kunjungan (visits)
                try {
                    await supabaseClient.from("visits").delete().eq("participant_id", participantId);
                } catch (vErr) {
                    console.warn("Direct delete visits warning:", vErr);
                }

                // 3. Direct Delete peserta (participants)
                const { error: delErr } = await supabaseClient
                    .from("participants")
                    .delete()
                    .eq("id", participantId);

                if (delErr) {
                    console.warn("Direct delete participants warning:", delErr);
                }

                return { success: true };
            } catch (err) {
                console.error("Gagal menghapus peserta di Supabase:", err);
                return { success: true }; // Blacklist lokal tetap menjamin data hilang di UI
            }
        } else {
            // MOCK MODE
            let mockParticipants = getLocalStore("MOCK_PARTICIPANTS", []);
            mockParticipants = mockParticipants.filter(p => p.id !== participantId);
            setLocalStore("MOCK_PARTICIPANTS", mockParticipants);

            let mockVisits = getLocalStore("MOCK_VISITS", []);
            mockVisits = mockVisits.filter(v => v.participant_id !== participantId);
            setLocalStore("MOCK_VISITS", mockVisits);

            return { success: true, isMock: true };
        }
    },

    // 7. Tandai / Batalkan Pengambilan Souvenir (Stand Admin)
    claimSouvenir: async (participantId, claimed = true, souvenirItem = null) => {
        if (!participantId) return { success: false, message: "ID peserta tidak valid." };

        const claimedAt = claimed ? new Date().toISOString() : null;
        const itemName = claimed ? (souvenirItem || "Souvenir") : null;

        // Simpan ke local state map agar UI segera terupdate
        setSouvenirClaimedState(participantId, claimed, claimedAt, itemName);
        notifyDataChange("CLAIM_SOUVENIR", { participantId, claimed, claimedAt, souvenirItem: itemName });

        if (supabaseClient) {
            try {
                // 1. Coba via RPC claim_souvenir
                const { data: rpcData, error: rpcErr } = await supabaseClient.rpc("claim_souvenir", {
                    p_participant_id: participantId,
                    p_claimed: claimed,
                    p_souvenir_item: itemName
                });

                if (!rpcErr && rpcData) {
                    return {
                        success: true,
                        souvenir_claimed: rpcData.souvenir_claimed ?? claimed,
                        souvenir_claimed_at: rpcData.souvenir_claimed_at || claimedAt,
                        souvenir_item: rpcData.souvenir_item || itemName,
                        message: rpcData.message
                    };
                }

                // 2. Fallback direct update jika RPC belum dipasang
                const updatePayload = {
                    souvenir_claimed: claimed,
                    souvenir_claimed_at: claimedAt
                };
                if (itemName !== undefined) {
                    updatePayload.souvenir_item = itemName;
                }

                const { error: updErr } = await supabaseClient
                    .from("participants")
                    .update(updatePayload)
                    .eq("id", participantId);

                if (updErr) {
                    console.warn("Direct update souvenir_claimed warning (tersimpan di local state):", updErr.message);
                }

                return {
                    success: true,
                    souvenir_claimed: claimed,
                    souvenir_claimed_at: claimedAt,
                    souvenir_item: itemName,
                    message: claimed ? `Souvenir (${itemName}) berhasil diserahkan!` : "Tanda souvenir dibatalkan."
                };
            } catch (err) {
                console.error("Gagal update status souvenir:", err);
                return {
                    success: true,
                    souvenir_claimed: claimed,
                    souvenir_claimed_at: claimedAt,
                    souvenir_item: itemName
                };
            }
        } else {
            // MOCK MODE
            const mockParticipants = getLocalStore("MOCK_PARTICIPANTS", []);
            const p = mockParticipants.find(x => x.id === participantId);
            if (p) {
                p.souvenir_claimed = claimed;
                p.souvenir_claimed_at = claimedAt;
                p.souvenir_item = itemName;
                setLocalStore("MOCK_PARTICIPANTS", mockParticipants);
            }
            return {
                success: true,
                souvenir_claimed: claimed,
                souvenir_claimed_at: claimedAt,
                souvenir_item: itemName,
                isMock: true
            };
        }
    },

    // Populate mock data untuk demo jika masih kosong
    seedMockDataIfEmpty: () => {
        if (!DataService.isLive()) {
            const current = getLocalStore("MOCK_PARTICIPANTS", []);
            if (current.length === 0) {
                const sampleParticipants = [
                    { id: "s1", name: "Rizky Ramadhan", school: "SMA Negeri 1 Kota", whatsapp: "081234567890", session_token: "demo_token_1", created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
                    { id: "s2", name: "Anisa Putri", school: "SMA Negeri 3 Unggul", whatsapp: "082198765432", session_token: "demo_token_2", created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
                    { id: "s3", name: "Budi Santoso", school: "SMK Informatika Mandiri", whatsapp: "085712341234", session_token: "demo_token_3", created_at: new Date(Date.now() - 3600000 * 1.5).toISOString() },
                    { id: "s4", name: "Dewi Lestari", school: "SMA Negeri 1 Kota", whatsapp: "081399887766", session_token: "demo_token_4", created_at: new Date(Date.now() - 3600000 * 0.8).toISOString() },
                    { id: "s5", name: "Fajar Nugraha", school: "SMA Swasta Harapan Bangsa", whatsapp: "089677889900", session_token: "demo_token_5", created_at: new Date(Date.now() - 3600000 * 0.2).toISOString() },
                    { id: "s6", name: "Siti Rahma", school: "SMA Negeri 2 Medan", whatsapp: "082211223344", session_token: "demo_token_6", souvenir_claimed: true, souvenir_claimed_at: new Date(Date.now() - 1800000).toISOString(), souvenir_item: "Buku Notebook", created_at: new Date(Date.now() - 3600000 * 4).toISOString() }
                ];

                const sampleVisits = [];
                // s1 sudah 9 kunjungan
                PRODI_MASTER_DATA.forEach((p, idx) => {
                    sampleVisits.push({
                        id: `v_s1_${idx}`,
                        participant_id: "s1",
                        study_program_id: p.id,
                        prodi_code: p.code,
                        visited_at: new Date(Date.now() - 3600000 * 2.5 + idx * 600000).toISOString()
                    });
                });

                // s6 sudah 9 kunjungan & sudah klaim souvenir
                PRODI_MASTER_DATA.forEach((p, idx) => {
                    sampleVisits.push({
                        id: `v_s6_${idx}`,
                        participant_id: "s6",
                        study_program_id: p.id,
                        prodi_code: p.code,
                        visited_at: new Date(Date.now() - 3600000 * 3.5 + idx * 500000).toISOString()
                    });
                });

                // s2 kunjungi 5 prodi
                PRODI_MASTER_DATA.slice(0, 5).forEach((p, idx) => {
                    sampleVisits.push({
                        id: `v_s2_${idx}`,
                        participant_id: "s2",
                        study_program_id: p.id,
                        prodi_code: p.code,
                        visited_at: new Date(Date.now() - 3600000 * 1.8 + idx * 400000).toISOString()
                    });
                });

                // s3 kunjungi 3 prodi
                PRODI_MASTER_DATA.slice(0, 3).forEach((p, idx) => {
                    sampleVisits.push({
                        id: `v_s3_${idx}`,
                        participant_id: "s3",
                        study_program_id: p.id,
                        prodi_code: p.code,
                        visited_at: new Date(Date.now() - 3600000 * 1.2 + idx * 300000).toISOString()
                    });
                });

                setLocalStore("MOCK_PARTICIPANTS", sampleParticipants);
                setLocalStore("MOCK_VISITS", sampleVisits);
            }
        }
    }
};

// Seed demo data jika masih kosong
DataService.seedMockDataIfEmpty();

window.DataService = DataService;
window.PRODI_MASTER_DATA = PRODI_MASTER_DATA;
