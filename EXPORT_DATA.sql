-- =====================================================
-- EXPORT DE DADOS - ZOEMDBIO
-- Execute este script APÓS criar a estrutura (EXPORT_DATABASE.sql)
-- =====================================================

-- 1. PATIENTS (pacientes)
INSERT INTO public.patients (id, name, email, gender, status, custom_fields, created_at, updated_at) VALUES
('8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'Reneer', 'reneerti@gmail.com', 'male', 'active', '{}', '2025-12-10 18:52:01.202071+00', '2025-12-10 18:52:01.202071+00'),
('5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'Ana Paula', 'reneerti@gmail.com', 'female', 'active', '{}', '2025-12-10 18:52:01.202071+00', '2025-12-10 18:52:01.202071+00');

-- 2. USER_PROFILES (perfis de usuário)
INSERT INTO public.user_profiles (id, user_person, display_name, avatar_url, created_at, updated_at) VALUES
('b33b6bd7-a1ae-4e94-b275-793ed71251fc', 'ana_paula', 'Ana Paula', 'https://dgoxrfhaxxhedibygcxz.supabase.co/storage/v1/object/public/bioimpedance-images/avatars/ana_paula-avatar-1764713786482.png', '2025-12-02 20:00:25.721442+00', '2025-12-02 22:16:34.119965+00'),
('e524263d-f4d9-4288-b83e-34203505f89a', 'reneer', 'Reneer', 'https://dgoxrfhaxxhedibygcxz.supabase.co/storage/v1/object/public/bioimpedance-images/avatars/reneer-avatar-1764713793905.png', '2025-12-02 20:00:25.721442+00', '2025-12-02 22:16:40.997256+00');

-- NOTA: As URLs de avatar acima apontam para o bucket do projeto Cloud atual.
-- Você precisará fazer upload das imagens de avatar no seu novo bucket e atualizar as URLs.

-- 3. USER_GOALS (metas de usuário)
INSERT INTO public.user_goals (id, user_person, target_weight, target_body_fat, target_muscle, target_bmi, target_visceral_fat, created_at, updated_at) VALUES
('e9e6b8c9-ec0a-4b0c-970b-238ae2243948', 'ana_paula', 60.0, 22.0, 30.0, 23.0, 8, '2025-12-08 13:14:22.277644+00', '2025-12-08 13:14:22.277644+00'),
('95676a28-781b-4134-bfed-4e76716b6a76', 'reneer', 90, 18, 38, 24, 10, '2025-12-08 13:14:22.277644+00', '2025-12-08 14:04:22.094+00');

-- 4. SUPPLEMENTATION (suplementação)
INSERT INTO public.supplementation (id, user_person, supplement_name, dosage, notes, created_at, updated_at) VALUES
('f3466589-857f-4a4b-85e2-247ed16fa947', 'ana_paula', 'Creatina', '1 colher rasa todos os dias', 'treinos e descanso', '2025-12-02 22:13:43.640971+00', '2025-12-02 22:13:43.640971+00'),
('6fcae327-1994-4e89-8175-1c5b663fae17', 'ana_paula', 'Ômega-3', '2 caps dia', NULL, '2025-12-02 22:13:43.640971+00', '2025-12-02 22:13:43.640971+00'),
('18c54f6d-11b1-4b6c-8385-beba73026cf7', 'ana_paula', 'Whey Protein', '2 dosador por dia (30g)', NULL, '2025-12-02 22:13:43.640971+00', '2025-12-03 01:20:34.075099+00'),
('b2c6647a-9a93-4c87-ae06-12439938b5cc', 'reneer', 'Creatina', '1 colher rasa todos os dias', 'treinos e descanso', '2025-12-02 22:13:43.640971+00', '2025-12-02 22:13:43.640971+00'),
('9d2237c6-7dd1-41a7-976d-d07497f13b7f', 'reneer', 'Whey', '2 dosadores normal (60g), 5 treino (150g)', 'dia normal vs dia de treino', '2025-12-02 22:13:43.640971+00', '2025-12-02 22:13:43.640971+00'),
('400c8ad6-cd28-4ab2-bf67-daec22de21d2', 'reneer', 'BCAA', '3 caps em dias de treino', NULL, '2025-12-02 22:13:43.640971+00', '2025-12-02 22:13:43.640971+00'),
('5659c1a4-c0fd-49d7-87e4-ec5594457825', 'reneer', 'Ômega-3', '2 caps todo dia antes de dormir', NULL, '2025-12-02 22:13:43.640971+00', '2025-12-02 22:13:43.640971+00');

-- 5. BIOIMPEDANCE - RENEER (dados de bioimpedância)
INSERT INTO public.bioimpedance (id, patient_id, user_person, measurement_date, week_number, status, weight, bmi, body_fat_percent, fat_mass, muscle_mass, muscle_rate_percent, lean_mass, skeletal_muscle_percent, visceral_fat, subcutaneous_fat_percent, body_water_percent, moisture_content, bone_mass, protein_mass, protein_percent, bmr, metabolic_age, whr, monjaro_dose, created_at, updated_at) VALUES
('d5a88edc-eb4b-4a02-b650-4964443369a2', '8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'reneer', '2024-09-02', 1, 'Inicial', 110.40, 36.90, 35.00, 38.60, 67.10, 60.70, 71.90, 37.40, 16.00, 25.00, 47.70, 52.70, 4.80, 14.40, 13.00, 1920, 42, 0.990, 2.50, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('effda3c7-bd86-4a38-97e7-e7f4fe2eca8f', '8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'reneer', '2024-09-09', 2, 'Adaptação', 108.60, 36.30, 34.80, 37.80, 66.00, 60.80, 70.70, 37.40, 16.00, 24.80, 47.80, 51.90, 4.70, 14.10, 13.00, 1899, 42, 1.040, 2.50, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('f54af22a-f947-4228-9ca1-5bdedef781c0', '8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'reneer', '2024-09-16', 3, 'Escalada', 106.80, 35.70, 34.70, 37.10, 65.20, 61.00, 69.90, 37.50, 16.00, 24.70, 47.90, 51.20, 4.70, 14.00, 13.10, 1877, 42, 1.060, 4.00, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('c1e5eca4-df34-4038-945e-0716833b4355', '8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'reneer', '2024-09-23', 4, 'Escalada', 105.90, 35.40, 32.70, 34.60, 66.60, 62.80, 71.40, 38.70, 14.00, 23.30, 49.40, 52.30, 4.80, 14.30, 13.50, 1910, 41, 0.940, 5.00, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('23a04501-9965-451b-928a-3961cd971bc8', '8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'reneer', '2024-09-30', 5, 'Estabilização', 104.30, 34.80, 32.80, 34.20, 65.40, 62.70, 70.10, 38.60, 14.00, 23.40, 49.30, 51.40, 4.70, 14.00, 13.40, 1884, 41, 0.930, 5.00, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('90db72b9-9606-4d6b-aa26-a2a9cd896475', '8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'reneer', '2024-10-07', 6, 'HIATO 14d', 105.80, 35.40, 33.80, 35.80, 65.50, 61.80, 70.20, 38.00, 15.00, 24.10, 48.60, 51.50, 4.70, 14.10, 13.20, 1884, 41, 1.040, 5.00, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('c6d0f4eb-6f82-43d8-99cc-bd63d24bad75', '8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'reneer', '2024-10-21', 7, 'Recuperação', 104.80, 35.00, 33.50, 37.10, 65.00, 62.10, 69.90, 38.20, 15.00, 23.90, 48.80, 51.20, 4.70, 14.00, 13.10, 1875, 41, 1.060, 5.00, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('e73c0675-b89b-46e9-93a0-7d943895c8f7', '8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'reneer', '2024-10-28', 8, 'Escalada', 103.90, 34.70, 32.60, 33.90, 65.30, 62.90, 70.00, 38.70, 14.00, 23.30, 49.40, 51.40, 4.70, 14.00, 13.50, 1882, 41, 0.950, 7.50, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', '8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'reneer', '2024-11-04', 9, 'Manutenção', 102.30, 34.20, 31.90, 32.60, 65.50, 64.00, 69.70, 39.40, 13.00, 22.80, 50.10, 52.00, 4.70, 14.10, 13.80, 1878, 40, 0.920, 7.50, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', '8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'reneer', '2024-11-11', 10, 'HIATO 10d', 103.60, 34.60, 32.40, 33.60, 65.20, 62.90, 70.00, 38.70, 14.00, 23.10, 49.60, 51.50, 4.70, 14.00, 13.50, 1880, 41, 0.940, 7.50, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', '8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'reneer', '2024-11-25', 11, 'Retomada', 102.80, 34.40, 32.00, 32.90, 65.40, 63.60, 69.90, 39.10, 13.00, 22.90, 49.90, 51.80, 4.70, 14.00, 13.60, 1876, 40, 0.930, 10.00, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', '8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'reneer', '2024-12-02', 12, 'HIATO 6d', 103.30, 34.50, 32.20, 33.30, 65.40, 63.30, 70.00, 38.90, 14.00, 23.00, 49.70, 51.60, 4.70, 14.00, 13.50, 1879, 41, 0.940, 10.00, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b', '8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd', 'reneer', '2024-12-08', 13, 'Atual', 102.00, 35.30, 36.10, 36.80, 60.80, 59.60, 65.20, 36.20, 16.00, 25.80, 47.10, 50.10, 4.40, 13.10, 12.80, 1795, 43, 1.080, 12.50, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00');

-- 6. BIOIMPEDANCE - ANA PAULA
INSERT INTO public.bioimpedance (id, patient_id, user_person, measurement_date, week_number, status, weight, bmi, body_fat_percent, fat_mass, muscle_mass, muscle_rate_percent, lean_mass, skeletal_muscle_percent, visceral_fat, subcutaneous_fat_percent, body_water_percent, moisture_content, bone_mass, protein_mass, protein_percent, bmr, metabolic_age, whr, monjaro_dose, created_at, updated_at) VALUES
('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c', '5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'ana_paula', '2024-09-02', 1, 'Inicial', 75.00, 29.40, 38.50, 28.90, 43.50, 58.00, 46.10, 26.80, 8.00, 32.50, 45.10, 48.20, 2.60, 9.20, 12.30, 1380, 45, 0.850, 2.50, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d', '5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'ana_paula', '2024-09-09', 2, 'Adaptação', 74.20, 29.10, 38.20, 28.30, 43.30, 58.30, 45.90, 26.90, 8.00, 32.20, 45.30, 48.40, 2.60, 9.10, 12.30, 1375, 44, 0.840, 2.50, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e', '5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'ana_paula', '2024-09-16', 3, 'Escalada', 73.50, 28.80, 37.80, 27.80, 43.20, 58.80, 45.70, 27.10, 7.00, 31.80, 45.60, 48.70, 2.50, 9.00, 12.40, 1368, 44, 0.830, 5.00, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f', '5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'ana_paula', '2024-09-23', 4, 'Escalada', 72.80, 28.50, 37.30, 27.20, 43.10, 59.20, 45.60, 27.30, 7.00, 31.30, 46.00, 49.00, 2.50, 8.90, 12.50, 1360, 43, 0.820, 5.00, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('d0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a', '5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'ana_paula', '2024-09-30', 5, 'Estabilização', 72.00, 28.20, 36.80, 26.50, 43.00, 59.70, 45.50, 27.60, 7.00, 30.80, 46.40, 49.40, 2.50, 8.90, 12.60, 1352, 42, 0.810, 5.00, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b', '5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'ana_paula', '2024-10-07', 6, 'Manutenção', 71.50, 28.00, 36.40, 26.00, 42.90, 60.00, 45.50, 27.80, 6.00, 30.40, 46.70, 49.70, 2.50, 8.80, 12.70, 1345, 42, 0.800, 7.50, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c', '5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'ana_paula', '2024-10-14', 7, 'Progresso', 70.80, 27.70, 35.90, 25.40, 42.80, 60.50, 45.40, 28.10, 6.00, 29.90, 47.10, 50.10, 2.50, 8.80, 12.80, 1338, 41, 0.790, 7.50, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d', '5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'ana_paula', '2024-10-21', 8, 'Progresso', 70.20, 27.50, 35.50, 24.90, 42.80, 61.00, 45.30, 28.30, 6.00, 29.50, 47.40, 50.40, 2.50, 8.70, 12.90, 1332, 40, 0.780, 7.50, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e', '5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'ana_paula', '2024-10-28', 9, 'Excelente', 69.50, 27.20, 35.00, 24.30, 42.70, 61.40, 45.20, 28.50, 5.00, 29.00, 47.80, 50.80, 2.50, 8.70, 13.00, 1325, 39, 0.770, 10.00, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('c5d6e7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f', '5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'ana_paula', '2024-11-04', 10, 'Excelente', 68.80, 27.00, 34.50, 23.70, 42.60, 61.90, 45.10, 28.80, 5.00, 28.50, 48.20, 51.20, 2.50, 8.60, 13.10, 1318, 38, 0.760, 10.00, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('d6e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a', '5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'ana_paula', '2024-11-11', 11, 'Ótimo', 68.20, 26.70, 34.00, 23.20, 42.50, 62.30, 45.00, 29.00, 5.00, 28.00, 48.50, 51.50, 2.50, 8.60, 13.20, 1312, 37, 0.750, 10.00, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('e7f8a9b0-c1d2-4e3f-4a5b-6c7d8e9f0a1b', '5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'ana_paula', '2024-11-18', 12, 'Ótimo', 67.50, 26.40, 33.50, 22.60, 42.50, 62.90, 44.90, 29.30, 5.00, 27.50, 48.90, 51.90, 2.50, 8.50, 13.30, 1305, 36, 0.740, 12.50, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00'),
('f8a9b0c1-d2e3-4f4a-5b6c-7d8e9f0a1b2c', '5a6ab9fe-101f-4258-a7f8-7e70590d5054', 'ana_paula', '2024-11-25', 13, 'Meta Próxima', 66.80, 26.20, 33.00, 22.00, 42.40, 63.50, 44.80, 29.50, 4.00, 27.00, 49.20, 52.20, 2.50, 8.50, 13.40, 1298, 35, 0.730, 12.50, '2025-12-02 18:06:56.560622+00', '2025-12-02 18:06:56.560622+00');

-- 7. USER_ROLES (papéis de usuário)
-- IMPORTANTE: Os user_id abaixo são específicos do projeto Cloud atual.
-- Você precisará criar os usuários no seu Supabase e usar os novos IDs.
-- Após criar o usuário admin (reneerti@gmail.com) no Auth, execute:
-- INSERT INTO public.user_roles (user_id, role) VALUES ('SEU_NOVO_USER_ID', 'admin');
-- Após criar o usuário viewer (clinica@clinica.com) no Auth, execute:
-- INSERT INTO public.user_roles (user_id, role) VALUES ('SEU_NOVO_USER_ID', 'viewer');

-- Dados de referência dos user_roles atuais (não executar diretamente):
-- user_id: 855a3b2c-9e3a-4c3d-8c1b-9d8316981e05 -> role: admin (reneerti@gmail.com)
-- user_id: 5bc0b985-363f-4b26-89e0-304ad4cf532e -> role: viewer (clinica@clinica.com)

-- =====================================================
-- INSTRUÇÕES DE IMPORTAÇÃO:
-- 
-- 1. Crie o projeto no Supabase (supabase.com)
-- 2. Execute primeiro o EXPORT_DATABASE.sql (estrutura)
-- 3. Crie os usuários manualmente em Authentication > Users:
--    - reneerti@gmail.com (senha: An@2025) -> admin/master
--    - clinica@clinica.com (senha: Clinic@25) -> viewer
-- 4. Anote os IDs gerados para cada usuário
-- 5. Execute este script (EXPORT_DATA.sql) para os dados
-- 6. Execute os INSERTs de user_roles com os novos IDs:
--    INSERT INTO public.user_roles (user_id, role) 
--    VALUES ('ID_DO_ADMIN', 'admin');
--    INSERT INTO public.user_roles (user_id, role) 
--    VALUES ('ID_DO_VIEWER', 'viewer');
-- 7. Faça upload das imagens de avatar no bucket bioimpedance-images
-- 8. Atualize as URLs de avatar em user_profiles se necessário
-- =====================================================
