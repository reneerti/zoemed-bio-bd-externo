-- Add new configuration keys for database and API settings
-- These will store encrypted values for sensitive data

-- Insert default configuration entries for database settings
INSERT INTO public.api_configurations (config_key, config_value, provider, is_active, priority)
VALUES 
  ('database_type', 'supabase', 'database', true, 1),
  ('database_host', null, 'database', true, 1),
  ('database_port', '5432', 'database', true, 1),
  ('database_name', null, 'database', true, 1),
  ('database_user', null, 'database', true, 1),
  ('database_password', null, 'database', true, 1),
  ('lovable_gateway_key', null, 'ocr', true, 1),
  ('google_vision_key', null, 'ocr', true, 2),
  ('openai_api_key', null, 'ai', true, 1),
  ('gemini_api_key', null, 'ai', true, 2)
ON CONFLICT (config_key) DO NOTHING;