/**
 * ADMIN.JS - CONTROLLER DASHBOARD PANITIA & ADMIN REAL-TIME
 * Monitoring Statistik Real-Time, Leaderboard Stand Terfavorit, Filter & Sort Peserta,
 * Verifikasi Klaim Souvenir Stand Admin, Export Excel, dan Generator QR Meja Stand.
 * Universitas Satya Terra Bhinneka - Pesona Pendidikan 2026
 */

(function () {
    'use strict';

    // Konfigurasi Master PIN Keamanan
    const MASTER_ADMIN_PIN = "admin123";

    // State Admin
    let allParticipants = [];
    let allAnalytics = null;
    let schoolsList = [];
    let currentPage = 1;
    let activeDetailParticipant = null;

    // Sorting State
    let prodiSortMode = 'most_visited'; // 'most_visited' | 'stand_number'
    let participantSortOrder = 'progress_desc'; // 'progress_desc' | 'progress_asc' | 'date_desc' | 'date_asc' | 'name_asc'

    // Real-Time Engine State
    let realtimeChannel = null;
    let smartPollingInterval = null;
    let isFetchingData = false;
    let lastDataFingerprint = '';
    let liveToastTimer = null;

    // DOM Elements Cache
    const elements = {
        adminPinGate: document.getElementById('adminPinGate'),
        adminDashboardContent: document.getElementById('adminDashboardContent'),
        formAdminPin: document.getElementById('formAdminPin'),
        adminPinInput: document.getElementById('adminPinInput'),
        btnLogoutAdmin: document.getElementById('btnLogoutAdmin'),
        btnRefreshData: document.getElementById('btnRefreshData'),
        btnExportExcel: document.getElementById('btnExportExcel'),
        btnToggleTheme: document.getElementById('btnToggleTheme'),
        themeToggleIcon: document.getElementById('themeToggleIcon'),
        themeToggleText: document.getElementById('themeToggleText'),
        btnDownloadAllQR: document.getElementById('btnDownloadAllQR'),
        btnPrintQRCards: document.getElementById('btnPrintQRCards'),

        // Realtime Indicators
        realtimeIndicator: document.getElementById('realtimeIndicator'),
        realtimeStatusText: document.getElementById('realtimeStatusText'),
        realtimeSyncTime: document.getElementById('realtimeSyncTime'),
        realtimeLiveToast: document.getElementById('realtimeLiveToast'),
        realtimeLiveToastText: document.getElementById('realtimeLiveToastText'),

        // Stats Overview
        statTotalParticipants: document.getElementById('statTotalParticipants'),
        statTotalVisits: document.getElementById('statTotalVisits'),
        statCompletedCount: document.getElementById('statCompletedCount'),
        statCompletedSub: document.getElementById('statCompletedSub'),
        statSouvenirCount: document.getElementById('statSouvenirCount'),
        statSouvenirSub: document.getElementById('statSouvenirSub'),
        statAvgVisits: document.getElementById('statAvgVisits'),

        // Leaderboard & Stand Recap
        prodiRecapGrid: document.getElementById('prodiRecapGrid'),
        btnSortProdiCount: document.getElementById('btnSortProdiCount'),
        btnSortProdiNumber: document.getElementById('btnSortProdiNumber'),

        // Table, Search & Filters
        searchInput: document.getElementById('searchInput'),
        schoolFilter: document.getElementById('schoolFilter'),
        statusFilter: document.getElementById('statusFilter'),
        sortOrderSelect: document.getElementById('sortOrderSelect'),
        pageSizeSelect: document.getElementById('pageSizeSelect'),
        paginationBar: document.getElementById('paginationBar'),
        paginationInfo: document.getElementById('paginationInfo'),
        currentPageText: document.getElementById('currentPageText'),
        btnPrevPage: document.getElementById('btnPrevPage'),
        btnNextPage: document.getElementById('btnNextPage'),
        participantsTableBody: document.getElementById('participantsTableBody'),
        tableRowCount: document.getElementById('tableRowCount'),

        // QR Cards Grid
        qrCardsGrid: document.getElementById('qrCardsGrid'),

        // Detail Modal
        participantDetailModal: document.getElementById('participantDetailModal'),
        btnCloseDetailModal: document.getElementById('btnCloseDetailModal'),
        detailStudentAvatar: document.getElementById('detailStudentAvatar'),
        detailStudentName: document.getElementById('detailStudentName'),
        detailStudentSchool: document.getElementById('detailStudentSchool'),
        detailStudentWa: document.getElementById('detailStudentWa'),
        detailVisitedCount: document.getElementById('detailVisitedCount'),
        detailVisitsList: document.getElementById('detailVisitsList'),
        detailSouvenirStatusText: document.getElementById('detailSouvenirStatusText'),
        detailSouvenirTime: document.getElementById('detailSouvenirTime'),
        btnModalToggleSouvenir: document.getElementById('btnModalToggleSouvenir'),

        // Toast
        toastBox: document.getElementById('toastBox'),
        toastIcon: document.getElementById('toastIcon'),
        toastMessage: document.getElementById('toastMessage')
    };

    // -------------------------------------------------------------------------
    // NOTIFICATION & TOAST HELPERS
    // -------------------------------------------------------------------------
    function showToast(message, type = 'info', duration = 3000) {
        if (!elements.toastBox) return;
        elements.toastMessage.textContent = message;
        elements.toastBox.className = `toast-box toast-${type} show`;
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'warning') icon = '⚠️';
        if (type === 'danger') icon = '❌';
        elements.toastIcon.textContent = icon;

        setTimeout(() => {
            elements.toastBox.classList.remove('show');
        }, duration);
    }

    // Floating Real-Time Incoming Event Banner
    function triggerRealtimePulseToast(message) {
        if (!elements.realtimeLiveToast) return;
        elements.realtimeLiveToastText.textContent = message;
        elements.realtimeLiveToast.style.display = 'flex';

        if (liveToastTimer) clearTimeout(liveToastTimer);
        liveToastTimer = setTimeout(() => {
            elements.realtimeLiveToast.style.display = 'none';
        }, 3500);
    }

    function formatTimeNow() {
        const d = new Date();
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')} WIB`;
    }

    function updateRealtimeIndicatorStatus(isLive, labelText = null) {
        if (!elements.realtimeStatusText || !elements.realtimeSyncTime) return;
        if (labelText) {
            elements.realtimeStatusText.textContent = labelText;
        } else {
            elements.realtimeStatusText.textContent = isLive ? 'Realtime Online' : 'Auto-Sync Aktif';
        }
        elements.realtimeSyncTime.textContent = `Sinkron ${formatTimeNow()}`;
    }

    // -------------------------------------------------------------------------
    // THEME CONTROLLER (FORMAL LIGHT / FORMAL DARK)
    // -------------------------------------------------------------------------
    function initTheme() {
        const savedTheme = localStorage.getItem('ADMIN_THEME_PREF') || 'theme-formal-light';
        applyTheme(savedTheme);

        if (elements.btnToggleTheme) {
            elements.btnToggleTheme.addEventListener('click', () => {
                const isCurrentDark = document.body.classList.contains('theme-formal-dark');
                const nextTheme = isCurrentDark ? 'theme-formal-light' : 'theme-formal-dark';
                applyTheme(nextTheme);
                localStorage.setItem('ADMIN_THEME_PREF', nextTheme);
            });
        }
    }

    function applyTheme(themeName) {
        document.body.classList.remove('theme-formal-light', 'theme-formal-dark');
        document.body.classList.add(themeName);

        if (elements.themeToggleIcon && elements.themeToggleText) {
            if (themeName === 'theme-formal-dark') {
                elements.themeToggleIcon.textContent = '☀️';
                elements.themeToggleText.textContent = 'Mode Terang';
            } else {
                elements.themeToggleIcon.textContent = '🌙';
                elements.themeToggleText.textContent = 'Mode Gelap';
            }
        }
    }

    // -------------------------------------------------------------------------
    // AUTHENTICATION GATE
    // -------------------------------------------------------------------------
    function checkAuth() {
        const isAuth = sessionStorage.getItem('ADMIN_AUTH_TOKEN') === 'VALID_ADMIN_SESSION';
        if (isAuth) {
            elements.adminPinGate.style.display = 'none';
            elements.adminDashboardContent.style.display = 'block';

            // Muat data awal
            loadAdminData();
            generateAllQRCards();

            // Jalankan Engine Real-Time
            initRealtimeEngine();
        } else {
            elements.adminPinGate.style.display = 'flex';
            elements.adminDashboardContent.style.display = 'none';
            stopRealtimeEngine();
        }
    }

    elements.formAdminPin.addEventListener('submit', (e) => {
        e.preventDefault();
        const pin = elements.adminPinInput.value.trim();
        if (pin === MASTER_ADMIN_PIN) {
            sessionStorage.setItem('ADMIN_AUTH_TOKEN', 'VALID_ADMIN_SESSION');
            showToast('PIN Benar. Selamat datang di Panel Administrator!', 'success');
            checkAuth();
        } else {
            showToast('PIN Salah! Silakan periksa kembali kode keamanan.', 'danger');
            elements.adminPinInput.value = '';
            elements.adminPinInput.focus();
        }
    });

    elements.btnLogoutAdmin.addEventListener('click', () => {
        if (confirm('Keluar dari sesi Administrator?')) {
            sessionStorage.removeItem('ADMIN_AUTH_TOKEN');
            stopRealtimeEngine();
            checkAuth();
        }
    });

    // -------------------------------------------------------------------------
    // REAL-TIME ENGINE (SUPABASE REPLICATION + BROADCASTCHANNEL + SMART POLLING)
    // Menjamin data update seketika tanpa refresh halaman!
    // -------------------------------------------------------------------------
    function initRealtimeEngine() {
        // 1. Supabase Postgres Realtime Subscription
        setupSupabaseRealtime();

        // 2. BroadcastChannel & Storage Event (Antar tab/jendela di browser yang sama: 0ms latensi)
        setupLocalBroadcast();

        // 3. Smart Background Auto-Sync Heartbeat (Setiap 3.5 detik)
        startSmartPolling();
    }

    function stopRealtimeEngine() {
        if (realtimeChannel && window.DataService && window.DataService.getSupabaseClient()) {
            try {
                window.DataService.getSupabaseClient().removeChannel(realtimeChannel);
            } catch (e) {}
            realtimeChannel = null;
        }

        if (smartPollingInterval) {
            clearInterval(smartPollingInterval);
            smartPollingInterval = null;
        }
    }

    function setupSupabaseRealtime() {
        const client = window.DataService ? window.DataService.getSupabaseClient() : null;
        if (!client) {
            updateRealtimeIndicatorStatus(true, 'Sinkron Lokal Online');
            return;
        }

        try {
            if (realtimeChannel) {
                client.removeChannel(realtimeChannel);
            }

            realtimeChannel = client.channel('admin-dashboard-realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, (payload) => {
                    handleRealtimeSignal('Peserta baru / data siswa diperbarui', payload);
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, (payload) => {
                    handleRealtimeSignal('Kunjungan stand baru tercatat', payload);
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        updateRealtimeIndicatorStatus(true, 'Realtime Server Online');
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        updateRealtimeIndicatorStatus(true, 'Auto-Sync Aktif');
                    }
                });
        } catch (err) {
            console.warn('Realtime channel init warning:', err);
            updateRealtimeIndicatorStatus(true, 'Auto-Sync Aktif');
        }
    }

    function setupLocalBroadcast() {
        try {
            if (window.BroadcastChannel) {
                const bc = new BroadcastChannel('pesona_pendidikan_realtime');
                bc.onmessage = (event) => {
                    const data = event.data || {};
                    let msg = 'Aktivitas kunjungan siswa baru';
                    if (data.action === 'RECORD_VISIT') {
                        msg = `Scan stand baru: ${data.payload?.prodiName || data.payload?.prodiCode || 'Prodi'}`;
                    } else if (data.action === 'REGISTER_PARTICIPANT') {
                        msg = `Siswa baru terdaftar: ${data.payload?.name || 'Peserta'}`;
                    } else if (data.action === 'CLAIM_SOUVENIR') {
                        msg = 'Status klaim souvenir diperbarui';
                    }
                    handleRealtimeSignal(msg, data);
                };
            }
        } catch (e) {}

        window.addEventListener('storage', (e) => {
            if (e.key === 'PESONA_DATA_SYNC_PULSE' || e.key === 'MOCK_PARTICIPANTS' || e.key === 'MOCK_VISITS') {
                handleRealtimeSignal('Data lokal diperbarui');
            }
        });
    }

    function startSmartPolling() {
        if (smartPollingInterval) clearInterval(smartPollingInterval);
        smartPollingInterval = setInterval(() => {
            // Jalankan silent sync di latar belakang
            if (sessionStorage.getItem('ADMIN_AUTH_TOKEN') === 'VALID_ADMIN_SESSION') {
                silentDataSync();
            }
        }, 3500);
    }

    let debounceSignalTimer = null;
    function handleRealtimeSignal(contextMessage, payload) {
        if (debounceSignalTimer) clearTimeout(debounceSignalTimer);
        debounceSignalTimer = setTimeout(async () => {
            triggerRealtimePulseToast(contextMessage);
            await loadAdminData(true);
        }, 250);
    }

    async function silentDataSync() {
        if (isFetchingData) return;
        try {
            await loadAdminData(true);
        } catch (e) {
            // silent fail
        }
    }

    // -------------------------------------------------------------------------
    // LOAD DATA UTAMA DARI SUPABASE / DATA SERVICE
    // -------------------------------------------------------------------------
    async function loadAdminData(isSilent = false) {
        if (isFetchingData) return;
        isFetchingData = true;

        try {
            // 1. Ambil Data Peserta Lengkap & Data Analisis secara paralel
            const [participantsData, analyticsData] = await Promise.all([
                window.DataService.getParticipantsForAdmin(),
                window.DataService.getAdminAnalytics()
            ]);

            // Hitung fingerprint untuk mendeteksi apakah data benar-benar berubah
            const newFingerprint = (participantsData || []).map(p => `${p.id}_${p.visit_count}_${p.souvenir_claimed}`).join('|') +
                                   `_tot_${analyticsData?.total_visits || 0}`;

            const hasChanged = newFingerprint !== lastDataFingerprint;
            lastDataFingerprint = newFingerprint;

            allParticipants = participantsData || [];
            allAnalytics = analyticsData || {};

            // Render komponen jika ada perubahan atau saat pemuatan awal
            if (hasChanged || !isSilent) {
                populateSchoolFilter(allParticipants);
                renderStatsOverview(allAnalytics);
                renderProdiRecap(allAnalytics.prodi_stats, allAnalytics.total_participants);
                renderParticipantsTable();

                // Perbarui modal jika sedang terbuka
                if (activeDetailParticipant) {
                    const refreshed = allParticipants.find(p => p.id === activeDetailParticipant.id);
                    if (refreshed) {
                        openParticipantDetail(refreshed);
                    } else {
                        elements.participantDetailModal.classList.remove('active');
                    }
                }
            }

            // Perbarui label waktu sinkronisasi
            updateRealtimeIndicatorStatus(true);

        } catch (err) {
            console.error('Error load admin data:', err);
            if (!isSilent) {
                showToast('Gagal memuat data dari server Supabase.', 'danger');
            }
        } finally {
            isFetchingData = false;
        }
    }

    // Helper: Resolusi warna prodi (Informatika = Merah #DC2626)
    function resolveProdiColor(prodiOrCode) {
        if (!prodiOrCode) return '#0284C7';
        const code = typeof prodiOrCode === 'string' ? prodiOrCode : (prodiOrCode.code || '');
        const name = typeof prodiOrCode === 'object' && prodiOrCode.name ? prodiOrCode.name : '';
        if (code === 'INF' || name.toLowerCase().includes('informatika')) {
            return '#DC2626'; // Merah Resmi untuk Informatika
        }
        return (typeof prodiOrCode === 'object' && prodiOrCode.color) ? prodiOrCode.color : '#0284C7';
    }

    // -------------------------------------------------------------------------
    // RENDER: 5 OVERVIEW STAT TILES (FORMAL HIGH-CONTRAST)
    // -------------------------------------------------------------------------
    function renderStatsOverview(analytics) {
        const totalP = analytics.total_participants || 0;
        const totalV = analytics.total_visits || 0;
        const completed = analytics.completed_participants || 0;
        const avg = totalP > 0 ? (totalV / totalP).toFixed(1) : '0.0';
        const completedPct = totalP > 0 ? ((completed / totalP) * 100).toFixed(1) : '0';

        // Hitung souvenir yang sudah diambil
        let souvenirCount = analytics.souvenir_claimed_count;
        if (souvenirCount === undefined) {
            souvenirCount = allParticipants.filter(p => p.souvenir_claimed).length;
        }

        elements.statTotalParticipants.textContent = totalP.toLocaleString('id-ID');
        elements.statTotalVisits.textContent = totalV.toLocaleString('id-ID');
        elements.statCompletedCount.textContent = completed.toLocaleString('id-ID');
        elements.statCompletedSub.textContent = `${completedPct}% dari total peserta terdaftar`;

        if (elements.statSouvenirCount) {
            elements.statSouvenirCount.textContent = souvenirCount.toLocaleString('id-ID');
            elements.statSouvenirSub.textContent = `${souvenirCount} dari ${completed} siswa selesai (100%)`;
        }

        elements.statAvgVisits.textContent = avg;
    }

    // -------------------------------------------------------------------------
    // RENDER: LEADERBOARD REKAP PER STAND PROGRAM STUDI
    // Progres yang diisi paling banyak otomatis berada di urutan paling atas!
    // -------------------------------------------------------------------------
    function renderProdiRecap(prodiStats, totalParticipants) {
        elements.prodiRecapGrid.innerHTML = '';

        // Ambil list prodi
        const prodiList = (prodiStats && prodiStats.length > 0)
            ? [...prodiStats]
            : window.PRODI_MASTER_DATA.map(p => ({ ...p, visitor_count: 0 }));

        // Urutkan: Paling banyak pengunjung di urutan teratas secara default
        prodiList.sort((a, b) => {
            if (prodiSortMode === 'most_visited') {
                const diff = (b.visitor_count || 0) - (a.visitor_count || 0);
                if (diff !== 0) return diff;
            }
            return (a.display_order || 0) - (b.display_order || 0);
        });

        prodiList.forEach((prodi, index) => {
            const count = prodi.visitor_count || 0;
            const pct = totalParticipants > 0 ? Math.min(100, Math.round((count / totalParticipants) * 100)) : 0;

            // Tentukan Rank Pill & Card Highlight Class
            let rankPillClass = 'rank-pill-default';
            let rankText = `#${index + 1}`;
            let cardRankClass = '';

            if (prodiSortMode === 'most_visited' && count > 0) {
                if (index === 0) {
                    rankPillClass = 'rank-pill-gold';
                    rankText = '🥇 #1 Terbanyak';
                    cardRankClass = 'rank-1';
                } else if (index === 1) {
                    rankPillClass = 'rank-pill-silver';
                    rankText = '🥈 #2';
                    cardRankClass = 'rank-2';
                } else if (index === 2) {
                    rankPillClass = 'rank-pill-bronze';
                    rankText = '🥉 #3';
                    cardRankClass = 'rank-3';
                } else {
                    rankText = `Peringkat #${index + 1}`;
                }
            } else if (prodiSortMode === 'stand_number') {
                rankText = `Stand #${prodi.display_order || index + 1}`;
            }

            const prodiColor = resolveProdiColor(prodi);

            const card = document.createElement('div');
            card.className = `prodi-stat-card ${cardRankClass}`;
            card.innerHTML = `
                <div class="prodi-card-header">
                    <span class="prodi-rank-pill ${rankPillClass}">
                        ${rankText}
                    </span>
                    <span class="prodi-code-badge" style="background: ${prodiColor}; color: #FFFFFF;">
                        ${prodi.code || 'PRODI'}
                    </span>
                </div>

                <div class="prodi-stat-body">
                    <div>
                        <div class="prodi-stat-name">${prodi.name}</div>
                        <div class="prodi-stat-meta">${pct}% dari total siswa terdaftar</div>
                    </div>
                    <div class="prodi-stat-count-wrap">
                        <div class="prodi-stat-count">${count}</div>
                        <div class="prodi-stat-pct">Pengunjung</div>
                    </div>
                </div>

                <div class="prodi-meter-track" title="${pct}% siswa telah mengunjungi">
                    <div class="prodi-meter-bar" style="width: ${pct}%; background: ${prodiColor};"></div>
                </div>
            `;
            elements.prodiRecapGrid.appendChild(card);
        });
    }

    // Toggle Mode Urutan Leaderboard Stand
    if (elements.btnSortProdiCount && elements.btnSortProdiNumber) {
        elements.btnSortProdiCount.addEventListener('click', () => {
            prodiSortMode = 'most_visited';
            elements.btnSortProdiCount.classList.add('active');
            elements.btnSortProdiNumber.classList.remove('active');
            renderProdiRecap(allAnalytics?.prodi_stats, allAnalytics?.total_participants || allParticipants.length);
        });

        elements.btnSortProdiNumber.addEventListener('click', () => {
            prodiSortMode = 'stand_number';
            elements.btnSortProdiNumber.classList.add('active');
            elements.btnSortProdiCount.classList.remove('active');
            renderProdiRecap(allAnalytics?.prodi_stats, allAnalytics?.total_participants || allParticipants.length);
        });
    }

    // -------------------------------------------------------------------------
    // FILTER SEKOLAH
    // -------------------------------------------------------------------------
    function populateSchoolFilter(participants) {
        const schools = [...new Set(participants.map(p => p.school).filter(Boolean))].sort();
        const currentSelected = elements.schoolFilter.value;

        elements.schoolFilter.innerHTML = '<option value="">Semua Asal Sekolah</option>';
        schools.forEach(sch => {
            const opt = document.createElement('option');
            opt.value = sch;
            opt.textContent = sch;
            if (sch === currentSelected) opt.selected = true;
            elements.schoolFilter.appendChild(opt);
        });
    }

    // -------------------------------------------------------------------------
    // RENDER: TABEL DATA PESERTA & PROGRES KUNJUNGAN
    // Progres yang diisi paling banyak otomatis di urutan paling atas!
    // -------------------------------------------------------------------------
    function renderParticipantsTable() {
        const searchTerm = elements.searchInput.value.toLowerCase().trim();
        const selectedSchool = elements.schoolFilter.value;
        const selectedStatus = elements.statusFilter.value;
        const sortVal = elements.sortOrderSelect ? elements.sortOrderSelect.value : 'progress_desc';
        participantSortOrder = sortVal;
        const pageSizeVal = elements.pageSizeSelect ? elements.pageSizeSelect.value : '15';

        // 1. Filter Peserta
        const filtered = allParticipants.filter(p => {
            const matchesSearch = !searchTerm ||
                (p.name && p.name.toLowerCase().includes(searchTerm)) ||
                (p.school && p.school.toLowerCase().includes(searchTerm)) ||
                (p.whatsapp && p.whatsapp.includes(searchTerm));

            const matchesSchool = !selectedSchool || p.school === selectedSchool;

            let matchesStatus = true;
            if (selectedStatus === 'complete') {
                matchesStatus = p.is_completed;
            } else if (selectedStatus === 'progress') {
                matchesStatus = !p.is_completed;
            } else if (selectedStatus === 'souvenir_pending') {
                matchesStatus = p.is_completed && !p.souvenir_claimed;
            } else if (selectedStatus === 'souvenir_claimed') {
                matchesStatus = Boolean(p.souvenir_claimed);
            }

            return matchesSearch && matchesSchool && matchesStatus;
        });

        // 2. Sorting Peserta: Default Progres Terbanyak (9 Stand duluan) di Atas!
        filtered.sort((a, b) => {
            if (participantSortOrder === 'progress_desc') {
                // Progres terbanyak di posisi teratas
                const diff = (b.visit_count || 0) - (a.visit_count || 0);
                if (diff !== 0) return diff;
                // Jika progres sama, siswa pendaftaran terbaru di atas
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            } else if (participantSortOrder === 'progress_asc') {
                const diff = (a.visit_count || 0) - (b.visit_count || 0);
                if (diff !== 0) return diff;
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            } else if (participantSortOrder === 'date_desc') {
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            } else if (participantSortOrder === 'date_asc') {
                return new Date(a.created_at || 0) - new Date(b.created_at || 0);
            } else if (participantSortOrder === 'name_asc') {
                return (a.name || '').localeCompare(b.name || '');
            }
            return 0;
        });

        elements.tableRowCount.textContent = filtered.length.toLocaleString('id-ID');
        elements.participantsTableBody.innerHTML = '';

        if (filtered.length === 0) {
            elements.participantsTableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
                        <div style="font-weight: 700; color: var(--text-heading);">Tidak ada data peserta yang cocok</div>
                        <div style="font-size: 0.8rem; margin-top: 0.25rem;">Coba sesuaikan kata kunci pencarian atau opsi filter Anda.</div>
                    </td>
                </tr>
            `;
            if (elements.paginationBar) elements.paginationBar.style.display = 'none';
            return;
        }

        // 3. Kalkulasi Pagination
        let pageItems = [];
        let totalPages = 1;
        let startIdx = 0;
        let endIdx = filtered.length;

        if (pageSizeVal === 'all') {
            pageItems = filtered;
            totalPages = 1;
            currentPage = 1;
        } else {
            const numSize = parseInt(pageSizeVal, 10) || 15;
            totalPages = Math.ceil(filtered.length / numSize) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;

            startIdx = (currentPage - 1) * numSize;
            endIdx = Math.min(startIdx + numSize, filtered.length);
            pageItems = filtered.slice(startIdx, endIdx);
        }

        // Perbarui Kontrol Pagination
        if (elements.paginationBar) {
            elements.paginationBar.style.display = 'flex';
            elements.paginationInfo.innerHTML = `Menampilkan <strong>${startIdx + 1} - ${endIdx}</strong> dari <strong>${filtered.length}</strong> peserta`;
            elements.currentPageText.textContent = `Hal ${currentPage} / ${totalPages}`;
            if (elements.btnPrevPage) elements.btnPrevPage.disabled = currentPage <= 1;
            if (elements.btnNextPage) elements.btnNextPage.disabled = currentPage >= totalPages;
        }

        // 4. Render Setiap Baris Tabel
        pageItems.forEach((p, idx) => {
            const row = document.createElement('tr');
            const rowNumber = startIdx + idx + 1;

            // Format Tanggal Pendaftaran
            let createdText = '-';
            if (p.created_at) {
                try {
                    const d = new Date(p.created_at);
                    createdText = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} WIB`;
                } catch {
                    createdText = '-';
                }
            }

            // Inisial Avatar
            const initialLetter = p.name ? p.name.trim().charAt(0).toUpperCase() : 'S';

            // Chips Stand Terkunjungi
            let chipsHtml = '';
            if (p.visits && p.visits.length > 0) {
                chipsHtml = `<div class="prodi-mini-chips">` +
                    p.visits.map(v => `<span class="prodi-chip" style="background: ${resolveProdiColor(v)};" title="${v.name}">${v.code || 'PRODI'}</span>`).join('') +
                    `</div>`;
            } else {
                chipsHtml = `<span style="font-size: 0.75rem; color: var(--text-dim); font-style: italic;">Belum ada kunjungan</span>`;
            }

            // Progres Kunjungan Pill
            const isDone = p.is_completed;
            const statusHtml = isDone
                ? `<span class="badge-pill badge-complete">✓ 9/9 Selesai (100%)</span>`
                : `<span class="badge-pill badge-progress">${p.visit_count || 0}/9 Stand</span>`;

            // Status Souvenir
            let souvenirHtml = '';
            if (isDone) {
                if (p.souvenir_claimed) {
                    let timeClaimText = '';
                    if (p.souvenir_claimed_at) {
                        try {
                            const ct = new Date(p.souvenir_claimed_at);
                            timeClaimText = ` ${ct.getHours().toString().padStart(2, '0')}:${ct.getMinutes().toString().padStart(2, '0')}`;
                        } catch {}
                    }
                    souvenirHtml = `
                        <div class="souvenir-claimed-wrap">
                            <span class="badge-souvenir-done" title="Souvenir telah diambil pada${timeClaimText} WIB">
                                ✓ Sudah Diambil${timeClaimText}
                            </span>
                            <button class="btn-unclaim-souvenir" data-id="${p.id}" data-name="${p.name}" title="Batalkan status souvenir">↺ Batal</button>
                        </div>
                    `;
                } else {
                    souvenirHtml = `
                        <button class="btn-claim-souvenir btn-claim-row" data-id="${p.id}" data-name="${p.name}" title="Klik untuk verifikasi pengambilan souvenir">
                            🎁 Ambil Souvenir
                        </button>
                    `;
                }
            } else {
                souvenirHtml = `
                    <span class="badge-souvenir-locked" title="Harus mengunjungi seluruh 9 stand program studi">
                        🔒 Belum Lengkap (${p.visit_count || 0}/9)
                    </span>
                `;
            }

            // Nomor WhatsApp Bersih
            const rawWa = p.whatsapp ? p.whatsapp.toString() : '';
            const waLink = rawWa.replace(/^0/, '62');

            row.innerHTML = `
                <td style="text-align: center; font-weight: 700; color: var(--text-muted);">${rowNumber}</td>
                <td>
                    <div class="student-cell">
                        <div class="student-avatar-pill">${initialLetter}</div>
                        <div>
                            <div class="student-name-text">${p.name}</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">Siswa Terdaftar</div>
                        </div>
                    </div>
                </td>
                <td style="color: var(--text-body); font-weight: 600;">${p.school || '-'}</td>
                <td>
                    <a href="https://wa.me/${waLink}" target="_blank" rel="noopener noreferrer" style="color: var(--brand-blue); text-decoration: none; font-weight: 600; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 0.25rem;" title="Hubungi via WhatsApp">
                        <span>💬</span> <span>${p.whatsapp || '-'}</span> <span>↗</span>
                    </a>
                </td>
                <td>${chipsHtml}</td>
                <td>${statusHtml}</td>
                <td style="text-align: center;">${souvenirHtml}</td>
                <td style="color: var(--text-muted); font-size: 0.76rem; white-space: nowrap;">${createdText}</td>
                <td style="text-align: center;">
                    <div class="action-btns-wrap">
                        <button class="btn-detail-row" data-id="${p.id}" title="Lihat Riwayat &amp; Status Souvenir Lengkap">
                            Detail
                        </button>
                        <button class="btn-delete-row" data-id="${p.id}" data-name="${p.name}" title="Hapus Data Peserta">
                            🗑️
                        </button>
                    </div>
                </td>
            `;

            elements.participantsTableBody.appendChild(row);
        });

        // Event listener Detail Button
        document.querySelectorAll('.btn-detail-row').forEach(btn => {
            btn.addEventListener('click', () => {
                const pId = btn.getAttribute('data-id');
                const participant = allParticipants.find(p => p.id === pId);
                if (participant) openParticipantDetail(participant);
            });
        });

        // Event listener Berikan Souvenir Button (Tabel)
        document.querySelectorAll('.btn-claim-row').forEach(btn => {
            btn.addEventListener('click', async () => {
                const pId = btn.getAttribute('data-id');
                const pName = btn.getAttribute('data-name');

                if (confirm(`Verifikasi bahwa siswa "${pName}" telah mengambil souvenir resmi di Stand Admin?`)) {
                    btn.disabled = true;
                    btn.innerHTML = `⏳ Menyimpan...`;

                    try {
                        const res = await window.DataService.claimSouvenir(pId, true);
                        if (res && res.success) {
                            showToast(`Souvenir untuk "${pName}" berhasil ditandai! 🎁`, 'success');
                            const target = allParticipants.find(p => p.id === pId);
                            if (target) {
                                target.souvenir_claimed = true;
                                target.souvenir_claimed_at = res.souvenir_claimed_at || new Date().toISOString();
                            }
                            renderParticipantsTable();
                            renderStatsOverview(allAnalytics || {});
                        } else {
                            showToast(res?.message || 'Gagal menandai souvenir.', 'danger');
                            btn.disabled = false;
                            btn.innerHTML = `🎁 Ambil Souvenir`;
                        }
                    } catch (err) {
                        console.error('Claim error:', err);
                        showToast('Terjadi kesalahan saat memproses status souvenir.', 'danger');
                        btn.disabled = false;
                        btn.innerHTML = `🎁 Ambil Souvenir`;
                    }
                }
            });
        });

        // Event listener Batalkan Souvenir Button (Tabel)
        document.querySelectorAll('.btn-unclaim-souvenir').forEach(btn => {
            btn.addEventListener('click', async () => {
                const pId = btn.getAttribute('data-id');
                const pName = btn.getAttribute('data-name');

                if (confirm(`Batalkan status klaim souvenir untuk siswa "${pName}"?`)) {
                    btn.disabled = true;

                    try {
                        const res = await window.DataService.claimSouvenir(pId, false);
                        if (res && res.success) {
                            showToast(`Status souvenir untuk "${pName}" telah dibatalkan.`, 'info');
                            const target = allParticipants.find(p => p.id === pId);
                            if (target) {
                                target.souvenir_claimed = false;
                                target.souvenir_claimed_at = null;
                            }
                            renderParticipantsTable();
                            renderStatsOverview(allAnalytics || {});
                        } else {
                            showToast(res?.message || 'Gagal membatalkan status souvenir.', 'danger');
                            btn.disabled = false;
                        }
                    } catch (err) {
                        console.error('Unclaim error:', err);
                        showToast('Terjadi kesalahan.', 'danger');
                        btn.disabled = false;
                    }
                }
            });
        });

        // Event listener Hapus Button (Tabel)
        document.querySelectorAll('.btn-delete-row').forEach(btn => {
            btn.addEventListener('click', async () => {
                const pId = btn.getAttribute('data-id');
                const pName = btn.getAttribute('data-name');

                if (confirm(`Apakah Anda yakin ingin menghapus data peserta "${pName}"?\n\nPerhatian: Seluruh riwayat kunjungan stand siswa ini akan ikut terhapus secara permanen.`)) {
                    btn.disabled = true;

                    try {
                        // Optimistic remove dari memori seketika
                        allParticipants = allParticipants.filter(p => p.id !== pId);
                        renderParticipantsTable();

                        const res = await window.DataService.deleteParticipant(pId);
                        if (res && res.success) {
                            showToast(`Data peserta "${pName}" berhasil dihapus.`, 'success');
                            // Refresh analytics dari server
                            allAnalytics = await window.DataService.getAdminAnalytics();
                            renderStatsOverview(allAnalytics);
                            renderProdiRecap(allAnalytics.prodi_stats, allAnalytics.total_participants);
                        } else {
                            showToast(res?.message || 'Gagal menghapus data di server.', 'danger');
                            await loadAdminData();
                        }
                    } catch (err) {
                        console.error('Delete error:', err);
                        showToast('Terjadi kesalahan saat menghapus data.', 'danger');
                        await loadAdminData();
                    }
                }
            });
        });
    }

    // -------------------------------------------------------------------------
    // DETAIL MODAL & SOUVENIR TOGGLE
    // -------------------------------------------------------------------------
    function openParticipantDetail(participant) {
        activeDetailParticipant = participant;

        if (elements.detailStudentAvatar) {
            elements.detailStudentAvatar.textContent = participant.name ? participant.name.charAt(0).toUpperCase() : 'S';
        }
        elements.detailStudentName.textContent = participant.name;
        elements.detailStudentSchool.textContent = `Asal Sekolah: ${participant.school}`;
        elements.detailStudentWa.textContent = `Nomor WhatsApp: ${participant.whatsapp}`;
        elements.detailVisitedCount.textContent = participant.visit_count || 0;

        // Render Status Souvenir di Modal
        if (elements.detailSouvenirStatusText) {
            if (participant.is_completed) {
                if (participant.souvenir_claimed) {
                    elements.detailSouvenirStatusText.textContent = '✅ Sudah Diambil';
                    elements.detailSouvenirStatusText.style.color = 'var(--success-emerald)';
                    let tStr = '-';
                    if (participant.souvenir_claimed_at) {
                        try {
                            const d = new Date(participant.souvenir_claimed_at);
                            tStr = d.toLocaleDateString('id-ID') + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                        } catch {}
                    }
                    elements.detailSouvenirTime.textContent = `Diverifikasi pada: ${tStr}`;
                    elements.btnModalToggleSouvenir.className = 'btn-unclaim-souvenir';
                    elements.btnModalToggleSouvenir.textContent = '↺ Batalkan Pengambilan Souvenir';
                    elements.btnModalToggleSouvenir.style.display = 'inline-block';
                    elements.btnModalToggleSouvenir.disabled = false;
                } else {
                    elements.detailSouvenirStatusText.textContent = '🎁 Belum Diambil (Berhak Menerima)';
                    elements.detailSouvenirStatusText.style.color = 'var(--warning-amber)';
                    elements.detailSouvenirTime.textContent = 'Siswa telah menyelesaikan seluruh 9 stand program studi.';
                    elements.btnModalToggleSouvenir.className = 'btn-claim-souvenir';
                    elements.btnModalToggleSouvenir.textContent = '🎁 Tandai Sudah Ambil Souvenir';
                    elements.btnModalToggleSouvenir.style.display = 'inline-block';
                    elements.btnModalToggleSouvenir.disabled = false;
                }
            } else {
                elements.detailSouvenirStatusText.textContent = '🔒 Belum Memenuhi Syarat (Belum 9 Stand)';
                elements.detailSouvenirStatusText.style.color = 'var(--text-muted)';
                elements.detailSouvenirTime.textContent = `Baru mengunjungi ${participant.visit_count || 0} dari 9 stand.`;
                elements.btnModalToggleSouvenir.className = 'btn-action-formal';
                elements.btnModalToggleSouvenir.textContent = 'Syarat Belum Terpenuhi';
                elements.btnModalToggleSouvenir.style.display = 'inline-block';
                elements.btnModalToggleSouvenir.disabled = true;
            }
        }

        elements.detailVisitsList.innerHTML = '';

        if (!participant.visits || participant.visits.length === 0) {
            elements.detailVisitsList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-dim); font-size: 0.85rem;">
                    Siswa ini belum memiliki catatan kunjungan ke stand manapun.
                </div>
            `;
        } else {
            participant.visits.forEach((v, i) => {
                let timeStr = '-';
                if (v.visited_at) {
                    try {
                        const d = new Date(v.visited_at);
                        timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                    } catch {}
                }

                const item = document.createElement('div');
                item.className = 'detail-visit-item';
                item.style.borderLeftColor = resolveProdiColor(v);
                item.innerHTML = `
                    <div>
                        <strong style="color: var(--text-heading); font-size: 0.86rem;">#${i + 1} - ${v.name}</strong>
                        <div style="font-size: 0.74rem; color: var(--text-muted);">Stand Program Studi: ${v.code || 'PRODI'}</div>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--success-emerald); font-weight: 700;">
                        ✓ ${timeStr}
                    </div>
                `;
                elements.detailVisitsList.appendChild(item);
            });
        }

        elements.participantDetailModal.classList.add('active');
    }

    // Event listener tombol toggle souvenir di Modal
    if (elements.btnModalToggleSouvenir) {
        elements.btnModalToggleSouvenir.addEventListener('click', async () => {
            if (!activeDetailParticipant) return;

            const isCurrentlyClaimed = Boolean(activeDetailParticipant.souvenir_claimed);
            const nextState = !isCurrentlyClaimed;
            const pName = activeDetailParticipant.name;

            const confirmMsg = nextState
                ? `Tandai bahwa siswa "${pName}" telah mengambil souvenir di Stand Admin?`
                : `Batalkan status pengambilan souvenir untuk siswa "${pName}"?`;

            if (confirm(confirmMsg)) {
                elements.btnModalToggleSouvenir.disabled = true;
                elements.btnModalToggleSouvenir.textContent = `⏳ Memproses...`;

                try {
                    const res = await window.DataService.claimSouvenir(activeDetailParticipant.id, nextState);
                    if (res && res.success) {
                        showToast(nextState ? `Souvenir "${pName}" berhasil diverifikasi! 🎁` : `Status souvenir dibatalkan.`, 'success');
                        activeDetailParticipant.souvenir_claimed = nextState;
                        activeDetailParticipant.souvenir_claimed_at = res.souvenir_claimed_at || (nextState ? new Date().toISOString() : null);

                        const target = allParticipants.find(p => p.id === activeDetailParticipant.id);
                        if (target) {
                            target.souvenir_claimed = nextState;
                            target.souvenir_claimed_at = activeDetailParticipant.souvenir_claimed_at;
                        }

                        openParticipantDetail(activeDetailParticipant);
                        renderParticipantsTable();
                        renderStatsOverview(allAnalytics || {});
                    } else {
                        showToast(res?.message || 'Gagal mengubah status souvenir.', 'danger');
                        elements.btnModalToggleSouvenir.disabled = false;
                    }
                } catch (err) {
                    console.error('Modal toggle souvenir error:', err);
                    showToast('Terjadi kesalahan saat memproses status.', 'danger');
                    elements.btnModalToggleSouvenir.disabled = false;
                }
            }
        });
    }

    elements.btnCloseDetailModal.addEventListener('click', () => {
        elements.participantDetailModal.classList.remove('active');
        activeDetailParticipant = null;
    });

    // -------------------------------------------------------------------------
    // EXPORT DATA KE EXCEL (.XLSX via SheetJS)
    // -------------------------------------------------------------------------
    elements.btnExportExcel.addEventListener('click', () => {
        if (!allParticipants || allParticipants.length === 0) {
            showToast('Tidak ada data peserta untuk di-export.', 'warning');
            return;
        }

        try {
            // Sheet 1: Data Peserta Lengkap
            const exportData = allParticipants.map((p, idx) => {
                const prodisVisited = (p.visits || []).map(v => v.name).join(', ');
                const souvenirStatus = p.souvenir_claimed
                    ? "SUDAH DIAMBIL"
                    : (p.is_completed ? "BELUM DIAMBIL (BERHAK)" : "BELUM LENGKAP");

                let souvenirTimeText = "-";
                if (p.souvenir_claimed_at) {
                    try {
                        souvenirTimeText = new Date(p.souvenir_claimed_at).toLocaleString('id-ID');
                    } catch {}
                }

                return {
                    "No": idx + 1,
                    "Nama Siswa": p.name,
                    "Asal Sekolah": p.school,
                    "Nomor WhatsApp": p.whatsapp,
                    "Total Stand Dikunjungi": p.visit_count || 0,
                    "Persentase Kunjungan": `${(((p.visit_count || 0) / 9) * 100).toFixed(1)}%`,
                    "Status Kunjungan Stand": p.is_completed ? "SELESAI (100%)" : "BELUM SELESAI",
                    "Status Souvenir": souvenirStatus,
                    "Waktu Pengambilan Souvenir": souvenirTimeText,
                    "Daftar Stand Terkunjungi": prodisVisited || "Belum ada kunjungan",
                    "Waktu Pendaftaran": p.created_at ? new Date(p.created_at).toLocaleString('id-ID') : "-"
                };
            });

            // Sheet 2: Rekap Per Stand Prodi
            const prodiData = (allAnalytics?.prodi_stats || window.PRODI_MASTER_DATA).map((pr, idx) => ({
                "Stand No": idx + 1,
                "Kode": pr.code,
                "Nama Program Studi": pr.name,
                "Jumlah Pengunjung": pr.visitor_count || 0,
                "Persentase dari Total Siswa": allParticipants.length > 0 
                    ? `${(((pr.visitor_count || 0) / allParticipants.length) * 100).toFixed(1)}%` 
                    : "0%"
            }));

            const wb = XLSX.utils.book_new();
            const ws1 = XLSX.utils.json_to_sheet(exportData);
            const ws2 = XLSX.utils.json_to_sheet(prodiData);

            XLSX.utils.book_append_sheet(wb, ws1, "Data Peserta & Souvenir");
            XLSX.utils.book_append_sheet(wb, ws2, "Rekap Stand Prodi");

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `Rekap_Kunjungan_Pesona_Pendidikan_${dateStr}.xlsx`);

            showToast('File spreadsheet Excel berhasil diunduh! 📄', 'success');
        } catch (err) {
            console.error('Export Excel failed:', err);
            showToast('Gagal mengekspor data ke Excel.', 'danger');
        }
    });

    // -------------------------------------------------------------------------
    // GENERATE PRINTABLE QR STAND CARDS
    // -------------------------------------------------------------------------
    function generateAllQRCards() {
        elements.qrCardsGrid.innerHTML = '';

        const currentBaseUrl = window.location.origin + window.location.pathname.replace(/admin\.html$/, '') + 'index.html';

        window.PRODI_MASTER_DATA.forEach((prodi, index) => {
            const card = document.createElement('div');
            card.className = 'printable-qr-card';

            const qrUrl = `${currentBaseUrl}?prodi=${prodi.code}`;
            const qrBoxId = `qr-canvas-${prodi.code}`;
            const prodiColor = resolveProdiColor(prodi);

            card.innerHTML = `
                <div class="printable-qr-header" style="text-align: center;">
                    <img src="img/logo-st-bhinneka.png" alt="ST Bhinneka" style="height: 52px; object-fit: contain; margin-bottom: 12px;"><br>
                    <h3 class="printable-title" style="color: ${prodiColor}; font-size: 2.2rem; margin-top: 0.35rem; margin-bottom: 0.25rem; font-weight: 800; line-height: 1.15; letter-spacing: -0.02em;">${prodi.name}</h3>
                    <p style="font-size: 0.95rem; color: #64748B; font-weight: 600;">Universitas Satya Terra Bhinneka</p>
                </div>

                <div class="printable-qr-box" id="${qrBoxId}"></div>

                <div class="printable-footer" style="text-align: center; width: 100%;">
                    <p style="font-weight: 800; color: #0F172A; font-size: 1rem; margin-bottom: 0.65rem;">Scan untuk Catat Kunjungan</p>
                    <button class="btn-action-formal btn-download-qr no-print" data-code="${prodi.code}" style="width: 100%; justify-content: center; font-weight: 700;">
                        📥 Unduh Gambar QR
                    </button>
                </div>
            `;

            elements.qrCardsGrid.appendChild(card);

            setTimeout(() => {
                const qrContainer = document.getElementById(qrBoxId);
                if (qrContainer && window.QRCode) {
                    new QRCode(qrContainer, {
                        text: qrUrl,
                        width: 180,
                        height: 180,
                        colorDark: "#0F172A",
                        colorLight: "#FFFFFF",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                }
            }, 100);
        });

        setTimeout(() => {
            document.querySelectorAll('.btn-download-qr').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const code = btn.getAttribute('data-code');
                    const prodi = window.PRODI_MASTER_DATA.find(p => p.code === code);
                    if (prodi) downloadSingleQRCode(prodi);
                });
            });
        }, 300);
    }

    function downloadSingleQRCode(prodi) {
        const qrContainer = document.getElementById(`qr-canvas-${prodi.code}`);
        if (!qrContainer) return;

        const srcCanvas = qrContainer.querySelector('canvas');
        const img = qrContainer.querySelector('img');

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 600;
        exportCanvas.height = 750;
        const ctx = exportCanvas.getContext('2d');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 600, 750);

        const prodiColor = resolveProdiColor(prodi);

        ctx.fillStyle = prodiColor;
        ctx.font = 'bold 48px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(prodi.name, 300, 85);

        ctx.fillStyle = '#64748B';
        ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Universitas Satya Terra Bhinneka', 300, 126);

        const qrSize = 400;
        const qrX = (600 - qrSize) / 2;
        const qrY = 160;

        if (srcCanvas) {
            ctx.drawImage(srcCanvas, qrX, qrY, qrSize, qrSize);
        } else if (img && img.src) {
            ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
        }

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Scan untuk Catat Kunjungan', 300, 630);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Pesona Pendidikan 2026', 300, 670);

        const link = document.createElement('a');
        link.download = `QR_${prodi.name.replace(/\s+/g, '_')}_ST_Bhinneka.png`;
        link.href = exportCanvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`QR Code ${prodi.name} berhasil diunduh! 📥`, 'success');
    }

    if (elements.btnDownloadAllQR) {
        elements.btnDownloadAllQR.addEventListener('click', () => {
            showToast('Mulai mengunduh seluruh 9 QR Code Stand...', 'info', 2500);
            window.PRODI_MASTER_DATA.forEach((prodi, idx) => {
                setTimeout(() => {
                    downloadSingleQRCode(prodi);
                }, idx * 350);
            });
        });
    }

    elements.btnPrintQRCards.addEventListener('click', () => {
        window.print();
    });

    // -------------------------------------------------------------------------
    // EVENT LISTENERS CONTROLS & FILTERS
    // -------------------------------------------------------------------------
    elements.btnRefreshData.addEventListener('click', () => {
        showToast('Memuat data terbaru dari server...', 'info', 1000);
        loadAdminData();
    });

    elements.searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderParticipantsTable();
    });

    elements.schoolFilter.addEventListener('change', () => {
        currentPage = 1;
        renderParticipantsTable();
    });

    elements.statusFilter.addEventListener('change', () => {
        currentPage = 1;
        renderParticipantsTable();
    });

    if (elements.sortOrderSelect) {
        elements.sortOrderSelect.addEventListener('change', () => {
            currentPage = 1;
            renderParticipantsTable();
        });
    }

    if (elements.pageSizeSelect) {
        elements.pageSizeSelect.addEventListener('change', () => {
            currentPage = 1;
            renderParticipantsTable();
        });
    }

    if (elements.btnPrevPage) {
        elements.btnPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderParticipantsTable();
            }
        });
    }

    if (elements.btnNextPage) {
        elements.btnNextPage.addEventListener('click', () => {
            currentPage++;
            renderParticipantsTable();
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === elements.participantDetailModal) {
            elements.participantDetailModal.classList.remove('active');
            activeDetailParticipant = null;
        }
    });

    // Inisialisasi awal saat halaman siap
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        checkAuth();
    });

})();
