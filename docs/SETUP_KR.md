# ourwed 신청 폼 운영 설정 (Supabase + Admin Dashboard)

## 1) Supabase DB 만들기

Supabase Dashboard > SQL Editor에서 `docs/supabase-schema.sql` 내용을 실행합니다.

실행 전에 파일 하단의 초기 관리자 이메일을 실제 이메일로 교체해야 합니다.

```sql
insert into public.admin_users (email, display_name)
values
  ('OWNER_EMAIL@example.com', 'owner'),
  ('PARTNER_EMAIL@example.com', 'partner')
on conflict (email) do nothing;
```

이 SQL은 다음을 만듭니다.

- `applications`: 신청 기본 정보, 상품/예식/배송/동의 데이터
- `application_accounts`: 신청별 계좌 정보
- `application_events`: 상태 변경 및 관리자 메모 히스토리
- `admin_users`: 관리자 접근 허용 이메일

RLS 정책은 공개 신청 폼에서는 insert만 허용하고, 조회/상태 변경/초대는 `admin_users`에 등록된 로그인 사용자만 가능하도록 구성되어 있습니다.

## 2) 환경변수 설정

로컬 `.env.local`:

```bash
VITE_SUPABASE_URL="https://kofquwegpjivzdpmpwhd.supabase.co"
VITE_SUPABASE_ANON_KEY="Supabase anon key"
```

배포 환경에도 같은 두 값을 등록합니다.

중요: `service_role` key는 프론트엔드 환경변수에 넣지 않습니다. 현재 앱은 RLS 기반 클라이언트 insert/read 구조라 service role key가 필요하지 않습니다.

## 3) Supabase Auth 설정

Supabase Dashboard > Authentication > URL Configuration:

- Site URL: 운영 도메인. 예: `https://apply.ourwed.in`
- Redirect URLs:
  - `http://localhost:3000/admin`
  - `https://apply.ourwed.in/admin`

관리자는 `/admin`에서 이메일을 입력하고 매직링크로 로그인합니다.

## 4) 관리자 초대

첫 관리자 2명은 SQL 실행 시 `admin_users`에 넣습니다.

이후에는 `/admin` 접속 후 왼쪽 하단의 `관리자 초대` 입력칸에 이메일을 추가하면 됩니다. 추가된 이메일 사용자는 같은 `/admin` 화면에서 매직링크 로그인이 가능합니다.

## 5) 상태값

대시보드에서 관리하는 상태값은 다음과 같습니다.

- 신규 접수: `new`
- 견적 안내: `quoted`
- 입금 확인: `paid`
- 시안 작업: `drafting`
- 시안 확정: `confirmed`
- 인쇄 진행: `printing`
- 배송 완료: `shipped`
- 완료: `done`
- 취소: `cancelled`

상태 변경 시 `application_events`에 변경 전/후 상태와 메모가 저장됩니다.

## 6) 배포 메모

SPA에서 `/admin` 새로고침이 동작하도록 `vercel.json`에 모든 경로를 `index.html`로 돌리는 rewrite를 추가했습니다.

Vercel이 아닌 정적 호스팅/Cloud Run으로 배포한다면 동일하게 history fallback 설정이 필요합니다.
