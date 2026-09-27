-- ──────────────────────────────────────────────────────────
--  Voryn — Adiciona cardio pós-treino a workout_logs
--
--  Permite registrar o cardio feito logo depois do treino de
--  musculação (esteira, bike ergométrica, escada, elíptico, remo seco,
--  corrida/caminhada ao ar livre ou cardio livre/HIIT), com os campos
--  específicos de cada modalidade (velocidade, inclinação, RPM, split
--  pace, RPE etc.).
--
--  Guardado como jsonb numa coluna nova em workout_logs — mesmo padrão
--  já usado pela coluna `exercises` — em vez de uma tabela separada com
--  uma coluna por métrica: cada modalidade usa um conjunto diferente de
--  campos, então a maioria ficaria sempre nula numa tabela rígida com
--  uma coluna fixa por métrica. A fonte da verdade de quais campos cada
--  tipo tem tem é src/data/cardio.js.
--
--  Idempotente — pode rodar mais de uma vez sem erro.
-- ──────────────────────────────────────────────────────────

alter table public.workout_logs add column if not exists cardio jsonb;

-- Nenhuma policy de RLS nova é necessária: RLS neste projeto é sempre
-- por linha (auth.uid() = user_id, etc.), nunca por coluna — as
-- policies existentes de workout_logs (logs_own, logs_trainer_read,
-- logs_admin_read) já cobrem esta coluna nova automaticamente.
