# KJ Bizboard — 한일 비즈니스 커뮤니티 게시판

한국어/일본어 자동 번역을 지원하는 한일 비즈니스 커뮤니티 플랫폼.  
Claude AI가 게시글·댓글을 자동으로 양방향 번역하며, 사용자는 언제든지 언어를 전환하여 읽을 수 있습니다.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js (App Router) |
| 스타일 | Tailwind CSS |
| 데이터베이스 | Supabase (PostgreSQL) |
| 인증 | Supabase Auth (Google OAuth) |
| 파일 스토리지 | Supabase Storage |
| AI 번역 | Anthropic Claude Opus 4.7 |
| 이메일 | Resend API |
| 배포 | Vercel (Pro 플랜) |

---

## 구현된 기능

### 언어 전환
- 한국어 / 일본어 토글 (헤더 및 게시글 상세 페이지)
- `localStorage`에 저장, 첫 접속 시 브라우저 언어 자동 감지

### 게시글
- 게시글 작성 (한국어 또는 일본어로 작성)
- 제목·본문·태그 자동 번역 (Claude AI)
- 파일 첨부 (이미지/PDF/Excel/Word, 최대 10MB × 여러 파일)
- 카테고리 · 태그 (언어별 태그 필드: `tags_ko`, `tags_ja`)
- 게시글 수정 · 소프트 삭제 (작성자 본인만 가능)
- 수정됨 배지 (작성 이후 수정된 경우에만 표시)

### 번역 시스템
- 게시글 저장 직후 즉시 응답 → 브라우저에서 번역 API 비동기 호출
- 번역 중 "번역 중..." 애니메이션 배지 표시, 완료 후 "Claude AI 번역" 배지로 전환
- **단락 구조 보존**: `\n\n` 기준으로 단락 분리 → Claude에 JSON 배열로 전달 → 재결합
- **URL 보존**: URL을 플레이스홀더(`__URL_N__`)로 치환 후 번역, 복원 시 원래 위치 유지
- 1,500자 초과 시 1,400자 단위 청크로 분할하여 순차 번역
- 번역 엔드포인트 `maxDuration: 300초` (Vercel Pro 필요)

### 댓글 · 대댓글
- 댓글 작성 시 자동 번역 (게시글과 동일한 번역 로직)
- 2단계 중첩 (댓글 → 대댓글, 그 이상은 비허용)
- 댓글도 언어 전환 시 번역된 내용으로 표시
- 댓글 수정 · 삭제 (작성자 본인만 가능)

### 검색
- 제목·본문·작성자명·태그 동시 검색 (한국어/일본어 필드 모두)
- SQL ILIKE 기반 대소문자 무관 검색
- 검색어 하이라이트 (노란 배경)

### 알림 (이메일)
- **게시글 작성자**: 새 댓글 등록 시 이메일 수신 여부 설정 가능
- **댓글 작성자**: 새 대댓글 등록 시 이메일 수신 여부 설정 가능
- Next.js `after()` 훅으로 응답 후 비동기 발송 (타임아웃 방지)
- 발송 라이브러리: Resend

### 신고
- 게시글·댓글 신고 기능 (스팸, 욕설, 허위정보, 기타)
- 신고 시 어드민 이메일 알림 발송

### Google OAuth 인증
- Google 계정으로 로그인/로그아웃
- 로그인 시 표시 이름 변경 가능 (최대 30자)
- 이름 변경 시 해당 사용자의 모든 게시글·댓글에 일괄 반영

### 어드민 기능
- 어드민 이메일 계정으로 로그인 시 ADMIN 배지 표시
- 게시글·댓글 숨기기 / 복원 / 삭제
- 숨긴 게시글은 어드민만 목록에서 확인 가능 (주황 테두리 표시)

---

## 데이터 모델

### posts 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `title_ko`, `title_ja` | text | 언어별 제목 |
| `content_ko`, `content_ja` | text | 언어별 본문 |
| `original_lang` | 'ko' \| 'ja' | 원문 언어 |
| `author_name` | text | 작성자 이름 |
| `user_id` | UUID (nullable) | 로그인 사용자 ID |
| `category` | text | 카테고리 |
| `tags` | string[] | 원문 태그 |
| `tags_ko`, `tags_ja` | string[] | 번역된 태그 |
| `attachments` | JSON | 첨부파일 목록 `[{name, url, type, size}]` |
| `status` | 'active' \| 'hidden' \| 'deleted' | 게시 상태 |
| `notify_comment` | boolean | 댓글 알림 여부 |
| `notify_email` | text (nullable) | 알림 수신 이메일 |
| `created_at`, `updated_at` | timestamptz | 작성/수정 시각 |

### comments 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `post_id` | UUID | 소속 게시글 |
| `parent_id` | UUID (nullable) | 대댓글 대상 댓글 ID |
| `content_ko`, `content_ja` | text | 언어별 내용 |
| `original_lang` | 'ko' \| 'ja' | 원문 언어 |
| `author_name` | text | 작성자 이름 |
| `user_id` | UUID (nullable) | 로그인 사용자 ID |
| `status` | 'active' \| 'hidden' \| 'deleted' | 상태 |
| `notify_reply` | boolean | 대댓글 알림 여부 |
| `notify_email` | text (nullable) | 알림 수신 이메일 |

### profiles 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | auth.users PK |
| `email` | text | 이메일 |
| `display_name` | text (nullable) | 사용자 지정 표시 이름 |

---

## API 엔드포인트

### 게시글

| 메서드 | 경로 | 권한 | 설명 |
|--------|------|------|------|
| GET | `/api/posts` | 공개 | 목록 조회 (`?q=` 검색 지원) |
| POST | `/api/posts` | 공개 | 게시글 작성 |
| GET | `/api/posts/[id]` | 공개 | 단일 게시글 조회 |
| PUT | `/api/posts/[id]` | 작성자 | 게시글 수정 |
| PATCH | `/api/posts/[id]` | 어드민 | 상태 변경 (active/hidden/deleted) |
| DELETE | `/api/posts/[id]` | 작성자 | 소프트 삭제 |
| POST | `/api/posts/[id]/translate` | 공개 | 번역 실행 (maxDuration: 300s) |
| POST | `/api/posts/[id]/report` | 공개 | 신고 |

### 댓글

| 메서드 | 경로 | 권한 | 설명 |
|--------|------|------|------|
| GET | `/api/posts/[id]/comments` | 공개 | 댓글 목록 조회 |
| POST | `/api/posts/[id]/comments` | 공개 | 댓글/대댓글 작성 |
| PUT | `/api/posts/[id]/comments/[cid]` | 작성자 | 댓글 수정 |
| PATCH | `/api/posts/[id]/comments/[cid]` | 어드민 | 상태 변경 |
| DELETE | `/api/posts/[id]/comments/[cid]` | 작성자 | 삭제 |
| POST | `/api/posts/[id]/comments/[cid]/report` | 공개 | 신고 |

### 프로필

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/profile` | 프로필 조회 |
| PUT | `/api/profile` | 알림 설정 변경 |
| PATCH | `/api/profile` | 표시 이름 변경 (게시글·댓글 일괄 반영) |

---

## 환경 변수

`.env.local` 및 Vercel 환경 변수에 모두 설정 필요.

| 변수 | 공개 여부 | 설명 |
|------|-----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 공개 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 | Supabase anon 키 |
| `NEXT_PUBLIC_ADMIN_EMAIL` | 공개 | 어드민 이메일 (프론트엔드 표시용) |
| `ADMIN_EMAIL` | 서버 전용 | 어드민 이메일 (API 인증용) |
| `ANTHROPIC_API_KEY` | 서버 전용 | Claude API 키 (번역) |
| `RESEND_API_KEY` | 서버 전용 | 이메일 발송 API 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 | RLS 우회 (표시 이름 일괄 변경 등) |

---

## 주의사항 (새 세션 인수인계)

### 번역 관련
- `translation_pending` 플래그는 DB에 저장되지 않음. `title_ko === title_ja && content_ko === content_ja`로 런타임에 계산.
- 번역 중에는 양쪽 언어 필드에 원문이 동일하게 저장됨 (의도된 임시 상태).
- 번역 API는 클라이언트(브라우저)가 게시 완료 후 직접 호출 — 서버 사이드가 아님.
- 번역 엔드포인트 `maxDuration: 300`은 **Vercel Pro 플랜 이상에서만 동작** (Hobby는 10초 한도).

### 인증 관련
- 비로그인 사용자도 작성자 이름을 직접 입력하여 게시 가능.
- 소유권 검증: 로그인 사용자는 `user_id` 일치, 비로그인 사용자는 `user_id`가 없는 글에 한해 `author_name` 일치로 확인.
- 어드민 판별: `user.email === process.env.ADMIN_EMAIL` (서버) 또는 `NEXT_PUBLIC_ADMIN_EMAIL` (클라이언트).

### 삭제 정책
- 게시글: 소프트 삭제 (`status = 'deleted'`). DB에서 완전 제거하지 않음.
- 댓글: 하드 삭제 (DB에서 제거).
- `deleted` 상태 게시글은 어드민도 목록에 표시되지 않음.

### 태그
- 태그는 `tags`(원문), `tags_ko`, `tags_ja` 3개 필드에 저장.
- 게시 시 원문 태그를 3개 필드에 동일하게 저장 후, 번역 API에서 `tags_ko`/`tags_ja`를 업데이트.

### 파일 첨부
- Supabase Storage 버킷명: `post-attachments`
- 경로 형식: `{timestamp}-{random}/{filename}`
- 공개 URL 생성 후 `attachments` JSON 필드에 저장.

### Vercel 타임아웃 설정 (`vercel.json`)
- `posts/route.ts`, `posts/[id]/route.ts`, `comments/route.ts`: 60초
- `posts/[id]/translate/route.ts`: 300초 (번역 전용, Pro 플랜 필요)
