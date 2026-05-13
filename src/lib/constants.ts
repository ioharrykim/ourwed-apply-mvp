import type {
  AccountSlot,
  ApplicationFormData,
  ApplicationStatus,
  Template,
} from "../types";

export const TEMPLATES: Record<string, Template[]> = {
  엽서형: [
    {
      id: "pc-01",
      name: "클래식 화이트",
      tone: "quiet",
    },
    {
      id: "pc-02",
      name: "모던 베이지",
      tone: "warm",
    },
  ],
  "2단 접지": [
    {
      id: "fold2-01",
      name: "엘레강스 크림",
      tone: "cream",
    },
    {
      id: "fold2-02",
      name: "보태니컬 그린",
      tone: "green",
    },
  ],
  "3단 접지": [
    {
      id: "fold3-01",
      name: "프리미엄 골드",
      tone: "gold",
    },
    {
      id: "fold3-02",
      name: "로맨틱 핑크",
      tone: "rose",
    },
  ],
};

export const INITIAL_ACCOUNTS: AccountSlot[] = [
  { id: "1", bank: "", relation: "", relationCustom: "", accountNumber: "" },
  { id: "2", bank: "", relation: "", relationCustom: "", accountNumber: "" },
];

export const QUANTITY_OPTIONS = ["50", "100", "200", "300", "400", "500", "기타"];

export const ENVELOPE_QTY_MODES = [
  { value: "same", label: "청첩장과 동일" },
  { value: "plus10", label: "청첩장 + 10매" },
  { value: "plus20", label: "청첩장 + 20매" },
  { value: "custom", label: "직접 입력" },
];

export const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "new", label: "신규 접수" },
  { value: "quoted", label: "견적 안내" },
  { value: "paid", label: "입금 확인" },
  { value: "drafting", label: "시안 작업" },
  { value: "confirmed", label: "시안 확정" },
  { value: "printing", label: "인쇄 진행" },
  { value: "shipped", label: "배송 완료" },
  { value: "done", label: "완료" },
  { value: "cancelled", label: "취소" },
];

export const PARENTS_NOTATION_DEFAULT =
  "김아빠, 이엄마 의 장남 철수\n박아빠, 최엄마 의 장녀 영희";

export const GREETING_DEFAULT =
  "서로의 가장 좋은 계절이 되어\n두 사람이 같은 방향을 바라보며 걸어가려 합니다.\n소중한 분들을 모시고\n따뜻한 시작을 함께 나누고 싶습니다.";

export const PARENTS_NOTATION_PLACEHOLDER = PARENTS_NOTATION_DEFAULT;

export const GREETING_PLACEHOLDER = GREETING_DEFAULT;

export const createInitialFormData = (): ApplicationFormData => ({
  ordererName: "",
  ordererContact: "",
  communicationMethod: "email",
  ordererEmail: "",
  ordererKakaoId: "",

  paperType: "엽서형",
  templateId: "",
  invitationQty: "100",
  invitationQtyCustom: "",
  envelopeQty: "100",
  envelopeQtyMode: "same",
  envelopeQtyCustom: "",
  sealingWaxQty: "100",
  sealingWaxQtyCustom: "",

  weddingDateTime: "",
  desiredReceiveDate: "",
  venueName: "",
  venueAddress: "",
  groomName: "",
  brideName: "",
  coverEnglishName: "",
  coverTitleText: "",
  parentsNotation: "",
  greetingText: "",
  additionalWeddingInfo: "",
  ordererMessage: "",

  recipientName: "",
  recipientContact: "",
  shippingAddress: "",
  shippingMemo: "",

  agreeTemplate: false,
  agreeShipping: false,
  agreeRevisionPolicy: false,
  agreeNotPayment: false,
});

export const getStatusLabel = (status: ApplicationStatus | string) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
