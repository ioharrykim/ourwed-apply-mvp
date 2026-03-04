# ourwed apply mvp

ourwed 지류 청첩장 주문 접수 웹앱입니다.  
폼 제출 시 Google Apps Script 웹앱으로 데이터를 전송해 Google 스프레드시트에 적재합니다.

## 로컬 실행

사전 요구사항: Node.js 20+

1. 의존성 설치

```bash
npm install
```

2. 환경변수 설정 (`.env.local`)

```bash
VITE_GOOGLE_SCRIPT_WEB_APP_URL="https://script.google.com/macros/s/발급받은ID/exec"
```

3. 개발 서버 실행

```bash
npm run dev
```

## 운영 설정 문서

- Google Sheets 연동 + Apps Script 배포 + `apply.ourwed.in` 도메인 연결:
  [docs/SETUP_KR.md](./docs/SETUP_KR.md)
