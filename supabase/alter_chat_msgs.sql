-- 주변(Jubyeon) 스키마 변경분 — 2026-09-11 메시징(채팅) 시스템 추가
-- (매칭 성사 화면 "채팅 시작하기" 버튼용 실시간 채팅 테이블. 이장은 매칭을 중개할 뿐 채팅
--  당사자가 아니므로 대화 내용을 볼 수 없다 -- RLS는 match_requests.status = 'r_acpt' 이고
--  auth.uid()가 requester_id/resident_id 중 하나일 때만 조회/작성을 허용한다)
-- 이미 schema.sql을 실행해둔 프로젝트는 이 파일만 실행하면 된다.

create table if not exists public.chat_messages (
  id                  uuid primary key default gen_random_uuid(),
  match_request_id    uuid not null references public.match_requests(id) on delete cascade,
  sender_id           uuid not null references public.profiles(id) on delete cascade,
  body                text not null check (char_length(btrim(body)) > 0 and char_length(body) <= 2000),
  created_at          timestamptz not null default now()
);
create index if not exists idx_chat_messages_match on public.chat_messages (match_request_id, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "chat_select_related" on public.chat_messages;
create policy "chat_select_related" on public.chat_messages
  for select using (
    exists (
      select 1 from public.match_requests m
      where m.id = match_request_id
        and m.status = 'r_acpt'
        and (auth.uid() = m.requester_id or auth.uid() = m.resident_id)
    )
  );

drop policy if exists "chat_insert_related" on public.chat_messages;
create policy "chat_insert_related" on public.chat_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.match_requests m
      where m.id = match_request_id
        and m.status = 'r_acpt'
        and (auth.uid() = m.requester_id or auth.uid() = m.resident_id)
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

-- PostgREST 스키마 캐시 즉시 반영
notify pgrst, 'reload schema';
