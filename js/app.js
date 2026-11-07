/**
 * APP.JS - STUDENT APPLICATION CONTROLLER
 * Logika Registrasi, Dashboard Siswa, HTML5 QR Scanner, dan Validasi Kunjungan
 */

(function () {
    'use strict';

    // State Aplikasi
    let currentParticipant = null;
    let currentProdis = [];
    let currentStats = { total_visited: 0, total_prodi: 9, percentage: 0 };
    let html5QrCodeScanner = null;
    let isScanning = false;

    // DOM Elements
    const elements = {
        loadingView: document.getElementById('loadingView'),
        registrationView: document.getElementById('registrationView'),
        dashboardView: document.getElementById('dashboardView'),
        
        // Registration Form
        formRegistration: document.getElementById('formRegistration'),
        regName: document.getElementById('regName'),
        regSchool: document.getElementById('regSchool'),
        regGrade: document.getElementById('regGrade'),
        regWhatsapp: document.getElementById('regWhatsapp'),
        btnSubmitReg: document.getElementById('btnSubmitReg'),

        // Student Profile
        studentAvatar: document.getElementById('studentAvatar'),
        studentName: document.getElementById('studentName'),
        studentSchool: document.getElementById('studentSchool'),
        btnSwitchStudent: document.getElementById('btnSwitchStudent'),

        // Progress & Souvenir Voucher
        statVisitedCount: document.getElementById('statVisitedCount'),
        statPercentage: document.getElementById('statPercentage'),
        progressBarFill: document.getElementById('progressBarFill'),
        completionBanner: document.getElementById('completionBanner'),
        souvenirBannerIcon: document.getElementById('souvenirBannerIcon'),
        souvenirBannerTitle: document.getElementById('souvenirBannerTitle'),
        souvenirBannerDesc: document.getElementById('souvenirBannerDesc'),
        souvenirStatusBadge: document.getElementById('souvenirStatusBadge'),
        voucherStudentName: document.getElementById('voucherStudentName'),
        voucherStudentSchool: document.getElementById('voucherStudentSchool'),
        voucherActionNote: document.getElementById('voucherActionNote'),
        btnCheckSouvenirStatus: document.getElementById('btnCheckSouvenirStatus'),

        // Prodi Grid
        prodiGrid: document.getElementById('prodiGrid'),

        // Scanner Modal
        scannerModal: document.getElementById('scannerModal'),
        btnOpenScanner: document.getElementById('btnOpenScanner'),
        btnCloseScanner: document.getElementById('btnCloseScanner'),
        btnToggleManual: document.getElementById('btnToggleManual'),
        formManualCode: document.getElementById('formManualCode'),
        inputManualCode: document.getElementById('inputManualCode'),

        // Result Modal
        resultModal: document.getElementById('resultModal'),
        resultModalIcon: document.getElementById('resultModalIcon'),
        resultModalTitle: document.getElementById('resultModalTitle'),
        resultModalDesc: document.getElementById('resultModalDesc'),
        btnCloseResult: document.getElementById('btnCloseResult'),

        // Toast
        toastBox: document.getElementById('toastBox'),
        toastIcon: document.getElementById('toastIcon'),
        toastMessage: document.getElementById('toastMessage'),

        // Config Modal
        configModal: document.getElementById('configModal'),
        btnOpenConfig: document.getElementById('btnOpenConfig'),
        btnCloseConfig: document.getElementById('btnCloseConfig'),
        formConfig: document.getElementById('formConfig'),
        cfgUrl: document.getElementById('cfgUrl'),
        cfgKey: document.getElementById('cfgKey'),
        btnResetConfig: document.getElementById('btnResetConfig'),
        configStatusBadge: document.getElementById('configStatusBadge')
    };

    // Mapping Icon SVG Crisp untuk 9 Program Studi
    const PRODI_ICONS = {
        'code': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
        'trending-up': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
        'lightbulb': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>`,
        'shopping-bag': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
        'trees': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0a3 3 0 0 1-1.1-5.8V10a5 5 0 0 1 9.8-1.5"></path><path d="M7 21v-5"></path><path d="M16 8.2A3 3 0 0 1 14.9 14H12v0a3 3 0 0 1-1.1-5.8V8a5 5 0 0 1 9.8-1.5"></path><path d="M15 21v-7"></path></svg>`,
        'heart-pulse': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"></path></svg>`,
        'sprout': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"></path><path d="M10 20c5.5-2.5.8-6.4 3-10"></path><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4.1 5.5.8z"></path><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"></path></svg>`,
        'graduation-cap': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>`,
        'sparkles': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>`
    };

    // -------------------------------------------------------------------------
    // UTILITY FUNCTIONS
    // -------------------------------------------------------------------------
    function showToast(message, type = 'info', duration = 3500) {
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

    function hexToRgba(hex, alpha) {
        let c;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split('');
            if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            c = '0x' + c.join('');
            return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
        }
        return `rgba(59, 130, 246, ${alpha})`;
    }

    function triggerCelebration() {
        if (window.confetti) {
            window.confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    // Ekstraksi parameter token dari URL jika user scan pakai kamera HP langsung
    function extractTokenFromQueryOrText(input) {
        if (!input) return '';
        const trimmed = input.trim();

        // Jika berupa URL lengkap
        try {
            if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                const url = new URL(trimmed);
                const tokenParam = url.searchParams.get('prodi') || 
                                   url.searchParams.get('visit') || 
                                   url.searchParams.get('token') || 
                                   url.searchParams.get('stand');
                if (tokenParam) return tokenParam.toUpperCase();
            }
        } catch (e) {
            // bukan URL valid
        }

        // Jika langsung token/kode
        return trimmed.toUpperCase();
    }

    // -------------------------------------------------------------------------
    // INITIALIZATION & CHECK SESSION
    // -------------------------------------------------------------------------
    async function initApp() {
        // Cek URL query parameter saat pertama kali buka
        const urlParams = new URLSearchParams(window.location.search);
        const queryProdi = urlParams.get('prodi') || urlParams.get('visit') || urlParams.get('stand');

        const sessionToken = localStorage.getItem('STUDENT_SESSION_TOKEN');

        if (!sessionToken) {
            // Belum terdaftar
            if (queryProdi) {
                // Simpan kunjungan tertunda
                sessionStorage.setItem('PENDING_VISIT_TOKEN', queryProdi);
                showToast(`Silakan registrasi dulu untuk mencatat kunjungan ke stand ${queryProdi.toUpperCase()}!`, 'warning', 5000);
            }
            showRegistrationView();
        } else {
            // Sudah terdaftar di browser ini
            await loadStudentDashboard(sessionToken);

            // Jika ada query scan saat buka halaman
            if (queryProdi) {
                // Bersihkan query string dari URL tanpa reload
                window.history.replaceState({}, document.title, window.location.pathname);
                await handleVisitRecording(queryProdi);
            }
        }
    }

    function showRegistrationView() {
        elements.loadingView.style.display = 'none';
        elements.dashboardView.style.display = 'none';
        elements.registrationView.style.display = 'block';
    }

    function showDashboardView() {
        elements.loadingView.style.display = 'none';
        elements.registrationView.style.display = 'none';
        elements.dashboardView.style.display = 'block';
    }

    // -------------------------------------------------------------------------
    // LOAD & RENDER DASHBOARD
    // -------------------------------------------------------------------------
    async function loadStudentDashboard(sessionToken) {
        elements.loadingView.style.display = 'block';

        try {
            const data = await window.DataService.getParticipantStatus(sessionToken);

            if (!data || !data.registered) {
                // Token tidak valid di DB / belum registrasi
                localStorage.removeItem('STUDENT_SESSION_TOKEN');
                showRegistrationView();
                return;
            }

            currentParticipant = data.participant;
            currentProdis = data.prodis || window.PRODI_MASTER_DATA;
            currentStats = data.stats || { total_visited: 0, total_prodi: 9, percentage: 0 };

            renderProfile(currentParticipant);
            renderStats(currentStats);
            renderProdiGrid(currentProdis);

            showDashboardView();

            // Cek jika ada pending visit setelah baru saja registrasi
            const pending = sessionStorage.getItem('PENDING_VISIT_TOKEN');
            if (pending) {
                sessionStorage.removeItem('PENDING_VISIT_TOKEN');
                setTimeout(() => handleVisitRecording(pending), 400);
            }

        } catch (err) {
            console.error('Gagal memuat dashboard:', err);
            showToast('Gagal memuat data dari server. Periksa koneksi.', 'danger');
            showDashboardView();
        }
    }

    function renderProfile(participant) {
        if (!participant) return;
        const initial = participant.name ? participant.name.charAt(0).toUpperCase() : 'S';
        elements.studentAvatar.textContent = initial;
        elements.studentName.textContent = participant.name;
        const gradeText = participant.grade ? ` • ${participant.grade}` : '';
        elements.studentSchool.textContent = `${participant.school}${gradeText} • ${participant.whatsapp || ''}`;
        if (elements.voucherStudentSchool) {
            elements.voucherStudentSchool.textContent = `${participant.school}${gradeText}`;
        }
    }

    function renderStats(stats) {
        const visited = stats.total_visited || 0;
        const total = stats.total_prodi || 9;
        const pct = stats.percentage !== undefined ? stats.percentage : ((visited / total) * 100).toFixed(1);

        elements.statVisitedCount.textContent = visited;
        elements.statPercentage.textContent = pct;
        elements.progressBarFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;

        // Completion Banner & Souvenir Voucher
        if (visited >= total) {
            elements.completionBanner.classList.add('show');

            if (elements.voucherStudentName) {
                elements.voucherStudentName.textContent = currentParticipant?.name || 'Siswa Peserta';
            }
            if (elements.voucherStudentSchool) {
                elements.voucherStudentSchool.textContent = currentParticipant?.school || '';
            }

            const isSouvenirClaimed = Boolean(currentParticipant?.souvenir_claimed || stats?.souvenir_claimed);

            if (isSouvenirClaimed) {
                const itemName = currentParticipant?.souvenir_item || stats?.souvenir_item || 'Souvenir Resmi';
                let itemIcon = '🎁';
                const lower = itemName.toLowerCase();
                if (lower.includes('mug')) itemIcon = '☕';
                else if (lower.includes('pulpen')) itemIcon = '🖊️';
                else if (lower.includes('notebook') || lower.includes('buku')) itemIcon = '📓';
                else if (lower.includes('ganci') || lower.includes('kunci')) itemIcon = '🔑';

                if (elements.souvenirStatusBadge) {
                    elements.souvenirStatusBadge.className = 'voucher-status-pill status-claimed';
                    elements.souvenirStatusBadge.innerHTML = `✓ Diterima: ${itemIcon} ${itemName}`;
                }
                if (elements.souvenirBannerIcon) {
                    elements.souvenirBannerIcon.textContent = itemIcon;
                }
                if (elements.souvenirBannerTitle) {
                    elements.souvenirBannerTitle.textContent = `Souvenir Berhasil Diterima (${itemName})!`;
                }
                if (elements.souvenirBannerDesc) {
                    let timeClaim = '';
                    if (currentParticipant?.souvenir_claimed_at) {
                        try {
                            const d = new Date(currentParticipant.souvenir_claimed_at);
                            timeClaim = ` pada pukul ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} WIB`;
                        } catch {}
                    }
                    elements.souvenirBannerDesc.textContent = `Selamat! Hadiah "${itemName}" kamu telah diserahkan oleh panitia di Stand Admin${timeClaim}. Terima kasih telah mengunjungi seluruh 9 Stand Program Studi ST Bhinneka!`;
                }
                if (elements.voucherActionNote) {
                    elements.voucherActionNote.textContent = `Status: ${itemIcon} ${itemName} sudah diserahkan di Stand Admin`;
                }
            } else {
                if (elements.souvenirStatusBadge) {
                    elements.souvenirStatusBadge.className = 'voucher-status-pill status-pending';
                    elements.souvenirStatusBadge.innerHTML = '🎁 Belum Diambil';
                }
                if (elements.souvenirBannerIcon) {
                    elements.souvenirBannerIcon.textContent = '🏆';
                }
                if (elements.souvenirBannerTitle) {
                    elements.souvenirBannerTitle.textContent = 'Luar Biasa! Semua Stand Telah Dikunjungi!';
                }
                if (elements.souvenirBannerDesc) {
                    elements.souvenirBannerDesc.textContent = 'Kamu telah menyelesaikan seluruh 9 kunjungan Program Studi. Tunjukkan kupon ini ke panitia di Stand Admin untuk mengambil merchandise & hadiah!';
                }
                if (elements.voucherActionNote) {
                    elements.voucherActionNote.textContent = 'Tunjukkan ke Stand Admin untuk klaim souvenir';
                }
            }
        } else {
            elements.completionBanner.classList.remove('show');
        }
    }

    // Render 9 Kartu Program Studi dalam Grid 3 Kolom
    function renderProdiGrid(prodis) {
        elements.prodiGrid.innerHTML = '';

        prodis.forEach((prodi, index) => {
            const isVisited = Boolean(prodi.is_visited);
            const card = document.createElement('div');
            
            // Kelas Card: unvisited atau visited
            card.className = `prodi-card ${isVisited ? 'visited' : 'unvisited'}`;
            
            // Atur CSS variable untuk warna khas prodi ketika dikunjungi
            card.style.setProperty('--prodi-color', prodi.color);
            card.style.setProperty('--prodi-color-glow', hexToRgba(prodi.color, 0.4));
            card.style.setProperty('--prodi-color-bg', hexToRgba(prodi.color, 0.15));

            const iconSvg = PRODI_ICONS[prodi.icon] || PRODI_ICONS['code'];

            // Format tanggal kunjungan jika ada
            let timeText = 'Belum dikunjungi';
            if (isVisited && prodi.visited_at) {
                try {
                    const d = new Date(prodi.visited_at);
                    timeText = `✓ Dikunjungi ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} WIB`;
                } catch {
                    timeText = '✓ Selesai dikunjungi';
                }
            } else if (isVisited) {
                timeText = '✓ Selesai dikunjungi';
            }

            card.innerHTML = `
                <div class="prodi-card-header">
                    <div class="prodi-icon-wrapper">
                        ${iconSvg}
                    </div>
                    <div class="prodi-badge">
                        ${isVisited ? '✓ Terkunjungi' : 'Belum'}
                    </div>
                </div>
                <div class="prodi-card-body">
                    <h4 class="prodi-name">${prodi.name}</h4>
                </div>
                <div class="prodi-card-footer">
                    <span class="visit-time-text">${timeText}</span>
                    <span style="font-size: 0.75rem; color: #64748B;">#0${index + 1}</span>
                </div>
            `;

            elements.prodiGrid.appendChild(card);
        });
    }

    // -------------------------------------------------------------------------
    // RECORD VISIT (SCAN LOGIC & NOTIFICATION)
    // -------------------------------------------------------------------------
    async function handleVisitRecording(rawToken) {
        const token = extractTokenFromQueryOrText(rawToken);
        if (!token) {
            showToast('QR Code kosong atau tidak terbaca!', 'warning');
            return;
        }

        const sessionToken = localStorage.getItem('STUDENT_SESSION_TOKEN');
        if (!sessionToken) {
            sessionStorage.setItem('PENDING_VISIT_TOKEN', token);
            showRegistrationView();
            showToast('Silakan registrasi dulu sebelum scan stand!', 'warning');
            return;
        }

        // Haptic feedback jika didukung device
        if (navigator.vibrate) {
            navigator.vibrate([80, 40, 80]);
        }

        showToast('Memverifikasi QR Code stand...', 'info', 1500);

        try {
            const result = await window.DataService.recordVisit(sessionToken, token);

            if (result.success) {
                // Kunjungan Sukses!
                triggerCelebration();
                showResultModal(
                    '🎉',
                    'Kunjungan Berhasil!',
                    `Stand <strong>${result.prodi?.name || token}</strong> berhasil dicatat! Terus jelajahi stand lainnya.`
                );

                // Reload data dashboard
                await loadStudentDashboard(sessionToken);

                // Jika sudah 9/9 selesai
                if (result.stats && result.stats.is_completed) {
                    setTimeout(() => {
                        triggerCelebration();
                        showToast('🏆 SELAMAT! Kamu telah mengunjungi seluruh 9 Program Studi!', 'success', 6000);
                    }, 1200);
                }

            } else if (result.status === 'ALREADY_VISITED') {
                // Sudah pernah dikunjungi
                showResultModal(
                    'ℹ️',
                    'Sudah Pernah Dikunjungi!',
                    result.message || `Kamu sudah pernah mencatat kunjungan ke stand ${result.prodi?.name || token}. Silakan kunjungi stand prodi yang belum dikunjungi!`
                );
            } else {
                // Gagal atau QR tidak valid
                showToast(result.message || 'QR Code tidak valid!', 'danger', 4000);
            }

        } catch (err) {
            console.error('Error saat mencatat kunjungan:', err);
            showToast('Terjadi kesalahan saat menghubungi server.', 'danger');
        }
    }

    function showResultModal(icon, title, descHtml) {
        elements.resultModalIcon.textContent = icon;
        elements.resultModalTitle.textContent = title;
        elements.resultModalDesc.innerHTML = descHtml;
        elements.resultModal.classList.add('active');
    }

    // -------------------------------------------------------------------------
    // HTML5 QR CODE SCANNER CONTROLLER
    // -------------------------------------------------------------------------
    async function startScanner() {
        elements.scannerModal.classList.add('active');

        if (!html5QrCodeScanner) {
            html5QrCodeScanner = new Html5Qrcode("qr-reader");
        }

        isScanning = true;

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };

        try {
            // Buka kamera belakang (environment)
            await html5QrCodeScanner.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                onScanFailure
            );
        } catch (err) {
            console.warn('Gagal buka kamera environment, mencoba kamera default...', err);
            try {
                // Coba device apapun jika facingMode environment ditolak browser
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length) {
                    const cameraId = devices[devices.length - 1].id;
                    await html5QrCodeScanner.start(cameraId, config, onScanSuccess, onScanFailure);
                } else {
                    showToast('Tidak ada kamera yang terdeteksi. Gunakan input manual.', 'warning', 4000);
                }
            } catch (cameraErr) {
                console.error('Kamera gagal dibuka:', cameraErr);
                showToast('Izin kamera ditolak. Silakan masukkan kode stand secara manual.', 'warning', 4000);
                elements.formManualCode.classList.add('open');
            }
        }
    }

    async function stopScanner() {
        if (html5QrCodeScanner && isScanning) {
            try {
                await html5QrCodeScanner.stop();
            } catch (e) {
                // abaikan
            }
            isScanning = false;
        }
        elements.scannerModal.classList.remove('active');
    }

    function onScanSuccess(decodedText) {
        // Hentikan scanner segera agar tidak scan berulang kali
        stopScanner();
        handleVisitRecording(decodedText);
    }

    function onScanFailure(error) {
        // frame scan biasa tanpa QR, abaikan
    }

    // -------------------------------------------------------------------------
    // EVENT LISTENERS
    // -------------------------------------------------------------------------

    // Filter input nomor WhatsApp hanya angka / integer (panjang bebas)
    if (elements.regWhatsapp) {
        elements.regWhatsapp.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }

    // 1. Submit Form Registrasi
    elements.formRegistration.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = elements.regName.value.trim();
        const school = elements.regSchool.value.trim();
        const grade = elements.regGrade ? elements.regGrade.value.trim() : 'Kelas 10';
        const rawWhatsapp = elements.regWhatsapp.value.trim();
        const whatsapp = rawWhatsapp.replace(/[^0-9]/g, '');

        if (!name || !school || !grade || !whatsapp) {
            showToast('Harap lengkapi semua data formulir dengan nomor HP angka!', 'warning');
            return;
        }

        elements.btnSubmitReg.disabled = true;
        elements.btnSubmitReg.innerHTML = `<span class="spinner"></span> <span>Mendaftarkan...</span>`;

        try {
            const res = await window.DataService.registerParticipant(name, school, grade, whatsapp);

            if (res.success) {
                showToast(`Selamat datang, ${name}! Registrasi berhasil.`, 'success');
                await loadStudentDashboard(res.sessionToken);
            } else {
                showToast(res.message || 'Gagal registrasi.', 'danger');
            }
        } catch (err) {
            console.error('Registration submit error:', err);
            showToast('Terjadi kesalahan saat registrasi.', 'danger');
        } finally {
            elements.btnSubmitReg.disabled = false;
            elements.btnSubmitReg.innerHTML = `<span>Mulai Kunjungan Stand</span> <span>🚀</span>`;
        }
    });

    // 2. Ganti Siswa / Reset Device
    elements.btnSwitchStudent.addEventListener('click', () => {
        if (confirm('Apakah kamu yakin ingin berganti siswa? Data kunjungan device ini akan keluar.')) {
            localStorage.removeItem('STUDENT_SESSION_TOKEN');
            localStorage.removeItem('STUDENT_NAME');
            showRegistrationView();
            showToast('Silakan daftarkan siswa baru.', 'info');
        }
    });

    // 3. Open & Close Scanner
    elements.btnOpenScanner.addEventListener('click', startScanner);
    elements.btnCloseScanner.addEventListener('click', stopScanner);

    // 4. Toggle & Submit Manual Code
    elements.btnToggleManual.addEventListener('click', () => {
        elements.formManualCode.classList.toggle('open');
        if (elements.formManualCode.classList.contains('open')) {
            elements.inputManualCode.focus();
        }
    });

    elements.formManualCode.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = elements.inputManualCode.value.trim();
        if (code) {
            stopScanner();
            handleVisitRecording(code);
            elements.inputManualCode.value = '';
        }
    });

    // 5. Result Modal Close
    if (elements.btnCloseResult) {
        elements.btnCloseResult.addEventListener('click', () => {
            elements.resultModal.classList.remove('active');
        });
    }

    // 6. Supabase Config Modal (Hanya jika elemen ada)
    if (elements.btnOpenConfig) {
        elements.btnOpenConfig.addEventListener('click', () => {
            const isLive = window.DataService.isLive();
            if (elements.configStatusBadge) {
                elements.configStatusBadge.style.display = 'block';
                if (isLive) {
                    elements.configStatusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
                    elements.configStatusBadge.style.color = '#34D399';
                    elements.configStatusBadge.innerHTML = '🟢 <strong>Terhubung ke Supabase Live!</strong>';
                } else {
                    elements.configStatusBadge.style.background = 'rgba(245, 158, 11, 0.15)';
                    elements.configStatusBadge.style.color = '#FBBF24';
                    elements.configStatusBadge.innerHTML = '🟡 <strong>Mode Demo / Simulasi Aktif</strong> (Data tersimpan di localStorage browser ini).';
                }
            }

            if (elements.cfgUrl) elements.cfgUrl.value = localStorage.getItem('APP_SUPABASE_URL') || '';
            if (elements.cfgKey) elements.cfgKey.value = localStorage.getItem('APP_SUPABASE_ANON_KEY') || '';
            if (elements.configModal) elements.configModal.classList.add('active');
        });
    }

    if (elements.btnCloseConfig) {
        elements.btnCloseConfig.addEventListener('click', () => {
            if (elements.configModal) elements.configModal.classList.remove('active');
        });
    }

    if (elements.formConfig) {
        elements.formConfig.addEventListener('submit', (e) => {
            e.preventDefault();
            const url = elements.cfgUrl.value.trim();
            const key = elements.cfgKey.value.trim();
            window.DataService.saveCredentials(url, key);
        });
    }

    if (elements.btnResetConfig) {
        elements.btnResetConfig.addEventListener('click', () => {
            if (confirm('Reset kredensial Supabase ke bawaan file?')) {
                window.DataService.clearCredentials();
            }
        });
    }

    // Close modal on click outside
    window.addEventListener('click', (e) => {
        if (e.target === elements.scannerModal) stopScanner();
        if (e.target === elements.resultModal) elements.resultModal.classList.remove('active');
        if (elements.configModal && e.target === elements.configModal) elements.configModal.classList.remove('active');
    });

    // 7. Periksa Status Klaim Souvenir
    if (elements.btnCheckSouvenirStatus) {
        elements.btnCheckSouvenirStatus.addEventListener('click', async () => {
            const token = localStorage.getItem('STUDENT_SESSION_TOKEN');
            if (token) {
                showToast('Memeriksa status klaim souvenir terbaru...', 'info', 1200);
                await loadStudentDashboard(token);
                if (currentParticipant?.souvenir_claimed) {
                    triggerCelebration();
                    showToast('✅ Souvenir kamu telah terverifikasi sudah diambil!', 'success', 3000);
                } else {
                    showToast('Status: Belum diambil. Silakan datang ke Stand Admin!', 'info', 3000);
                }
            }
        });
    }

    // Auto-refresh status saat siswa kembali membuka layar web ini
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            const token = localStorage.getItem('STUDENT_SESSION_TOKEN');
            if (token && currentStats && currentStats.total_visited >= 9) {
                loadStudentDashboard(token);
            }
        }
    });

    // Run on page ready
    document.addEventListener('DOMContentLoaded', initApp);

})();

