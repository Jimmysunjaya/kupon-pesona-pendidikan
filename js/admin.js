/**
 * ADMIN.JS - CONTROLLER DASHBOARD PANITIA & ADMIN
 * Statistik, Filter Peserta, Export Excel, dan Generator QR Code Stand
 */

(function () {
    'use strict';

    // Konfigurasi Master PIN Keamanan
    const MASTER_ADMIN_PIN = "admin123";

    // State Admin
    let allParticipants = [];
    let allAnalytics = null;
    let schoolsList = [];

    // DOM Elements
    const elements = {
        adminPinGate: document.getElementById('adminPinGate'),
        adminDashboardContent: document.getElementById('adminDashboardContent'),
        formAdminPin: document.getElementById('formAdminPin'),
        adminPinInput: document.getElementById('adminPinInput'),
        btnLogoutAdmin: document.getElementById('btnLogoutAdmin'),
        btnRefreshData: document.getElementById('btnRefreshData'),
        btnExportExcel: document.getElementById('btnExportExcel'),
        btnPrintQRCards: document.getElementById('btnPrintQRCards'),

        // Stats Overview
        statTotalParticipants: document.getElementById('statTotalParticipants'),
        statTotalVisits: document.getElementById('statTotalVisits'),
        statCompletedCount: document.getElementById('statCompletedCount'),
        statCompletedSub: document.getElementById('statCompletedSub'),
        statAvgVisits: document.getElementById('statAvgVisits'),

        // Recap Grid
        prodiRecapGrid: document.getElementById('prodiRecapGrid'),

        // Table & Filters
        searchInput: document.getElementById('searchInput'),
        schoolFilter: document.getElementById('schoolFilter'),
        statusFilter: document.getElementById('statusFilter'),
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
            showToast('Memuat data terbaru...', 'info', 1000);

            // 1. Ambil Analytics
            allAnalytics = await window.DataService.getAdminAnalytics();
            renderStatsOverview(allAnalytics);
            renderProdiRecap(allAnalytics.prodi_stats, allAnalytics.total_participants);

            // 2. Ambil Data Peserta Lengkap
            allParticipants = await window.DataService.getParticipantsForAdmin();
            populateSchoolFilter(allParticipants);
            renderParticipantsTable();

        } catch (err) {
            console.error('Error load admin data:', err);
            showToast('Gagal memuat data dari server Supabase.', 'danger');
        }
    }

    // Render 4 Overview Stat Tiles
    function renderStatsOverview(analytics) {
        const totalP = analytics.total_participants || 0;
        const totalV = analytics.total_visits || 0;
        const completed = analytics.completed_participants || 0;
        const avg = totalP > 0 ? (totalV / totalP).toFixed(1) : '0.0';
        const completedPct = totalP > 0 ? ((completed / totalP) * 100).toFixed(1) : '0';

        elements.statTotalParticipants.textContent = totalP.toLocaleString();
        elements.statTotalVisits.textContent = totalV.toLocaleString();
        elements.statCompletedCount.textContent = completed.toLocaleString();
        elements.statCompletedSub.textContent = `${completedPct}% dari total peserta`;
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
                        <span style="font-size: 0.7rem; font-weight: 700; color: ${prodi.color}; letter-spacing: 0.05em;">STAND ${prodi.code}</span>
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

    // Render Table Peserta dengan Filter & Search
    function renderParticipantsTable() {
        const searchTerm = elements.searchInput.value.toLowerCase().trim();
        const selectedSchool = elements.schoolFilter.value;
        const selectedStatus = elements.statusFilter.value;

        // Filter list
        const filtered = allParticipants.filter(p => {
            const matchesSearch = !searchTerm ||
                (p.name && p.name.toLowerCase().includes(searchTerm)) ||
                (p.school && p.school.toLowerCase().includes(searchTerm)) ||
                (p.whatsapp && p.whatsapp.includes(searchTerm));

            const matchesSchool = !selectedSchool || p.school === selectedSchool;

            const matchesStatus = !selectedStatus ||
                (selectedStatus === 'complete' && p.is_completed) ||
                (selectedStatus === 'progress' && !p.is_completed);

            return matchesSearch && matchesSchool && matchesStatus;
        });

        elements.tableRowCount.textContent = filtered.length;
        elements.participantsTableBody.innerHTML = '';

        if (filtered.length === 0) {
            elements.participantsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 3rem 1rem; color: #64748B;">
                        Tidak ada data siswa yang cocok dengan filter.
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach((p, idx) => {
            const row = document.createElement('tr');

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

            row.innerHTML = `
                <td style="color: #64748B; font-weight: 600;">${idx + 1}</td>
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
                <td style="color: #94A3B8; font-size: 0.8rem;">${createdText}</td>
                <td style="text-align: right;">
                    <button class="btn-admin btn-detail-row" data-id="${p.id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;">
                        Detail
                    </button>
                </td>
            `;

            elements.participantsTableBody.appendChild(row);
        });

        // Event listener detail button
        document.querySelectorAll('.btn-detail-row').forEach(btn => {
            btn.addEventListener('click', () => {
                const pId = btn.getAttribute('data-id');
                const participant = allParticipants.find(p => p.id === pId);
                if (participant) openParticipantDetail(participant);
            });
        });
    }

    // -------------------------------------------------------------------------
    // DETAIL MODAL
    // -------------------------------------------------------------------------
    function openParticipantDetail(participant) {
        elements.detailStudentName.textContent = participant.name;
        elements.detailStudentSchool.textContent = `Asal: ${participant.school}`;
        elements.detailStudentWa.textContent = `WhatsApp: ${participant.whatsapp}`;
        elements.detailVisitedCount.textContent = participant.visit_count || 0;

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

    elements.btnCloseDetailModal.addEventListener('click', () => {
        elements.participantDetailModal.classList.remove('active');
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
                return {
                    "No": idx + 1,
                    "Nama Siswa": p.name,
                    "Asal Sekolah": p.school,
                    "Nomor WhatsApp": p.whatsapp,
                    "Total Stand Dikunjungi": p.visit_count || 0,
                    "Persentase Kunjungan": `${(((p.visit_count || 0) / 9) * 100).toFixed(1)}%`,
                    "Status Selesai": p.is_completed ? "SELESAI (100%)" : "BELUM SELESAI",
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

            XLSX.utils.book_append_sheet(wb, ws1, "Data Peserta");
            XLSX.utils.book_append_sheet(wb, ws2, "Rekap Stand Prodi");

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `Rekap_Kunjungan_9_Prodi_${dateStr}.xlsx`);

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

        // Tentukan Base URL aplikasi saat ini untuk QR Code
        const currentBaseUrl = window.location.origin + window.location.pathname.replace(/admin\.html$/, '') + 'index.html';

        window.PRODI_MASTER_DATA.forEach((prodi, index) => {
            const card = document.createElement('div');
            card.className = 'printable-qr-card';

            const qrUrl = `${currentBaseUrl}?prodi=${prodi.code}`;
            const qrBoxId = `qr-canvas-${prodi.code}`;

            card.innerHTML = `
                <div class="printable-qr-header">
                    <img src="img/logo-st-bhinneka.png" alt="ST Bhinneka" style="height: 34px; object-fit: contain; margin-bottom: 6px;"><br>
                    <span class="printable-badge" style="background: ${prodi.color};">STAND #0${index + 1}</span>
                    <h3 class="printable-title">${prodi.name}</h3>
                    <p style="font-size: 0.8rem; color: #64748B; font-weight: 600;">Universitas Satya Terra Bhinneka</p>
                </div>

                <div class="printable-qr-box" id="${qrBoxId}"></div>

                <div class="printable-footer">
                    <p style="margin-bottom: 0.35rem; font-weight: 700; color: #1E293B;">Scan untuk Catat Kunjungan</p>
                    <p style="font-size: 0.72rem; color: #94A3B8;">Kode Manual: <strong>${prodi.code}</strong></p>
                </div>
            `;

            elements.qrCardsGrid.appendChild(card);

            // Render QR Code dengan QRCode.js
            setTimeout(() => {
                const qrContainer = document.getElementById(qrBoxId);
                if (qrContainer && window.QRCode) {
                    new QRCode(qrContainer, {
                        text: qrUrl,
                        width: 160,
                        height: 160,
                        colorDark: "#0B0E14",
                        colorLight: "#FFFFFF",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                }
            }, 100);
        });
    }

    elements.btnPrintQRCards.addEventListener('click', () => {
        window.print();
    });

    // -------------------------------------------------------------------------
    // EVENT LISTENERS
    // -------------------------------------------------------------------------
    elements.btnRefreshData.addEventListener('click', () => {
        loadAdminData();
    });

    elements.searchInput.addEventListener('input', () => {
        renderParticipantsTable();
    });

    elements.schoolFilter.addEventListener('change', () => {
        renderParticipantsTable();
    });

    elements.statusFilter.addEventListener('change', () => {
        renderParticipantsTable();
    });

    window.addEventListener('click', (e) => {
        if (e.target === elements.participantDetailModal) {
            elements.participantDetailModal.classList.remove('active');
        }
    });

    // Run on startup
    document.addEventListener('DOMContentLoaded', checkAuth);

})();

