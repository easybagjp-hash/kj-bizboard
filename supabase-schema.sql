-- ================================================================
-- [1단계] posts 테이블 생성 — 처음 한 번만 실행
-- ================================================================
create table posts (
  id uuid default gen_random_uuid() primary key,
  title_ko text not null,
  title_ja text not null,
  content_ko text not null,
  content_ja text not null,
  original_lang text not null check (original_lang in ('ko', 'ja')),
  author_name text not null,
  category text not null default '일반',
  created_at timestamptz default now() not null
);

alter table posts enable row level security;

create policy "Anyone can read posts" on posts
  for select using (true);

create policy "Anyone can insert posts" on posts
  for insert with check (true);

create policy "Anyone can delete posts" on posts
  for delete using (true);


-- ================================================================
-- [2단계] comments 테이블 생성 — 댓글 기능 추가 시 실행
-- ================================================================
create table comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references posts(id) on delete cascade,
  content_ko text not null,
  content_ja text not null,
  original_lang text not null check (original_lang in ('ko', 'ja')),
  author_name text not null,
  created_at timestamptz default now() not null
);

alter table comments enable row level security;

create policy "Anyone can read comments" on comments
  for select using (true);

create policy "Anyone can insert comments" on comments
  for insert with check (true);

create policy "Anyone can delete comments" on comments
  for delete using (true);


-- ================================================================
-- [3단계] 삭제 정책 추가 — 이미 1·2단계를 실행한 경우에만 실행
-- ================================================================
create policy "Anyone can delete posts" on posts
  for delete using (true);

create policy "Anyone can delete comments" on comments
  for delete using (true);
