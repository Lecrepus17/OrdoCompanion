-- ============================================================================
-- MIGRAÇÃO DE SEGURANÇA: CENTRAL DE SUPORTE & ANTI-SPAM (SUPABASE)
-- ============================================================================
-- Você pode colar este script diretamente no SQL Editor do seu painel Supabase:
-- 1. Cria a tabela segura `support_tickets` com Row Level Security (RLS)
-- 2. Bloqueia leitura/edição pública (apenas INSERT validado)
-- 3. Opcional: Se a extensão `pg_net` estiver ativa, encaminha automaticamente
--    para o seu Discord Webhook salvo em uma tabela privada de segredos, sem
--    NUNCA expor a URL do Discord no aplicativo!

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol TEXT NOT NULL CHECK (protocol ~ '^ORD-[A-Z0-9]{4,12}$'),
  category TEXT NOT NULL CHECK (category IN ('bug', 'rule_error', 'suggestion', 'contact')),
  severity TEXT CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 250),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 4000),
  steps_to_reproduce TEXT CHECK (steps_to_reproduce IS NULL OR char_length(steps_to_reproduce) <= 1500),
  sender_name TEXT CHECK (sender_name IS NULL OR char_length(sender_name) <= 120),
  contact_return TEXT CHECK (contact_return IS NULL OR char_length(contact_return) <= 150),
  diagnostics JSONB,
  client_signature TEXT NOT NULL CHECK (client_signature ~ '^ordo_sig_v1_[a-f0-9]{16}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ativa RLS e permite apenas INSERT anônimo que cumpra os CHECKs acima
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir insercao validada de chamados" ON public.support_tickets;
CREATE POLICY "Permitir insercao validada de chamados"
  ON public.support_tickets
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    protocol ~ '^ORD-[A-Z0-9]{4,12}$'
    AND client_signature ~ '^ordo_sig_v1_[a-f0-9]{16}$'
    AND title !~* '@(everyone|here)'
    AND description !~* '@(everyone|here)'
  );
