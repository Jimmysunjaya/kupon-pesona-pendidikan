-- ==============================================================================
-- MIGRATION: FITUR SPIN KLAIM HADIAH & REKAP SOUVENIR STAND ADMIN
-- Universitas Satya Terra Bhinneka - Pesona Pendidikan 2026
-- Jalankan skrip ini langsung di menu "SQL Editor" Supabase Project Anda!
-- ==============================================================================

-- 1. Tambahkan kolom jenis souvenir ke tabel participants (jika belum ada)
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS souvenir_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS souvenir_claimed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS souvenir_item TEXT DEFAULT NULL;

-- 2. Pastikan RLS mengizinkan operasi UPDATE untuk anon/public
DROP POLICY IF EXISTS "Public update participants" ON public.participants;
CREATE POLICY "Public update participants"
ON public.participants FOR UPDATE
USING (true)
WITH CHECK (true);

-- 3. Stored Procedure: Tandai / Batalkan Pengambilan Souvenir dengan Jenis Hadiah
CREATE OR REPLACE FUNCTION public.claim_souvenir(
    p_participant_id UUID,
    p_claimed BOOLEAN DEFAULT TRUE,
    p_souvenir_item TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_participant RECORD;
    v_visit_count INT;
    v_claimed_at TIMESTAMPTZ;
    v_item_name TEXT;
BEGIN
    -- Validasi peserta
    SELECT * INTO v_participant FROM public.participants WHERE id = p_participant_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Data peserta tidak ditemukan di database.'
        );
    END IF;

    IF p_claimed THEN
        -- Hitung total kunjungan stand
        SELECT COUNT(*) INTO v_visit_count FROM public.visits WHERE participant_id = p_participant_id;
        IF v_visit_count < 9 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Siswa belum menyelesaikan seluruh 9 stand prodi (' || v_visit_count || '/9). Hadiah souvenir hanya dapat diberikan jika sudah full 9 stand.'
            );
        END IF;

        v_claimed_at := NOW();
        v_item_name := COALESCE(p_souvenir_item, v_participant.souvenir_item, 'Souvenir');

        UPDATE public.participants 
        SET souvenir_claimed = TRUE, 
            souvenir_claimed_at = v_claimed_at,
            souvenir_item = v_item_name
        WHERE id = p_participant_id;
    ELSE
        v_claimed_at := NULL;
        v_item_name := NULL;

        UPDATE public.participants 
        SET souvenir_claimed = FALSE, 
            souvenir_claimed_at = NULL,
            souvenir_item = NULL
        WHERE id = p_participant_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'souvenir_claimed', p_claimed,
        'souvenir_claimed_at', v_claimed_at,
        'souvenir_item', v_item_name,
        'message', CASE WHEN p_claimed THEN 'Souvenir (' || COALESCE(v_item_name, 'Souvenir') || ') berhasil diserahkan!' ELSE 'Status souvenir berhasil dibatalkan.' END
    );
END;
$$;

-- 4. Update Stored Procedure: get_participant_status (Sertakan souvenir_item)
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
            'souvenir_claimed_at', v_participant.souvenir_claimed_at,
            'souvenir_item', v_participant.souvenir_item
        ),
        'prodis', v_prodi_list,
        'stats', jsonb_build_object(
            'total_visited', v_total_visits,
            'total_prodi', v_total_prodi,
            'percentage', ROUND((v_total_visits::NUMERIC / v_total_prodi::NUMERIC) * 100, 1),
            'is_completed', (v_total_visits >= v_total_prodi),
            'souvenir_claimed', COALESCE(v_participant.souvenir_claimed, FALSE),
            'souvenir_claimed_at', v_participant.souvenir_claimed_at,
            'souvenir_item', v_participant.souvenir_item
        )
    );
END;
$$;

-- 5. Update Stored Procedure: get_admin_analytics (Sertakan rekapitulasi souvenir)
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
    v_souvenir_breakdown JSONB;
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

    -- Breakdown jenis souvenir yang keluar
    SELECT jsonb_object_agg(COALESCE(souvenir_item, 'Lainnya'), count)
    INTO v_souvenir_breakdown
    FROM (
        SELECT COALESCE(souvenir_item, 'Lainnya') AS souvenir_item, COUNT(*) as count
        FROM public.participants
        WHERE souvenir_claimed = TRUE
        GROUP BY COALESCE(souvenir_item, 'Lainnya')
    ) s_sub;

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
        'souvenir_breakdown', COALESCE(v_souvenir_breakdown, '{}'::jsonb),
        'prodi_stats', v_prodi_stats,
        'schools', COALESCE(v_schools_list, '[]'::jsonb)
    );
END;
$$;

-- 6. Grant izin eksekusi ke peran public/anon
GRANT EXECUTE ON FUNCTION public.claim_souvenir(UUID, BOOLEAN, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_participant_status(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics() TO anon, authenticated;
