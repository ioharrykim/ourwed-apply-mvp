# ourwed apply MVP

ourwed 지류 청첩장 주문 접수 웹앱입니다.

- 신청 폼: Walla처럼 단계별로 넘기며 작성
- 데이터 저장: Supabase `applications`, `application_accounts`
- 관리자 대시보드: `/admin`
- 관리자 로그인: Supabase Auth 이메일/비밀번호

## 로컬 실행

사전 요구사항: Node.js 20+

```bash
npm install
```

`.env.local`:

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

개발 서버:

```bash
npm run dev
```

## Supabase 설정

1. Supabase Dashboard > SQL Editor에서 [docs/supabase-schema.sql](./docs/supabase-schema.sql)을 실행합니다.
2. 실행 전 SQL 하단의 `OWNER_EMAIL@example.com`, `PARTNER_EMAIL@example.com`를 실제 관리자 이메일 2개로 바꿉니다.
3. Supabase Dashboard > Authentication > Users에서 관리자 이메일의 Auth user를 만들고 비밀번호를 설정합니다.
4. 배포 환경에도 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 등록합니다.

service role key는 브라우저 앱에 넣지 않습니다. 서버 API나 마이그레이션 자동화가 필요해질 때만 서버 전용 환경변수로 사용합니다.

## 운영 문서

- Supabase DB/Auth/RLS 설정: [docs/SETUP_KR.md](./docs/SETUP_KR.md)
