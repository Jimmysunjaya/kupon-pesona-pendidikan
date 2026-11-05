/**
 * ADMIN.JS - CONTROLLER DASHBOARD PANITIA & ADMIN
 * Monitoring Statistik, Filter Peserta, Klaim Souvenir Stand Admin, Export Excel, dan Generator QR Code Stand
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

    // DOM Elements
    const elements = {
        adminPinGate: document.getElementById('adminPinGate'),
        adminDashboardContent: document.getElementById('adminDashboardContent'),
        formAdminPin: document.getElementById('formAdminPin'),
        adminPinInput: document.getElementById('adminPinInput'),
        btnLogoutAdmin: document.getElementById('btnLogoutAdmin'),
        btnRefreshData: document.getElementById('btnRefreshData'),
        btnExportExcel: document.getElementById('btnExportExcel'),
        btnDownloadAllQR: document.getElementById('btnDownloadAllQR'),
        btnPrintQRCards: document.getElementById('btnPrintQRCards'),

        // Stats Overview
        statTotalParticipants: document.getElementById('statTotalParticipants'),
        statTotalVisits: document.getElementById('statTotalVisits'),
        statCompletedCount: document.getElementById('statCompletedCount'),
        statCompletedSub: document.getElementById('statCompletedSub'),
        statSouvenirCount: document.getElementById('statSouvenirCount'),
        statSouvenirSub: document.getElementById('statSouvenirSub'),
        statAvgVisits: document.getElementById('statAvgVisits'),

        // Recap Grid
        prodiRecapGrid: document.getElementById('prodiRecapGrid'),

        // Table & Filters
        searchInput: document.getElementById('searchInput'),
        schoolFilter: document.getElementById('schoolFilter'),
        statusFilter: document.getElementById('statusFilter'),
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

    function showToast(message, type = 'info', duration = 3000) {
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

    // -------------------------------------------------------------------------
    // AUTHENTICATION GATE
    // -------------------------------------------------------------------------
    function checkAuth() {
        const isAuth = sessionStorage.getItem('ADMIN_AUTH_TOKEN') === 'VALID_ADMIN_SESSION';
        if (isAuth) {
            elements.adminPinGate.style.display = 'none';
            elements.adminDashboardContent.style.display = 'block';
            loadAdminData();
            generateAllQRCards();
        } else {
            elements.adminPinGate.style.display = 'block';
            elements.adminDashboardContent.style.display = 'none';
        }
    }

    elements.formAdminPin.addEventListener('submit', (e) => {
        e.preventDefault();
        const pin = elements.adminPinInput.value.trim();
        if (pin === MASTER_ADMIN_PIN) {
            sessionStorage.setItem('ADMIN_AUTH_TOKEN', 'VALID_ADMIN_SESSION');
            showToast('PIN Benar. Selamat datang Admin!', 'success');
            checkAuth();
        } else {
            showToast('PIN Salah! Silakan coba lagi.', 'danger');
            elements.adminPinInput.value = '';
            elements.adminPinInput.focus();
        }
    });

    elements.btnLogoutAdmin.addEventListener('click', () => {
        if (confirm('Keluar dari sesi Admin?')) {
            sessionStorage.removeItem('ADMIN_AUTH_TOKEN');
            checkAuth();
        }
    });

    // -------------------------------------------------------------------------
    // LOAD DATA DARI SUPABASE
    // -------------------------------------------------------------------------
    async function loadAdminData() {
        try {
            // 1. Ambil Data Peserta Lengkap
            allParticipants = await window.DataService.getParticipantsForAdmin();
            populateSchoolFilter(allParticipants);
            renderParticipantsTable();

            // 2. Ambil Analytics
            allAnalytics = await window.DataService.getAdminAnalytics();
            renderStatsOverview(allAnalytics);
            renderProdiRecap(allAnalytics.prodi_stats, allAnalytics.total_participants);

            // Perbarui modal jika sedang terbuka
            if (activeDetailParticipant) {
                const refreshed = allParticipants.find(p => p.id === activeDetailParticipant.id);
                if (refreshed) {
                    openParticipantDetail(refreshed);
                } else {
                    elements.participantDetailModal.classList.remove('active');
                }
            }

        } catch (err) {
            console.error('Error load admin data:', err);
            showToast('Gagal memuat data dari server Supabase.', 'danger');
        }
    }

    // Render 5 Overview Stat Tiles
    function renderStatsOverview(analytics) {
        const totalP = analytics.total_participants || 0;
        const totalV = analytics.total_visits || 0;
        const completed = analytics.completed_participants || 0;
        const avg = totalP > 0 ? (totalV / totalP).toFixed(1) : '0.0';
        const completedPct = totalP > 0 ? ((completed / totalP) * 100).toFixed(1) : '0';

        // Hitung siswa yang sudah ambil souvenir
        let souvenirCount = analytics.souvenir_claimed_count;
        if (souvenirCount === undefined) {
            souvenirCount = allParticipants.filter(p => p.souvenir_claimed).length;
        }

        elements.statTotalParticipants.textContent = totalP.toLocaleString();
        elements.statTotalVisits.textContent = totalV.toLocaleString();
        elements.statCompletedCount.textContent = completed.toLocaleString();
        elements.statCompletedSub.textContent = `${completedPct}% dari total peserta`;

        if (elements.statSouvenirCount) {
            elements.statSouvenirCount.textContent = souvenirCount.toLocaleString();
            elements.statSouvenirSub.textContent = `${souvenirCount} dari ${completed} siswa selesai`;
        }

        elements.statAvgVisits.textContent = avg;
    }

    // Render Rekap Per Stand Prodi
    function renderProdiRecap(prodiStats, totalParticipants) {
        elements.prodiRecapGrid.innerHTML = '';

        (prodiStats || []).forEach(prodi => {
            const count = prodi.visitor_count || 0;
            const pct = totalParticipants > 0 ? Math.min(100, Math.round((count / totalParticipants) * 100)) : 0;

            const card = document.createElement('div');
            card.className = 'prodi-stat-card';
            card.innerHTML = `
                <div class="prodi-stat-top">
                    <div>
                        <span style="font-size: 0.72rem; font-weight: 800; color: ${prodi.color}; letter-spacing: 0.05em;">${prodi.code}</span>
                        <div class="prodi-stat-name">${prodi.name}</div>
                    </div>
                    <div style="text-align: right;">
                        <span class="prodi-stat-count">${count}</span>
                        <div style="font-size: 0.72rem; color: #94A3B8;">${pct}% siswa</div>
                    </div>
                </div>
                <div class="prodi-meter-track">
                    <div class="prodi-meter-bar" style="width: ${pct}%; background: ${prodi.color};"></div>
                </div>
            `;
            elements.prodiRecapGrid.appendChild(card);
        });
    }

    // Populate Dropdown Filter Sekolah
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

    // Render Table Peserta dengan Pagination, Filter, Search, Souvenir & Aksi Hapus
    function renderParticipantsTable() {
        const searchTerm = elements.searchInput.value.toLowerCase().trim();
        const selectedSchool = elements.schoolFilter.value;
        const selectedStatus = elements.statusFilter.value;
        const pageSizeVal = elements.pageSizeSelect ? elements.pageSizeSelect.value : '15';

        // 1. Filter list
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
                // Selesai 9 stand tapi belum ambil souvenir
                matchesStatus = p.is_completed && !p.souvenir_claimed;
            } else if (selectedStatus === 'souvenir_claimed') {
                // Sudah ambil souvenir
                matchesStatus = Boolean(p.souvenir_claimed);
            }

            return matchesSearch && matchesSchool && matchesStatus;
        });

        elements.tableRowCount.textContent = filtered.length;
        elements.participantsTableBody.innerHTML = '';

        if (filtered.length === 0) {
            elements.participantsTableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 3rem 1rem; color: #64748B;">
                        Tidak ada data siswa yang cocok dengan filter.
                    </td>
                </tr>
            `;
            if (elements.paginationBar) elements.paginationBar.style.display = 'none';
            return;
        }

        // 2. Pagination calculation
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

        // Update pagination bar controls
        if (elements.paginationBar) {
            elements.paginationBar.style.display = 'flex';
            elements.paginationInfo.innerHTML = `Menampilkan <strong>${startIdx + 1} - ${endIdx}</strong> dari <strong>${filtered.length}</strong> peserta`;
            elements.currentPageText.textContent = `Hal ${currentPage} / ${totalPages}`;
            if (elements.btnPrevPage) elements.btnPrevPage.disabled = currentPage <= 1;
            if (elements.btnNextPage) elements.btnNextPage.disabled = currentPage >= totalPages;
        }

        // 3. Render rows
        pageItems.forEach((p, idx) => {
            const row = document.createElement('tr');
            const rowNumber = startIdx + idx + 1;

            // Format tanggal pendaftaran
            let createdText = '-';
            if (p.created_at) {
                try {
                    const d = new Date(p.created_at);
                    createdText = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                } catch {
                    createdText = '-';
                }
            }

            // Chips stand yang dikunjungi
            let chipsHtml = '';
            if (p.visits && p.visits.length > 0) {
                chipsHtml = `<div class="prodi-mini-chips">` +
                    p.visits.map(v => `<span class="prodi-chip" style="background: ${v.color || '#3B82F6'};" title="${v.name}">${v.code || 'PRODI'}</span>`).join('') +
                    `</div>`;
            } else {
                chipsHtml = `<span style="font-size: 0.75rem; color: #64748B;">Belum ada kunjungan</span>`;
            }

            const isDone = p.is_completed;
            const statusHtml = isDone
                ? `<span class="badge-pill badge-complete">✓ 9/9 Selesai</span>`
                : `<span class="badge-pill badge-progress">${p.visit_count || 0}/9 Stand</span>`;

            // HTML Status Souvenir
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
                            <span class="badge-souvenir-done" title="Souvenir telah diambil${timeClaimText}">
                                ✓ Sudah Diambil${timeClaimText}
                            </span>
                            <button class="btn-unclaim-souvenir" data-id="${p.id}" data-name="${p.name}" title="Batalkan status souvenir">↺ Batal</button>
                        </div>
                    `;
                } else {
                    souvenirHtml = `
                        <button class="btn-claim-souvenir btn-claim-row" data-id="${p.id}" data-name="${p.name}">
                            🎁 Ambil Souvenir
                        </button>
                    `;
                }
            } else {
                souvenirHtml = `
                    <span class="badge-souvenir-locked" title="Harus mengunjungi 9 stand terlebih dahulu">
                        🔒 Belum Lengkap (${p.visit_count || 0}/9)
                    </span>
                `;
            }

            row.innerHTML = `
                <td style="color: #64748B; font-weight: 600;">${rowNumber}</td>
                <td>
                    <strong style="color: #fff; font-size: 0.95rem;">${p.name}</strong>
                </td>
                <td style="color: #CBD5E1;">${p.school}</td>
                <td>
                    <a href="https://wa.me/${p.whatsapp.replace(/^0/, '62')}" target="_blank" style="color: #60A5FA; text-decoration: none; font-size: 0.85rem;" title="Chat WhatsApp">
                        ${p.whatsapp} ↗
                    </a>
                </td>
                <td>${chipsHtml}</td>
                <td>${statusHtml}</td>
                <td style="text-align: center;">${souvenirHtml}</td>
                <td style="color: #94A3B8; font-size: 0.8rem;">${createdText}</td>
                <td style="text-align: center;">
                    <div class="action-btns-wrap">
                        <button class="btn-admin btn-detail-row" data-id="${p.id}" title="Lihat Riwayat &amp; Status Souvenir">
                            Detail
                        </button>
                        <button class="btn-admin btn-delete-row" data-id="${p.id}" data-name="${p.name}" title="Hapus Data Peserta">
                            🗑️ Hapus
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

        // Event listener Beri Souvenir Button (Tabel)
        document.querySelectorAll('.btn-claim-row').forEach(btn => {
            btn.addEventListener('click', async () => {
                const pId = btn.getAttribute('data-id');
                const pName = btn.getAttribute('data-name');

                if (confirm(`Tandai bahwa siswa "${pName}" telah mengambil souvenir di Stand Admin?`)) {
                    btn.disabled = true;
                    btn.innerHTML = `⏳ Menyimpan...`;

                    try {
                        const res = await window.DataService.claimSouvenir(pId, true);
                        if (res && res.success) {
                            showToast(`Souvenir untuk "${pName}" berhasil ditandai! 🎁`, 'success');
                            // Update local state peserta langsung
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

                if (confirm(`Batalkan status pengambilan souvenir untuk siswa "${pName}"?`)) {
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
                    btn.innerHTML = `⏳ Menghapus...`;

                    try {
                        // 1. Hapus dari state memori seketika agar baris langsung hilang
                        allParticipants = allParticipants.filter(p => p.id !== pId);
                        renderParticipantsTable();

                        // 2. Kirim perintah hapus ke database Supabase & simpan ke blacklist ID
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

        elements.detailStudentName.textContent = participant.name;
        elements.detailStudentSchool.textContent = `Asal: ${participant.school}`;
        elements.detailStudentWa.textContent = `WhatsApp: ${participant.whatsapp}`;
        elements.detailVisitedCount.textContent = participant.visit_count || 0;

        // Render Status Souvenir di Modal
        if (elements.detailSouvenirStatusText) {
            if (participant.is_completed) {
                if (participant.souvenir_claimed) {
                    elements.detailSouvenirStatusText.textContent = '✅ Sudah Diambil';
                    elements.detailSouvenirStatusText.style.color = '#34D399';
                    let tStr = '-';
                    if (participant.souvenir_claimed_at) {
                        try {
                            const d = new Date(participant.souvenir_claimed_at);
                            tStr = d.toLocaleDateString('id-ID') + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                        } catch {}
                    }
                    elements.detailSouvenirTime.textContent = `Diambil pada: ${tStr}`;
                    elements.btnModalToggleSouvenir.className = 'btn-unclaim-souvenir';
                    elements.btnModalToggleSouvenir.textContent = '↺ Batalkan Pengambilan';
                    elements.btnModalToggleSouvenir.style.display = 'inline-block';
                    elements.btnModalToggleSouvenir.disabled = false;
                } else {
                    elements.detailSouvenirStatusText.textContent = '🎁 Belum Diambil (Berhak Menerima)';
                    elements.detailSouvenirStatusText.style.color = '#F59E0B';
                    elements.detailSouvenirTime.textContent = 'Siswa telah mengunjungi seluruh 9 stand program studi.';
                    elements.btnModalToggleSouvenir.className = 'btn-claim-souvenir';
                    elements.btnModalToggleSouvenir.textContent = '🎁 Tandai Sudah Ambil Souvenir';
                    elements.btnModalToggleSouvenir.style.display = 'inline-block';
                    elements.btnModalToggleSouvenir.disabled = false;
                }
            } else {
                elements.detailSouvenirStatusText.textContent = '🔒 Belum Memenuhi Syarat';
                elements.detailSouvenirStatusText.style.color = '#94A3B8';
                elements.detailSouvenirTime.textContent = `Baru mengunjungi ${participant.visit_count || 0} dari 9 stand.`;
                elements.btnModalToggleSouvenir.className = 'btn-admin';
                elements.btnModalToggleSouvenir.textContent = 'Belum Selesai 9 Stand';
                elements.btnModalToggleSouvenir.style.display = 'inline-block';
                elements.btnModalToggleSouvenir.disabled = true;
            }
        }

        elements.detailVisitsList.innerHTML = '';

        if (!participant.visits || participant.visits.length === 0) {
            elements.detailVisitsList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #64748B; font-size: 0.85rem;">
                    Siswa ini belum mengunjungi stand manapun.
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
                item.style.cssText = `
                    display: flex; justify-content: space-between; align-items: center;
                    background: #182030; padding: 0.65rem 0.85rem; border-radius: 6px;
                    border-left: 3px solid ${v.color || '#3B82F6'};
                `;
                item.innerHTML = `
                    <div>
                        <strong style="color: #fff; font-size: 0.85rem;">#${i + 1} - ${v.name}</strong>
                        <div style="font-size: 0.75rem; color: #94A3B8;">Kode: Stand ${v.code}</div>
                    </div>
                    <div style="font-size: 0.8rem; color: #34D399; font-weight: 600;">
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
                ? `Tandai bahwa "${pName}" telah mengambil souvenir?`
                : `Batalkan status pengambilan souvenir untuk "${pName}"?`;

            if (confirm(confirmMsg)) {
                elements.btnModalToggleSouvenir.disabled = true;
                elements.btnModalToggleSouvenir.textContent = `⏳ Memproses...`;

                try {
                    const res = await window.DataService.claimSouvenir(activeDetailParticipant.id, nextState);
                    if (res && res.success) {
                        showToast(nextState ? `Souvenir "${pName}" berhasil ditandai! 🎁` : `Status souvenir dibatalkan.`, 'success');
                        activeDetailParticipant.souvenir_claimed = nextState;
                        activeDetailParticipant.souvenir_claimed_at = res.souvenir_claimed_at || (nextState ? new Date().toISOString() : null);

                        // Sinkronkan ke daftar peserta
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
                    showToast('Terjadi kesalahan.', 'danger');
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
            XLSX.writeFile(wb, `Rekap_Kunjungan_Dan_Souvenir_${dateStr}.xlsx`);

            showToast('File Excel berhasil diunduh! 📄', 'success');
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

            card.innerHTML = `
                <div class="printable-qr-header">
                    <img src="img/logo-st-bhinneka.png" alt="ST Bhinneka" style="height: 44px; object-fit: contain; margin-bottom: 8px;"><br>
                    <h3 class="printable-title" style="color: ${prodi.color}; font-size: 1.35rem; margin-bottom: 0.2rem;">${prodi.name}</h3>
                    <p style="font-size: 0.85rem; color: #64748B; font-weight: 600;">Universitas Satya Terra Bhinneka</p>
                </div>

                <div class="printable-qr-box" id="${qrBoxId}"></div>

                <div class="printable-footer">
                    <p style="font-weight: 800; color: #1E293B; font-size: 0.95rem; margin-bottom: 0.65rem;">Scan untuk Catat Kunjungan</p>
                    <button class="btn-admin btn-download-qr no-print" data-code="${prodi.code}" style="background: #F0F7FD; color: #026CB6; border: 1.5px solid #BAE6FD; padding: 0.45rem 0.85rem; font-size: 0.8rem; font-weight: 700; border-radius: 8px; width: 100%; justify-content: center; cursor: pointer; transition: all 0.2s;">
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
                        colorDark: "#0B0E14",
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

        ctx.fillStyle = prodi.color || '#026CB6';
        ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(prodi.name, 300, 80);

        ctx.fillStyle = '#64748B';
        ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Universitas Satya Terra Bhinneka', 300, 118);

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
            showToast('Mulai mengunduh seluruh 9 QR Code...', 'info', 2500);
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
    // EVENT LISTENERS
    // -------------------------------------------------------------------------
    elements.btnRefreshData.addEventListener('click', () => {
        showToast('Memuat data terbaru...', 'info', 1000);
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

    // Run on startup
    document.addEventListener('DOMContentLoaded', checkAuth);

})();
