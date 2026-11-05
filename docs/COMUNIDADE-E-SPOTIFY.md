# Foto de perfil, conversas e música

A integração de reprodução pelo Spotify foi substituída por áudio do aparelho, a pedido do usuário. O cadastro Spotify não é necessário para essa funcionalidade. Estado atual, uso e limites: [MUSICA-LOCAL.md](MUSICA-LOCAL.md).

## Fotos e conversas

Perfil permite selecionar JPG, PNG ou WebP de até 5 MB, trocar e remover foto. Cabeçalho, amigos e mensagens usam o avatar. Conversas identificam autor, foto, data e horário, preservam o texto na falha e deduplicam retorno do envio e Realtime.

Fotos ficam no bucket privado `avatars`, com URLs assinadas de uma hora. Nome/foto são expostos somente a contatos e membros de comunidades autorizados, incluindo autores antigos de mensagens.

## Ativação pendente

Aplicar `supabase/migrations/20261023130746_social_profiles_and_training_music.sql` no projeto correto e publicar `supabase/functions/delete-user/index.ts`. O schema canônico foi atualizado. Apesar do nome histórico da migração, ela agora contém apenas os recursos sociais; música local não usa o Supabase.

A CLI informou `AccessTokenRequiredError`; não houve alteração remota. SQL e permissões foram testados em PostgreSQL isolado via PGlite, com tabelas mínimas de apoio. Isso não substitui validar upload real, URLs assinadas e conversa entre duas contas no Supabase.

O APK 1.9 foi posteriormente publicado para teste; fotos/identidade permanecem com ativação do backend pendente. Os registros em CONTEXTO.md distinguem a etapa inicial Spotify, posteriormente substituída, do comportamento atual.
