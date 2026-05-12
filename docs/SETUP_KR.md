# ourwed 신청 폼 운영 설정 (Google Sheets + Domain)

## 1) 폼 제출 데이터를 Google 스프레드시트로 받기

### A. 스프레드시트 준비
1. 구글 스프레드시트 1개를 새로 생성합니다. (예: `ourwed_apply_responses`)
2. 상단 메뉴 `확장 프로그램 > Apps Script`를 엽니다.

### B. Apps Script 코드 붙여넣기
기존 코드를 지우고 아래 코드 전체를 넣으세요.

```javascript
const SHEET_NAME = "responses";

const HEADERS = [
  "submittedAt",
  "ordererName",
  "ordererContact",
  "communicationMethod",
  "ordererEmail",
  "ordererKakaoId",
  "paperType",
  "templateId",
  "templateName",
  "invitationQty",
  "envelopeQty",
  "envelopeQtyMode",
  "sealingWaxQty",
  "weddingDateTime",
  "desiredReceiveDate",
  "venueName",
  "venueAddress",
  "groomName",
  "brideName",
  "coverEnglishName",
  "coverTitleText",
  "parentsNotation",
  "greetingText",
  "additionalWeddingInfo",
  "accounts",
  "recipientName",
  "recipientContact",
  "shippingAddress",
  "agreeTemplate",
  "agreeShipping",
  "agreeRevisionPolicy",
  "agreeNotPayment",
  "rawJson",
];

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const sheet = getOrCreateSheet_(SHEET_NAME);
    ensureHeaderRow_(sheet, HEADERS);

    const accountsText = formatAccounts_(payload.accounts);

    const row = [
      payload.submittedAt || new Date().toISOString(),
      payload.ordererName || "",
      payload.ordererContact || "",
      payload.communicationMethod || "",
      payload.ordererEmail || "",
      payload.ordererKakaoId || "",
      payload.paperType || "",
      payload.templateId || "",
      payload.templateName || "",
      payload.invitationQtyFinal || payload.invitationQty || "",
      payload.envelopeQtyFinal || payload.envelopeQty || "",
      payload.envelopeQtyMode || "",
      payload.sealingWaxQtyFinal || payload.sealingWaxQty || "",
      payload.weddingDateTime || "",
      payload.desiredReceiveDate || "",
      payload.venueName || "",
      payload.venueAddress || "",
      payload.groomName || "",
      payload.brideName || "",
      payload.coverEnglishName || "",
      payload.coverTitleText || "",
      payload.parentsNotation || "",
      payload.greetingText || "",
      payload.additionalWeddingInfo || "",
      accountsText,
      payload.recipientName || "",
      payload.recipientContact || "",
      payload.shippingAddress || "",
      String(Boolean(payload.agreeTemplate)),
      String(Boolean(payload.agreeShipping)),
      String(Boolean(payload.agreeRevisionPolicy)),
      String(Boolean(payload.agreeNotPayment)),
      JSON.stringify(payload),
    ];

    sheet.appendRow(row);

    return jsonResponse_({ ok: true });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Empty request body");
  }
  return JSON.parse(e.postData.contents);
}

function formatAccounts_(accounts) {
  if (!Array.isArray(accounts)) {
    return "";
  }
  return accounts
    .filter((item) => item && (item.bank || item.relation || item.accountNumber))
    .map((item, index) => {
      const relation =
        item.relation === "기타"
          ? item.relationCustom || "기타"
          : item.relation || "";
      return [
        index + 1,
        item.bank || "",
        relation,
        item.accountNumber || "",
      ].join(" | ");
    })
    .join("\n");
}

function getOrCreateSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function ensureHeaderRow_(sheet, headers) {
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  const current = headerRange.getValues()[0];
  const hasHeader = current.some((value) => String(value).trim() !== "");
  if (!hasHeader) {
    headerRange.setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
```

### C. 웹앱 배포
1. Apps Script에서 `배포 > 새 배포`.
2. 유형 `웹 앱`.
3. `Execute as`: **Me**
4. `Who has access`: **Anyone**
5. 배포 후 발급되는 `.../exec` URL을 복사합니다.

### D. 프론트 환경변수 연결
프로젝트 루트에 `.env.local` 생성 후 다음 설정:

```bash
VITE_GOOGLE_SCRIPT_WEB_APP_URL="https://script.google.com/macros/s/발급받은ID/exec"
```

AI Studio에서 바로 배포할 경우에도 동일한 값이 빌드 시점에 반영되도록 설정해 주세요.

### E. 동작 확인
1. 폼에서 테스트 1건 제출.
2. 시트 `responses` 탭에 새 행이 추가되는지 확인.
3. 배포 이후 Apps Script 코드를 수정했다면 `배포 > 관리`에서 최신 버전으로 재배포합니다.
4. 기존 시트를 계속 쓰는 경우 헤더에 `desiredReceiveDate`, `agreeShipping`, `agreeRevisionPolicy`, `ordererKakaoId`, `envelopeQtyMode` 컬럼을 추가했는지 확인합니다.

## 2) 도메인 `apply.ourwed.in` 연결

이 앱은 AI Studio에서 Cloud Run으로 배포되므로, 도메인 연결은 Cloud Run 쪽에서 진행합니다.

### 빠른 연결(Cloud Run Domain Mapping)
1. GCP 콘솔 `Cloud Run > Domain mappings` 이동.
2. `Add mapping` 클릭.
3. 서비스 선택 후 도메인 `apply.ourwed.in` 입력.
4. `ourwed.in` 소유권을 Search Console에서 검증.
5. 화면에 나온 DNS 레코드를 도메인 DNS에 추가.
6. SSL 발급 완료까지 대기 후 `https://apply.ourwed.in` 접속 확인.

### 운영 권장
Cloud Run 공식 문서 기준으로 Domain Mapping 기능은 제한/프리뷰 성격 안내가 있어, 실서비스에서는 `Global External Application Load Balancer` 경로가 더 권장됩니다.
