import React, { useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ourwedLogo from "./assets/ourwed-logo.svg";

interface AccountSlot {
  id: string;
  bank: string;
  relation: string;
  relationCustom?: string;
  accountNumber: string;
}

interface Template {
  id: string;
  name: string;
  imageUrl: string;
}

const TEMPLATES: Record<string, Template[]> = {
  엽서형: [
    {
      id: "pc-01",
      name: "클래식 화이트",
      imageUrl: "https://picsum.photos/seed/postcard1/400/600?blur=2",
    },
    {
      id: "pc-02",
      name: "모던 베이지",
      imageUrl: "https://picsum.photos/seed/postcard2/400/600?blur=2",
    },
  ],
  "2단 접지": [
    {
      id: "fold2-01",
      name: "엘레강스 크림",
      imageUrl: "https://picsum.photos/seed/fold2-1/400/600?blur=2",
    },
    {
      id: "fold2-02",
      name: "보태니컬 그린",
      imageUrl: "https://picsum.photos/seed/fold2-2/400/600?blur=2",
    },
  ],
  "3단 접지": [
    {
      id: "fold3-01",
      name: "프리미엄 골드",
      imageUrl: "https://picsum.photos/seed/fold3-1/400/600?blur=2",
    },
    {
      id: "fold3-02",
      name: "로맨틱 핑크",
      imageUrl: "https://picsum.photos/seed/fold3-2/400/600?blur=2",
    },
  ],
};

const INITIAL_ACCOUNTS: AccountSlot[] = [
  { id: "1", bank: "", relation: "", relationCustom: "", accountNumber: "" },
  { id: "2", bank: "", relation: "", relationCustom: "", accountNumber: "" },
];

const DEFAULT_PARENTS_NOTATION =
  "김아빠, 이엄마 의 장남 철수\n박아빠, 최엄마 의 장녀 영희";
const DEFAULT_GREETING =
  "두 사람이 사랑으로 만나\n진실과 이해로써 하나를 이루려 합니다.\n이 태어남을 축복해 주시면\n더없는 기쁨으로 간직하겠습니다.";
const PLACEHOLDER_WEBHOOK_URL =
  "https://script.google.com/macros/s/placeholder/exec";

const GOOGLE_SCRIPT_WEBHOOK_URL =
  import.meta.env.VITE_GOOGLE_SCRIPT_WEB_APP_URL ||
  import.meta.env.VITE_WEBHOOK_URL ||
  "";

const createInitialFormData = () => ({
  ordererName: "",
  ordererContact: "",
  communicationMethod: "email",
  ordererEmail: "",
  ordererKakao: "",

  paperType: "엽서형",
  templateId: "",
  invitationQty: "100",
  invitationQtyCustom: "",
  envelopeQty: "100",
  envelopeQtyCustom: "",
  sealingWaxQty: "100",
  sealingWaxQtyCustom: "",

  weddingDateTime: "",
  venueName: "",
  venueAddress: "",
  groomName: "",
  brideName: "",
  coverEnglishName: "",
  coverTitleText: "",
  parentsNotation: DEFAULT_PARENTS_NOTATION,
  greetingText: DEFAULT_GREETING,
  additionalWeddingInfo: "",

  recipientName: "",
  recipientContact: "",
  shippingAddress: "",

  agreeTemplate: false,
  agreeNotPayment: false,
});

const resolveCustomQty = (selected: string, custom: string) =>
  selected === "기타" ? custom.trim() : selected;

export default function App() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const [formData, setFormData] = useState(createInitialFormData);

  const [accounts, setAccounts] = useState<AccountSlot[]>(INITIAL_ACCOUNTS);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      if (name === "paperType") {
        newData.templateId = "";
      }
      return newData;
    });
  };

  const handleAccountChange = (
    id: string,
    field: keyof AccountSlot,
    value: string,
  ) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, [field]: value } : acc)),
    );
  };

  const addAccountSlot = () => {
    setAccounts((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        bank: "",
        relation: "",
        relationCustom: "",
        accountNumber: "",
      },
    ]);
  };

  const removeAccountSlot = (id: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
  };

  const validateForm = () => {
    if (!formData.ordererName) return "주문자 성함을 입력해 주세요.";
    if (!formData.ordererContact) return "주문자 연락처를 입력해 주세요.";
    if (formData.communicationMethod === "email" && !formData.ordererEmail)
      return "이메일을 입력해 주세요.";
    if (formData.communicationMethod === "kakao" && !formData.ordererKakao)
      return "카카오톡 ID를 입력해 주세요.";
    if (!formData.templateId) return "디자인 템플릿을 선택해 주세요.";
    if (!formData.weddingDateTime) return "예식 일시를 선택해 주세요.";
    if (!formData.venueName) return "예식장 명을 입력해 주세요.";
    if (!formData.venueAddress) return "예식장 상세 주소를 입력해 주세요.";
    if (!formData.groomName) return "신랑 성함을 입력해 주세요.";
    if (!formData.brideName) return "신부 성함을 입력해 주세요.";
    if (!formData.recipientName) return "수령인 성함을 입력해 주세요.";
    if (!formData.recipientContact) return "수령인 연락처를 입력해 주세요.";
    if (!formData.shippingAddress) return "배송지 주소를 입력해 주세요.";
    if (!formData.agreeTemplate)
      return "템플릿 기반 제작 동의에 체크해 주세요.";
    if (!formData.agreeNotPayment) return "접수 단계 확인에 체크해 주세요.";
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      setAlertMessage(error);
      return;
    }

    if (
      !GOOGLE_SCRIPT_WEBHOOK_URL ||
      GOOGLE_SCRIPT_WEBHOOK_URL === PLACEHOLDER_WEBHOOK_URL
    ) {
      setAlertMessage(
        "관리자 설정이 필요합니다. Google Apps Script 웹앱 URL을 환경변수에 입력해 주세요.",
      );
      return;
    }

    if (
      formData.invitationQty === "기타" &&
      !formData.invitationQtyCustom.trim()
    ) {
      setAlertMessage("청첩장 인쇄 수량(직접입력)을 입력해 주세요.");
      return;
    }

    if (formData.envelopeQty === "기타" && !formData.envelopeQtyCustom.trim()) {
      setAlertMessage("봉투 수량(직접입력)을 입력해 주세요.");
      return;
    }

    if (
      formData.sealingWaxQty === "기타" &&
      !formData.sealingWaxQtyCustom.trim()
    ) {
      setAlertMessage("실링왁스 스티커 수량(직접입력)을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    const selectedTemplate = TEMPLATES[formData.paperType]?.find(
      (template) => template.id === formData.templateId,
    );

    const payload = {
      ...formData,
      accounts,
      invitationQtyFinal: resolveCustomQty(
        formData.invitationQty,
        formData.invitationQtyCustom,
      ),
      envelopeQtyFinal: resolveCustomQty(
        formData.envelopeQty,
        formData.envelopeQtyCustom,
      ),
      sealingWaxQtyFinal: resolveCustomQty(
        formData.sealingWaxQty,
        formData.sealingWaxQtyCustom,
      ),
      templateName: selectedTemplate?.name || "",
      submittedAt: new Date().toISOString(),
    };

    try {
      // GAS Web App accepts simple requests reliably from browser without CORS preflight.
      await fetch(GOOGLE_SCRIPT_WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      setShowSuccessModal(true);

      // Reset form
      setFormData(createInitialFormData());
      setAccounts(INITIAL_ACCOUNTS);
    } catch (err) {
      console.error(err);
      setAlertMessage(
        "제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses =
    "w-full min-w-0 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-ourwed-main focus:ring-1 focus:ring-ourwed-main transition-all placeholder-gray-400";
  const labelClasses =
    "block text-[13px] font-medium text-gray-500 mb-2 uppercase tracking-wider";
  const RequiredMark = () => <span className="text-red-500 ml-1">*</span>;
  const sectionClasses =
    "bg-white rounded-3xl p-5 sm:p-8 mb-6 shadow-sm border border-gray-100";
  const sectionTitleClasses =
    "text-lg font-semibold text-ourwed-main mb-6 flex items-center";

  return (
    <div className="min-h-screen overflow-x-hidden pb-44 sm:pb-40">
      {/* Header */}
      <header className="pt-16 pb-12 px-6 text-center">
        <div className="inline-flex items-center justify-center mb-4">
          <img src={ourwedLogo} alt="ourwed" className="h-9 w-auto" />
        </div>
        <p className="text-sm text-gray-500 tracking-widest uppercase">
          지류 청첩장 주문 접수
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Section A: 주문자 정보 */}
        <section className={sectionClasses}>
          <h2 className={sectionTitleClasses}>
            <span className="w-6 h-6 rounded-full bg-ourwed-sub text-ourwed-main flex items-center justify-center text-xs mr-3">
              1
            </span>
            주문자 정보
          </h2>
          <div className="space-y-5">
            <div>
              <label className={labelClasses}>
                주문자 성함 <RequiredMark />
              </label>
              <input
                type="text"
                name="ordererName"
                value={formData.ordererName}
                onChange={handleInputChange}
                className={inputClasses}
                placeholder="홍길동"
              />
            </div>
            <div>
              <label className={labelClasses}>
                연락처 <RequiredMark />
              </label>
              <input
                type="tel"
                name="ordererContact"
                value={formData.ordererContact}
                onChange={handleInputChange}
                className={inputClasses}
                placeholder="01012345678 (- 없이 작성해 주세요)"
              />
            </div>
            <div>
              <label className={labelClasses}>
                소통 수단 <RequiredMark />
              </label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {["email", "kakao"].map((method) => (
                  <label
                    key={method}
                    className={`cursor-pointer border rounded-2xl py-3 text-center text-[14px] transition-all ${formData.communicationMethod === method ? "border-ourwed-main bg-ourwed-main text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                  >
                    <input
                      type="radio"
                      name="communicationMethod"
                      value={method}
                      checked={formData.communicationMethod === method}
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    {method === "email" ? "이메일" : "카카오톡"}
                  </label>
                ))}
              </div>
              {formData.communicationMethod === "email" ? (
                <input
                  type="email"
                  name="ordererEmail"
                  value={formData.ordererEmail}
                  onChange={handleInputChange}
                  className={inputClasses}
                  placeholder="example@ourwed.in"
                />
              ) : (
                <input
                  type="text"
                  name="ordererKakao"
                  value={formData.ordererKakao}
                  onChange={handleInputChange}
                  className={inputClasses}
                  placeholder="카카오톡 ID"
                />
              )}
            </div>
          </div>
        </section>

        {/* Section B: 상품 및 옵션 선택 */}
        <section className={sectionClasses}>
          <h2 className={sectionTitleClasses}>
            <span className="w-6 h-6 rounded-full bg-ourwed-sub text-ourwed-main flex items-center justify-center text-xs mr-3">
              2
            </span>
            상품 및 옵션 선택
          </h2>
          <div className="space-y-6">
            <div>
              <label className={labelClasses}>지류 형태</label>
              <div className="grid grid-cols-3 gap-3">
                {["엽서형", "2단 접지", "3단 접지"].map((type) => (
                  <label
                    key={type}
                    className={`cursor-pointer border rounded-2xl py-3 text-center text-[14px] transition-all ${formData.paperType === type ? "border-ourwed-main bg-ourwed-main text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                  >
                    <input
                      type="radio"
                      name="paperType"
                      value={type}
                      checked={formData.paperType === type}
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className={labelClasses}>
                디자인 템플릿 선택 <RequiredMark />
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
                {TEMPLATES[formData.paperType]?.map((template) => (
                  <div
                    key={template.id}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        templateId: template.id,
                      }))
                    }
                    className={`relative cursor-pointer rounded-2xl overflow-hidden border-2 transition-all ${
                      formData.templateId === template.id
                        ? "border-ourwed-main shadow-md"
                        : "border-transparent hover:border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="aspect-[2/3] w-full bg-gray-100 relative">
                      <img
                        src={template.imageUrl}
                        alt={template.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {formData.templateId === template.id && (
                        <div className="absolute inset-0 bg-ourwed-main/10 flex items-center justify-center">
                          <div className="bg-ourwed-main text-white rounded-full p-1.5 shadow-sm">
                            <Check size={20} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-white text-center border-t border-gray-100">
                      <p
                        className={`text-[13px] font-medium ${formData.templateId === template.id ? "text-ourwed-main" : "text-gray-500"}`}
                      >
                        {template.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClasses}>청첩장 인쇄 수량</label>
                <select
                  name="invitationQty"
                  value={formData.invitationQty}
                  onChange={handleInputChange}
                  className={inputClasses}
                >
                  {["100", "200", "300", "400", "500", "기타"].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "기타" ? "기타 (직접입력)" : `${opt}매`}
                    </option>
                  ))}
                </select>
                {formData.invitationQty === "기타" && (
                  <input
                    type="number"
                    name="invitationQtyCustom"
                    value={formData.invitationQtyCustom}
                    onChange={handleInputChange}
                    className={`mt-2 ${inputClasses}`}
                    placeholder="50단위 입력"
                    step="50"
                  />
                )}
              </div>
              <div>
                <label className={labelClasses}>봉투 수량</label>
                <select
                  name="envelopeQty"
                  value={formData.envelopeQty}
                  onChange={handleInputChange}
                  className={inputClasses}
                >
                  {["100", "200", "300", "400", "500", "기타"].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "기타" ? "기타 (직접입력)" : `${opt}매`}
                    </option>
                  ))}
                </select>
                {formData.envelopeQty === "기타" && (
                  <input
                    type="number"
                    name="envelopeQtyCustom"
                    value={formData.envelopeQtyCustom}
                    onChange={handleInputChange}
                    className={`mt-2 ${inputClasses}`}
                    placeholder="50단위 입력"
                    step="50"
                  />
                )}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClasses}>실링왁스 스티커</label>
                <select
                  name="sealingWaxQty"
                  value={formData.sealingWaxQty}
                  onChange={handleInputChange}
                  className={inputClasses}
                >
                  {["선택 안함", "100", "200", "300", "400", "500", "기타"].map(
                    (opt) => (
                      <option key={opt} value={opt}>
                        {opt === "기타"
                          ? "기타 (직접입력)"
                          : opt === "선택 안함"
                            ? opt
                            : `${opt}매`}
                      </option>
                    ),
                  )}
                </select>
                {formData.sealingWaxQty === "기타" && (
                  <input
                    type="number"
                    name="sealingWaxQtyCustom"
                    value={formData.sealingWaxQtyCustom}
                    onChange={handleInputChange}
                    className={`mt-2 ${inputClasses}`}
                    placeholder="50단위 입력"
                    step="50"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section C: 예식 정보 및 인쇄 문구 */}
        <section className={sectionClasses}>
          <h2 className={sectionTitleClasses}>
            <span className="w-6 h-6 rounded-full bg-ourwed-sub text-ourwed-main flex items-center justify-center text-xs mr-3">
              3
            </span>
            예식 정보 및 인쇄 문구
          </h2>
          <div className="space-y-6">
            <div>
              <label className={labelClasses}>
                예식 일시 <RequiredMark />
              </label>
              <input
                type="datetime-local"
                name="weddingDateTime"
                value={formData.weddingDateTime}
                onChange={handleInputChange}
                className={inputClasses}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClasses}>
                  예식장 명 <RequiredMark />
                </label>
                <input
                  type="text"
                  name="venueName"
                  value={formData.venueName}
                  onChange={handleInputChange}
                  className={inputClasses}
                  placeholder="아워웨드 호텔"
                />
              </div>
              <div>
                <label className={labelClasses}>
                  상세 주소 <RequiredMark />
                </label>
                <input
                  type="text"
                  name="venueAddress"
                  value={formData.venueAddress}
                  onChange={handleInputChange}
                  className={inputClasses}
                  placeholder="서울시 강남구 테헤란로 123 2층"
                />
              </div>
              <div>
                <label className={labelClasses}>
                  신랑 성함 <RequiredMark />
                </label>
                <input
                  type="text"
                  name="groomName"
                  value={formData.groomName}
                  onChange={handleInputChange}
                  className={inputClasses}
                  placeholder="김철수"
                />
              </div>
              <div>
                <label className={labelClasses}>
                  신부 성함 <RequiredMark />
                </label>
                <input
                  type="text"
                  name="brideName"
                  value={formData.brideName}
                  onChange={handleInputChange}
                  className={inputClasses}
                  placeholder="이영희"
                />
              </div>
            </div>

            {(formData.paperType === "2단 접지" ||
              formData.paperType === "3단 접지") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-gray-100">
                <div>
                  <label className={labelClasses}>표지 영문 이름</label>
                  <input
                    type="text"
                    name="coverEnglishName"
                    value={formData.coverEnglishName}
                    onChange={handleInputChange}
                    className={inputClasses}
                    placeholder="Cheolsu & Younghee"
                  />
                </div>
                <div>
                  <label className={labelClasses}>표지 타이틀 문구</label>
                  <input
                    type="text"
                    name="coverTitleText"
                    value={formData.coverTitleText}
                    onChange={handleInputChange}
                    className={inputClasses}
                    placeholder="We are getting married"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100">
              <label className={labelClasses}>혼주 표기 방식</label>
              <textarea
                name="parentsNotation"
                value={formData.parentsNotation}
                onChange={handleInputChange}
                className={`${inputClasses} min-h-[80px] resize-none leading-relaxed`}
              />
            </div>

            <div>
              <label className={labelClasses}>초대 인사말</label>
              <textarea
                name="greetingText"
                value={formData.greetingText}
                onChange={handleInputChange}
                className={`${inputClasses} min-h-[120px] resize-none leading-relaxed`}
              />
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className={labelClasses}>예식 관련 추가 정보</label>
              <textarea
                name="additionalWeddingInfo"
                value={formData.additionalWeddingInfo}
                onChange={handleInputChange}
                className={`${inputClasses} min-h-[80px] resize-none leading-relaxed`}
                placeholder="예식장 주차, 대중교통 정보, 예식 진행 방식(천주교식 등) 추가 정보를 자유롭게 입력해 주세요."
              />
            </div>

            {formData.paperType !== "엽서형" && (
              <div className="pt-4 border-t border-gray-100">
                <label className={labelClasses}>계좌 및 연락처 안내</label>
                <div className="space-y-3">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="grid grid-cols-1 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100 md:grid-cols-12 md:items-start"
                    >
                      <select
                        value={acc.bank}
                        onChange={(e) =>
                          handleAccountChange(acc.id, "bank", e.target.value)
                        }
                        className="w-full min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2 text-base focus:outline-none focus:border-ourwed-main md:col-span-3"
                      >
                        <option value="">은행 선택</option>
                        <option value="국민">국민</option>
                        <option value="신한">신한</option>
                        <option value="우리">우리</option>
                        <option value="하나">하나</option>
                        <option value="농협">농협</option>
                        <option value="기업">기업</option>
                        <option value="카카오뱅크">카카오뱅크</option>
                        <option value="토스뱅크">토스뱅크</option>
                        <option value="기타">기타</option>
                      </select>
                      <div className="w-full min-w-0 flex flex-col gap-2 md:col-span-4">
                        <select
                          value={acc.relation}
                          onChange={(e) =>
                            handleAccountChange(
                              acc.id,
                              "relation",
                              e.target.value,
                            )
                          }
                          className="w-full min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2 text-base focus:outline-none focus:border-ourwed-main"
                        >
                          <option value="">대상 선택</option>
                          <option value="신랑">신랑</option>
                          <option value="신부">신부</option>
                          <option value="신랑아버지">신랑아버지</option>
                          <option value="신랑어머니">신랑어머니</option>
                          <option value="신부아버지">신부아버지</option>
                          <option value="신부어머니">신부어머니</option>
                          <option value="기타">기타 (직접입력)</option>
                        </select>
                        {acc.relation === "기타" && (
                          <input
                            type="text"
                            value={acc.relationCustom || ""}
                            onChange={(e) =>
                              handleAccountChange(
                                acc.id,
                                "relationCustom",
                                e.target.value,
                              )
                            }
                            placeholder="직접 입력"
                            className="w-full min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2 text-base focus:outline-none focus:border-ourwed-main"
                          />
                        )}
                      </div>
                      <input
                        type="text"
                        value={acc.accountNumber}
                        onChange={(e) =>
                          handleAccountChange(
                            acc.id,
                            "accountNumber",
                            e.target.value,
                          )
                        }
                        placeholder="계좌번호 (- 포함)"
                        className="w-full min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2 text-base focus:outline-none focus:border-ourwed-main md:col-span-4"
                      />
                      {accounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAccountSlot(acc.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors justify-self-end md:col-span-1 md:justify-self-center md:self-center"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAccountSlot}
                    className="w-full py-3 border border-dashed border-gray-300 rounded-2xl text-[14px] text-gray-500 hover:bg-gray-50 hover:text-ourwed-main hover:border-ourwed-main transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> 계좌 추가하기
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section D: 배송 정보 */}
        <section className={sectionClasses}>
          <h2 className={sectionTitleClasses}>
            <span className="w-6 h-6 rounded-full bg-ourwed-sub text-ourwed-main flex items-center justify-center text-xs mr-3">
              4
            </span>
            배송 정보
          </h2>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClasses}>
                  수령인 성함 <RequiredMark />
                </label>
                <input
                  type="text"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleInputChange}
                  className={inputClasses}
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className={labelClasses}>
                  수령인 연락처 <RequiredMark />
                </label>
                <input
                  type="tel"
                  name="recipientContact"
                  value={formData.recipientContact}
                  onChange={handleInputChange}
                  className={inputClasses}
                  placeholder="01012345678"
                />
              </div>
            </div>
            <div>
              <label className={labelClasses}>
                배송지 주소 <RequiredMark />
              </label>
              <textarea
                name="shippingAddress"
                value={formData.shippingAddress}
                onChange={handleInputChange}
                className={`${inputClasses} min-h-[80px] resize-none`}
                placeholder="우편번호 및 상세주소 포함"
              />
            </div>
          </div>
        </section>

        {/* Agreements */}
        <section className="px-2 mb-8 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                type="checkbox"
                name="agreeTemplate"
                checked={formData.agreeTemplate}
                onChange={handleInputChange}
                className="peer appearance-none w-5 h-5 border border-gray-300 rounded-md checked:bg-ourwed-main checked:border-ourwed-main transition-colors"
              />
              <Check
                size={14}
                className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
              />
            </div>
            <span className="text-[14px] text-gray-600 group-hover:text-ourwed-main transition-colors">
              [필수] ourwed는 템플릿 기반 제작이며, 레이아웃 변경이 제한됨을
              동의합니다.
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                type="checkbox"
                name="agreeNotPayment"
                checked={formData.agreeNotPayment}
                onChange={handleInputChange}
                className="peer appearance-none w-5 h-5 border border-gray-300 rounded-md checked:bg-ourwed-main checked:border-ourwed-main transition-colors"
              />
              <Check
                size={14}
                className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
              />
            </div>
            <span className="text-[14px] text-gray-600 group-hover:text-ourwed-main transition-colors">
              [필수] 폼 제출은 결제가 아닌 접수 단계임을 확인했습니다.
              작성해주신 내용을 바탕으로 기입해주신 연락처로 진행 관련 메시지를
              전달 드리겠습니다.
            </span>
          </label>
        </section>
      </main>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-10 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] bg-gradient-to-t from-white via-white/95 to-transparent">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-3xl border border-gray-100 bg-white/95 p-2 shadow-lg backdrop-blur-sm">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-ourwed-main text-white py-4 rounded-2xl font-medium text-[16px] shadow-lg hover:bg-black transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  접수 중...
                </>
              ) : (
                "주문 접수하기"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                <X size={24} />
              </div>
              <h3 className="text-lg font-semibold text-ourwed-main mb-2">
                안내
              </h3>
              <p className="text-[15px] text-gray-600 mb-6">{alertMessage}</p>
              <button
                onClick={() => setAlertMessage("")}
                className="w-full bg-ourwed-sub text-ourwed-main py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 rounded-full bg-ourwed-main text-white flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Check size={32} />
              </div>
              <h3 className="text-2xl font-semibold text-ourwed-main mb-3">
                주문 접수가 완료되었습니다.
              </h3>
              <p className="text-[15px] text-gray-500 mb-8 leading-relaxed">
                소중한 날을 ourwed와 함께 해주셔서 감사합니다.
                <br />
                담당자가 확인 후 기재해주신 연락처로
                <br />
                안내를 도와드리겠습니다.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-ourwed-main text-white py-4 rounded-2xl font-medium hover:bg-black transition-colors"
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
