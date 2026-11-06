-- ==============================================================================
-- SKEMA DATABASE SUPABASE: SISTEM QR CODE KUNJUNGAN 9 PROGRAM STUDI
-- Jalankan skrip ini langsung di "SQL Editor" Supabase Project Anda.
-- ==============================================================================

-- 1. Enable extension pgcrypto untuk UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Hapus tabel lama jika ada (Clean Slate)
DROP TABLE IF EXISTS public.visits CASCADE;
DROP TABLE IF EXISTS public.participants CASCADE;
DROP TABLE IF EXISTS public.study_programs CASCADE;

-- ------------------------------------------------------------------------------
-- TABEL: study_programs (9 Program Studi)
-- ------------------------------------------------------------------------------
CREATE TABLE public.study_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,            -- e.g. 'INF', 'BDG'
    name VARCHAR(100) NOT NULL,                  -- e.g. 'Informatika'
    faculty VARCHAR(100) DEFAULT '',
    icon VARCHAR(50) NOT NULL,                   -- Icon identifier
    color VARCHAR(20) NOT NULL,                  -- Hex color e.g. '#00D2FF'
    qr_token VARCHAR(64) UNIQUE NOT NULL,        -- Token rahasia unik untuk QR scan
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk lookup cepat saat scan QR
CREATE INDEX idx_study_programs_qr_token ON public.study_programs(qr_token);
CREATE INDEX idx_study_programs_code ON public.study_programs(code);

-- ------------------------------------------------------------------------------
-- TABEL: participants (Identitas Siswa)
-- ------------------------------------------------------------------------------
CREATE TABLE public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    school VARCHAR(150) NOT NULL,
    whatsapp VARCHAR(30) NOT NULL,
    session_token VARCHAR(64) UNIQUE NOT NULL,   -- Token unik di device siswa (localStorage)
    souvenir_claimed BOOLEAN DEFAULT FALSE,      -- Status pengambilan souvenir di Stand Admin
    souvenir_claimed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_participants_session ON public.participants(session_token);
CREATE INDEX idx_participants_school ON public.participants(school);

-- ------------------------------------------------------------------------------
-- TABEL: visits (Riwayat Kunjungan Stand Prodi)
-- ------------------------------------------------------------------------------
CREATE TABLE public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    study_program_id UUID NOT NULL REFERENCES public.study_programs(id) ON DELETE CASCADE,
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint unik: 1 siswa hanya bisa tercatat 1x untuk tiap program studi
    CONSTRAINT unique_participant_prodi_visit UNIQUE (participant_id, study_program_id)
);

CREATE INDEX idx_visits_participant ON public.visits(participant_id);
CREATE INDEX idx_visits_study_program ON public.visits(study_program_id);

-- ------------------------------------------------------------------------------
-- SEED DATA: 9 PROGRAM STUDI
-- ------------------------------------------------------------------------------
INSERT INTO public.study_programs (code, name, icon, color, qr_token, display_order) VALUES
('INF', 'Informatika', 'code', '#DC2626', 'QR_INF_PRODI_2026', 1),
('BDG', 'Bisnis Digital', 'trending-up', '#6366F1', 'QR_BDG_PRODI_2026', 2),
('KWU', 'Kewirausahaan', 'lightbulb', '#F59E0B', 'QR_KWU_PRODI_2026', 3),
('AGB', 'Agribisnis', 'shopping-bag', '#10B981', 'QR_AGB_PRODI_2026', 4),
('MHT', 'Manajemen Hutan', 'trees', '#059669', 'QR_MHT_PRODI_2026', 5),
('KBD', 'Kebidanan', 'heart-pulse', '#EC4899', 'QR_KBD_PRODI_2026', 6),
('AGT', 'Agroteknologi', 'sprout', '#84CC16', 'QR_AGT_PRODI_2026', 7),
('PGSD', 'PGSD', 'graduation-cap', '#3B82F6', 'QR_PGSD_PRODI_2026', 8),
('TP', 'Teknologi Pendidikan', 'sparkles', '#8B5CF6', 'QR_TP_PRODI_2026', 9);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.study_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- 1. study_programs: Publik dapat membaca data prodi
CREATE POLICY "Public read study_programs"
ON public.study_programs FOR SELECT
USING (true);

-- 2. participants: Read, Insert, Update & Delete
CREATE POLICY "Public read participants"
ON public.participants FOR SELECT
USING (true);

CREATE POLICY "Public insert participants"
ON public.participants FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update participants"
ON public.participants FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete participants"
ON public.participants FOR DELETE
USING (true);

-- 3. visits: Read, Insert, Update & Delete
CREATE POLICY "Public read visits"
ON public.visits FOR SELECT
USING (true);

CREATE POLICY "Public insert visits"
ON public.visits FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update visits"
ON public.visits FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete visits"
ON public.visits FOR DELETE
USING (true);

-- ------------------------------------------------------------------------------
-- DATABASE FUNCTIONS (RPC) YANG AMAN
-- Mencegah manipulasi client-side & menjamin integritas transaksi
-- ------------------------------------------------------------------------------

-- FUNCTION: Mencatat kunjungan siswa secara atomik dan aman
CREATE OR REPLACE FUNCTION public.record_prodi_visit(
    p_session_token TEXT,
    p_qr_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_participant RECORD;
    v_prodi RECORD;
    v_existing_visit UUID;
    v_new_visit_id UUID;
    v_total_visits INT;
    v_total_prodi INT := 9;
BEGIN
    -- 1. Validasi keberadaan peserta berdasarkan session_token
    SELECT * INTO v_participant FROM public.participants 
    WHERE session_token = p_session_token 
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'UNREGISTERED',
            'message', 'Identitas siswa tidak ditemukan. Silakan registrasi terlebih dahulu.'
        );
    END IF;

    -- 2. Validasi QR token prodi (bisa berupa qr_token atau kode prodi)
    SELECT * INTO v_prodi FROM public.study_programs 
    WHERE qr_token = p_qr_token OR code = UPPER(p_qr_token)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'INVALID_QR',
            'message', 'QR Code tidak valid atau Program Studi tidak terdaftar.'
        );
    END IF;

    -- 3. Cek apakah sudah pernah mengunjungi prodi ini
    SELECT id INTO v_existing_visit FROM public.visits
    WHERE participant_id = v_participant.id AND study_program_id = v_prodi.id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'ALREADY_VISITED',
            'message', 'Kamu sudah pernah mengunjungi stand ' || v_prodi.name || '!',
            'prodi', jsonb_build_object(
                'id', v_prodi.id,
                'code', v_prodi.code,
                'name', v_prodi.name,
                'color', v_prodi.color,
                'icon', v_prodi.icon
            )
        );
    END IF;

    -- 4. Simpan kunjungan baru
    INSERT INTO public.visits (participant_id, study_program_id, visited_at)
    VALUES (v_participant.id, v_prodi.id, NOW())
    RETURNING id INTO v_new_visit_id;

    -- Update last active peserta
    UPDATE public.participants 
    SET last_active = NOW() 
    WHERE id = v_participant.id;

    -- Hitung total kunjungan terkini siswa ini
    SELECT COUNT(*) INTO v_total_visits FROM public.visits
    WHERE participant_id = v_participant.id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'SUCCESS',
        'message', 'Kunjungan ke stand ' || v_prodi.name || ' berhasil dicatat!',
        'prodi', jsonb_build_object(
            'id', v_prodi.id,
            'code', v_prodi.code,
            'name', v_prodi.name,
            'color', v_prodi.color,
            'icon', v_prodi.icon
        ),
        'stats', jsonb_build_object(
            'total_visited', v_total_visits,
            'total_prodi', v_total_prodi,
            'percentage', ROUND((v_total_visits::NUMERIC / v_total_prodi::NUMERIC) * 100, 1),
            'is_completed', (v_total_visits >= v_total_prodi),
            'souvenir_claimed', COALESCE(v_participant.souvenir_claimed, FALSE),
            'souvenir_claimed_at', v_participant.souvenir_claimed_at
        )
    );
END;
$$;

-- FUNCTION: Mengambil status kunjungan siswa lengkap
CREATE OR REPLACE FUNCTION public.get_participant_status(p_session_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_participant RECORD;
    v_prodi_list JSONB;
    v_total_visits INT;
    v_total_prodi INT := 9;
BEGIN
    SELECT * INTO v_participant FROM public.participants 
    WHERE session_token = p_session_token 
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'registered', false,
            'message', 'Belum registrasi'
        );
    END IF;

    -- Ambil daftar semua prodi beserta status visit peserta
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', sp.id,
            'code', sp.code,
            'name', sp.name,
            'color', sp.color,
            'icon', sp.icon,
            'display_order', sp.display_order,
            'is_visited', (v.id IS NOT NULL),
            'visited_at', v.visited_at
        ) ORDER BY sp.display_order ASC
    ) INTO v_prodi_list
    FROM public.study_programs sp
    LEFT JOIN public.visits v 
        ON v.study_program_id = sp.id AND v.participant_id = v_participant.id
    WHERE sp.is_active = TRUE;

    -- Total kunjungan
    SELECT COUNT(*) INTO v_total_visits FROM public.visits
    WHERE participant_id = v_participant.id;

    RETURN jsonb_build_object(
        'registered', true,
        'participant', jsonb_build_object(
            'id', v_participant.id,
            'name', v_participant.name,
            'school', v_participant.school,
            'whatsapp', v_participant.whatsapp,
            'created_at', v_participant.created_at,
            'souvenir_claimed', COALESCE(v_participant.souvenir_claimed, FALSE),
            'souvenir_claimed_at', v_participant.souvenir_claimed_at
        ),
        'prodis', v_prodi_list,
        'stats', jsonb_build_object(
            'total_visited', v_total_visits,
            'total_prodi', v_total_prodi,
            'percentage', ROUND((v_total_visits::NUMERIC / v_total_prodi::NUMERIC) * 100, 1),
            'is_completed', (v_total_visits >= v_total_prodi),
            'souvenir_claimed', COALESCE(v_participant.souvenir_claimed, FALSE),
            'souvenir_claimed_at', v_participant.souvenir_claimed_at
        )
    );
END;
$$;

-- FUNCTION: Statistik lengkap untuk Dashboard Admin
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_participants INT;
    v_total_visits INT;
    v_completed_count INT;
    v_souvenir_count INT;
    v_prodi_stats JSONB;
    v_schools_list JSONB;
BEGIN
    -- Total peserta
    SELECT COUNT(*) INTO v_total_participants FROM public.participants;

    -- Total kunjungan keseluruhan
    SELECT COUNT(*) INTO v_total_visits FROM public.visits;

    -- Siswa yang telah menyelesaikan 9 prodi
    SELECT COUNT(*) INTO v_completed_count FROM (
        SELECT participant_id 
        FROM public.visits 
        GROUP BY participant_id 
        HAVING COUNT(*) >= 9
    ) completed_sub;

    -- Siswa yang sudah mengambil souvenir
    SELECT COUNT(*) INTO v_souvenir_count 
    FROM public.participants 
    WHERE souvenir_claimed = TRUE;

    -- Rekap per prodi
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', sp.id,
            'code', sp.code,
            'name', sp.name,
            'color', sp.color,
            'icon', sp.icon,
            'qr_token', sp.qr_token,
            'display_order', sp.display_order,
            'visitor_count', COALESCE(v_count.total, 0)
        ) ORDER BY sp.display_order ASC
    ) INTO v_prodi_stats
    FROM public.study_programs sp
    LEFT JOIN (
        SELECT study_program_id, COUNT(*) AS total
        FROM public.visits
        GROUP BY study_program_id
    ) v_count ON v_count.study_program_id = sp.id
    WHERE sp.is_active = TRUE;

    -- Daftar sekolah unik untuk filter
    SELECT jsonb_agg(DISTINCT school ORDER BY school ASC)
    INTO v_schools_list
    FROM public.participants
    WHERE school IS NOT NULL AND school <> '';

    RETURN jsonb_build_object(
        'total_participants', v_total_participants,
        'total_visits', v_total_visits,
        'completed_participants', v_completed_count,
        'souvenir_claimed_count', v_souvenir_count,
        'prodi_stats', v_prodi_stats,
        'schools', COALESCE(v_schools_list, '[]'::jsonb)
    );
END;
$$;

-- FUNCTION: Hapus peserta secara aman (Admin - SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.delete_participant(p_participant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.visits WHERE participant_id = p_participant_id;
    DELETE FROM public.participants WHERE id = p_participant_id;
    RETURN true;
END;
$$;

-- FUNCTION: Klaim / Batalkan Souvenir (Stand Admin - SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.claim_souvenir(
    p_participant_id UUID,
    p_claimed BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_participant RECORD;
    v_visit_count INT;
    v_claimed_at TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_participant FROM public.participants WHERE id = p_participant_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Data peserta tidak ditemukan di database.'
        );
    END IF;

    IF p_claimed THEN
        SELECT COUNT(*) INTO v_visit_count FROM public.visits WHERE participant_id = p_participant_id;
        IF v_visit_count < 9 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Siswa belum menyelesaikan seluruh 9 stand prodi (' || v_visit_count || '/9). Souvenir hanya dapat diberikan jika sudah full 9 stand.'
            );
        END IF;

        v_claimed_at := NOW();
        UPDATE public.participants 
        SET souvenir_claimed = TRUE, souvenir_claimed_at = v_claimed_at 
        WHERE id = p_participant_id;
    ELSE
        v_claimed_at := NULL;
        UPDATE public.participants 
        SET souvenir_claimed = FALSE, souvenir_claimed_at = NULL 
        WHERE id = p_participant_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'souvenir_claimed', p_claimed,
        'souvenir_claimed_at', v_claimed_at,
        'message', CASE WHEN p_claimed THEN 'Souvenir berhasil ditandai telah diambil!' ELSE 'Status souvenir berhasil dibatalkan.' END
    );
END;
$$;

-- Grant izin eksekusi ke peran public/anon
GRANT EXECUTE ON FUNCTION public.delete_participant(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_souvenir(UUID, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_participant_status(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_prodi_visit(TEXT, TEXT) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- REALTIME REPLICATION (SUPABASE REALTIME)
-- Mengaktifkan broadcast realtime untuk tabel participants & visits
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'visits'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

