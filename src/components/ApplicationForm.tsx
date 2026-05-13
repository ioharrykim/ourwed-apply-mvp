import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import ourwedLogo from "../assets/ourwed-logo.svg";
import {
  ENVELOPE_QTY_MODES,
  GREETING_DEFAULT,
  GREETING_PLACEHOLDER,
  INITIAL_ACCOUNTS,
  PARENTS_NOTATION_DEFAULT,
  PARENTS_NOTATION_PLACEHOLDER,
  QUANTITY_OPTIONS,
  TEMPLATES,
  createInitialFormData,
} from "../lib/constants";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  calculateEnvelopeQty,
  mapAccountInsertRows,
  mapApplicationInsert,
} from "../lib/submission";
import type { AccountSlot, ApplicationFormData, Template } from "../types";

const FORM_STEPS = [
  { title: "주문자 정보", caption: "연락받을 분의 기본 정보를 입력해 주세요." },
  { title: "상품 선택", caption: "지류 형태, 템플릿, 수량을 선택해 주세요." },
  { title: "예식 정보", caption: "예식 일시와 장소, 성함을 확인합니다." },
  { title: "인쇄 문구", caption: "청첩장에 들어갈 문구와 계좌 안내입니다." },
  { title: "배송 정보", caption: "제작 완료 후 받을 주소를 입력해 주세요." },
  { title: "동의 및 접수", caption: "정책 확인 후 접수를 완료합니다." },
];

const TemplateArtwork = ({ template }: { template: Template }) => {
  const toneClasses: Record<string, string> = {
    quiet: "bg-[#f7f6f2] border-[#e6e0d8]",
    warm: "bg-[#f3eee8] border-[#ddccbd]",
    cream: "bg-[#fbf8ed] border-[#e7d9b1]",
    green: "bg-[#eef4ed] border-[#c8d9c4]",
    gold: "bg-[#f8f1df] border-[#d7bd73]",
    rose: "bg-[#fbf0f2] border-[#e5bbc4]",
  };

  return (
    <div
      className={`h-full w-full border ${toneClasses[template.tone] || toneClasses.quiet} p-4`}
    >
      <div className="flex h-full flex-col items-center justify-between border border-black/10 bg-white/70 px-4 py-6 text-center">
        <div className="h-px w-12 bg-black/20" />
        <div>
          <p className="text-[10px] uppercase text-gray-500">ourwed</p>
          <p className="mt-3 text-sm font-medium text-ourwed-main">
            {template.name}
          </p>
        </div>
        <div className="space-y-1">
          <div className="mx-auto h-px w-16 bg-black/20" />
          <div className="mx-auto h-px w-10 bg-black/20" />
        </div>
      </div>
    </div>
  );
};

export default function ApplicationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const [formData, setFormData] = useState<ApplicationFormData>(
    createInitialFormData,
  );
  const [isRecipientSameAsOrderer, setIsRecipientSameAsOrderer] =
    useState(false);
  const [accounts, setAccounts] = useState<AccountSlot[]>(INITIAL_ACCOUNTS);

  const currentStepMeta = FORM_STEPS[currentStep];
  const isLastStep = currentStep === FORM_STEPS.length - 1;
  const progressPercent = ((currentStep + 1) / FORM_STEPS.length) * 100;
  const allRequiredAgreementsChecked =
    formData.agreeTemplate &&
    formData.agreeShipping &&
    formData.agreeRevisionPolicy &&
    formData.agreeNotPayment;

  const selectedTemplate = useMemo(
    () =>
      TEMPLATES[formData.paperType]?.find(
        (template) => template.id === formData.templateId,
      ) || null,
    [formData.paperType, formData.templateId],
  );

  useEffect(() => {
    if (!isRecipientSameAsOrderer) {
      return;
    }

    setFormData((prev) => {
      if (
        prev.recipientName === prev.ordererName &&
        prev.recipientContact === prev.ordererContact
      ) {
        return prev;
      }

      return {
        ...prev,
        recipientName: prev.ordererName,
        recipientContact: prev.ordererContact,
      };
    });
  }, [
    isRecipientSameAsOrderer,
    formData.ordererName,
    formData.ordererContact,
  ]);

  const scrollToTop = () => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "communicationMethod") {
        newData.ordererEmail = "";
        newData.ordererKakaoId = "";
      }

      if (name === "paperType") {
        newData.templateId = "";
      }

      if (
        name === "invitationQty" ||
        name === "invitationQtyCustom" ||
        name === "envelopeQtyMode" ||
        name === "envelopeQtyCustom"
      ) {
        newData.envelopeQty = calculateEnvelopeQty(
          newData.envelopeQtyMode,
          newData.invitationQty,
          newData.invitationQtyCustom,
          newData.envelopeQtyCustom,
        );
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
        id: crypto.randomUUID(),
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

  const validateStep = (stepIndex: number) => {
    if (stepIndex === 0) {
      if (!formData.ordererName.trim()) return "주문자 성함을 입력해 주세요.";
      if (!formData.ordererContact.trim()) return "주문자 연락처를 입력해 주세요.";
      if (formData.communicationMethod === "email" && !formData.ordererEmail.trim())
        return "이메일을 입력해 주세요.";
      if (
        formData.communicationMethod === "kakao" &&
        !formData.ordererKakaoId.trim()
      )
        return "카카오톡 ID를 입력해 주세요.";
    }

    if (stepIndex === 1) {
      if (!formData.templateId) return "디자인 템플릿을 선택해 주세요.";
      if (
        formData.invitationQty === "기타" &&
        !formData.invitationQtyCustom.trim()
      ) {
        return "청첩장 인쇄 수량(직접입력)을 입력해 주세요.";
      }
      if (
        formData.envelopeQtyMode === "custom" &&
        !formData.envelopeQtyCustom.trim()
      ) {
        return "봉투 수량(직접입력)을 입력해 주세요.";
      }
      if (!formData.envelopeQty.trim()) {
        return "봉투 수량 계산을 위해 청첩장 수량을 입력해 주세요.";
      }
      if (
        formData.sealingWaxQty === "기타" &&
        !formData.sealingWaxQtyCustom.trim()
      ) {
        return "실링왁스 스티커 수량(직접입력)을 입력해 주세요.";
      }
    }

    if (stepIndex === 2) {
      if (!formData.weddingDateTime) return "예식 일시를 선택해 주세요.";
      if (!formData.desiredReceiveDate)
        return "청첩장 수령 희망일을 입력해 주세요.";
      if (!formData.venueName.trim()) return "예식장 명을 입력해 주세요.";
      if (!formData.venueAddress.trim()) return "예식장 상세 주소를 입력해 주세요.";
      if (!formData.groomName.trim()) return "신랑 성함을 입력해 주세요.";
      if (!formData.brideName.trim()) return "신부 성함을 입력해 주세요.";
    }

    if (stepIndex === 3) {
      if (!formData.parentsNotation.trim())
        return "혼주 표기 방식을 입력하거나 기본값을 적용해 주세요.";
      if (!formData.greetingText.trim())
        return "초대 인사말을 입력하거나 기본값을 적용해 주세요.";
    }

    if (stepIndex === 4) {
      if (!formData.recipientName.trim()) return "수령인 성함을 입력해 주세요.";
      if (!formData.recipientContact.trim()) return "수령인 연락처를 입력해 주세요.";
      if (!formData.shippingAddress.trim()) return "배송지 주소를 입력해 주세요.";
    }

    if (stepIndex === 5) {
      if (!formData.agreeTemplate)
        return "템플릿 기반 제작 동의에 체크해 주세요.";
      if (!formData.agreeShipping) return "배송 정책 동의에 체크해 주세요.";
      if (!formData.agreeRevisionPolicy)
        return "수정/환불 정책 동의에 체크해 주세요.";
      if (!formData.agreeNotPayment) return "접수 단계 확인에 체크해 주세요.";
    }

    return null;
  };

  const validateForm = () => {
    for (let index = 0; index < FORM_STEPS.length; index += 1) {
      const error = validateStep(index);
      if (error) {
        setCurrentStep(index);
        setAlertMessage(error);
        scrollToTop();
        return false;
      }
    }

    return true;
  };

  const goNext = () => {
    const error = validateStep(currentStep);
    if (error) {
      setAlertMessage(error);
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, FORM_STEPS.length - 1));
    scrollToTop();
  };

  const goPrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    scrollToTop();
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setAlertMessage(
        "관리자 설정이 필요합니다. Supabase URL과 anon key를 환경변수에 입력해 주세요.",
      );
      return;
    }

    setIsSubmitting(true);

    const applicationId = crypto.randomUUID();
    const applicationRow = mapApplicationInsert(
      applicationId,
      formData,
      accounts,
    );
    const accountRows = mapAccountInsertRows(applicationId, accounts);

    try {
      const { error: applicationError } = await supabase
        .from("applications")
        .insert(applicationRow);

      if (applicationError) {
        throw applicationError;
      }

      if (accountRows.length > 0) {
        const { error: accountError } = await supabase
          .from("application_accounts")
          .insert(accountRows);

        if (accountError) {
          throw accountError;
        }
      }

      setShowSuccessModal(true);
      setCurrentStep(0);
      setFormData(createInitialFormData());
      setIsRecipientSameAsOrderer(false);
      setAccounts(INITIAL_ACCOUNTS);
    } catch (err) {
      console.error(err);
      setAlertMessage(
        "제출 중 오류가 발생했습니다. Supabase 테이블과 RLS 정책 적용 여부를 확인해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses =
    "w-full min-w-0 rounded-lg border border-gray-200 bg-white px-4 py-3 text-base transition-all placeholder-gray-400 focus:border-ourwed-main focus:outline-none focus:ring-1 focus:ring-ourwed-main";
  const readOnlyInputClasses =
    "w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-500 transition-all placeholder-gray-400 focus:border-ourwed-main focus:outline-none focus:ring-1 focus:ring-ourwed-main";
  const labelClasses =
    "mb-2 block text-[13px] font-medium uppercase text-gray-500";
  const choiceClasses = (selected: boolean) =>
    `cursor-pointer rounded-lg border px-3 py-3 text-center text-[14px] transition-all ${
      selected
        ? "border-ourwed-main bg-ourwed-main text-white"
        : "border-gray-200 text-gray-600 hover:bg-gray-50"
    }`;
  const RequiredMark = () => <span className="ml-1 text-red-500">*</span>;

  const renderOrdererStep = () => (
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
        <div className="mb-3 grid grid-cols-2 gap-3">
          {["email", "kakao"].map((method) => (
            <label
              key={method}
              className={choiceClasses(formData.communicationMethod === method)}
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
            name="ordererKakaoId"
            value={formData.ordererKakaoId}
            onChange={handleInputChange}
            className={inputClasses}
            placeholder="카카오톡 ID 또는 카카오채널 채팅에서 사용하시는 닉네임"
          />
        )}
      </div>
    </div>
  );

  const renderProductStep = () => (
    <div className="space-y-6">
      <div>
        <label className={labelClasses}>지류 형태</label>
        <div className="grid grid-cols-3 gap-3">
          {["엽서형", "2단 접지", "3단 접지"].map((type) => (
            <label key={type} className={choiceClasses(formData.paperType === type)}>
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
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {TEMPLATES[formData.paperType]?.map((template) => {
            const selected = formData.templateId === template.id;

            return (
              <div
                key={template.id}
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    templateId: template.id,
                  }))
                }
                className={`relative cursor-pointer overflow-hidden rounded-lg border-2 bg-white transition-all ${
                  selected
                    ? "border-ourwed-main shadow-md"
                    : "border-gray-100 hover:border-gray-300"
                }`}
              >
                <div className="relative aspect-[2/3] w-full">
                  <TemplateArtwork template={template} />
                  {selected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ourwed-main/10">
                      <div className="rounded-full bg-ourwed-main p-1.5 text-white shadow-sm">
                        <Check size={20} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-100 bg-white p-3">
                  <p
                    className={`text-center text-[13px] font-medium ${
                      selected ? "text-ourwed-main" : "text-gray-500"
                    }`}
                  >
                    {template.name}
                  </p>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPreviewTemplate(template);
                    }}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-gray-200 px-2 py-2 text-[12px] text-gray-600 transition-colors hover:border-ourwed-main hover:text-ourwed-main"
                  >
                    <Eye size={14} />
                    자세히 보기
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClasses}>청첩장 인쇄 수량</label>
          <select
            name="invitationQty"
            value={formData.invitationQty}
            onChange={handleInputChange}
            className={inputClasses}
          >
            {QUANTITY_OPTIONS.map((opt) => (
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
          <div className="grid grid-cols-2 gap-2">
            {ENVELOPE_QTY_MODES.map((mode) => (
              <label
                key={mode.value}
                className={choiceClasses(formData.envelopeQtyMode === mode.value)}
              >
                <input
                  type="radio"
                  name="envelopeQtyMode"
                  value={mode.value}
                  checked={formData.envelopeQtyMode === mode.value}
                  onChange={handleInputChange}
                  className="hidden"
                />
                {mode.label}
              </label>
            ))}
          </div>
          {formData.envelopeQtyMode === "custom" && (
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
          <p className="mt-2 text-[12px] text-gray-400">
            최종 봉투 수량: {formData.envelopeQty ? `${formData.envelopeQty}매` : "-"}
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClasses}>실링왁스 스티커</label>
          <select
            name="sealingWaxQty"
            value={formData.sealingWaxQty}
            onChange={handleInputChange}
            className={inputClasses}
          >
            {["선택 안함", ...QUANTITY_OPTIONS].map((opt) => (
              <option key={opt} value={opt}>
                {opt === "기타"
                  ? "기타 (직접입력)"
                  : opt === "선택 안함"
                    ? opt
                    : `${opt}매`}
              </option>
            ))}
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
  );

  const renderWeddingStep = () => (
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
      <div>
        <label className={labelClasses}>
          청첩장 수령 희망일 <RequiredMark />
        </label>
        <input
          type="date"
          name="desiredReceiveDate"
          value={formData.desiredReceiveDate}
          onChange={handleInputChange}
          className={inputClasses}
        />
        <p className="mt-1 text-[12px] text-gray-400">
          예식일 최소 3주 전을 권장드립니다
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
    </div>
  );

  const renderPrintTextStep = () => (
    <div className="space-y-6">
      {(formData.paperType === "2단 접지" ||
        formData.paperType === "3단 접지") && (
        <div className="grid grid-cols-1 gap-5 border-b border-gray-100 pb-5 sm:grid-cols-2">
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

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="block text-[13px] font-medium uppercase text-gray-500">
            혼주 표기 방식 <RequiredMark />
          </label>
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                parentsNotation: PARENTS_NOTATION_DEFAULT,
              }))
            }
            className="shrink-0 rounded-md border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:border-ourwed-main hover:text-ourwed-main"
          >
            기본값 적용
          </button>
        </div>
        <textarea
          name="parentsNotation"
          value={formData.parentsNotation}
          onChange={handleInputChange}
          className={`${inputClasses} min-h-[92px] resize-none leading-relaxed`}
          placeholder={PARENTS_NOTATION_PLACEHOLDER}
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="block text-[13px] font-medium uppercase text-gray-500">
            초대 인사말 <RequiredMark />
          </label>
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                greetingText: GREETING_DEFAULT,
              }))
            }
            className="shrink-0 rounded-md border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:border-ourwed-main hover:text-ourwed-main"
          >
            기본값 적용
          </button>
        </div>
        <textarea
          name="greetingText"
          value={formData.greetingText}
          onChange={handleInputChange}
          className={`${inputClasses} min-h-[132px] resize-none leading-relaxed`}
          placeholder={GREETING_PLACEHOLDER}
        />
      </div>
      <div>
        <label className={labelClasses}>예식 관련 추가 정보 (선택)</label>
        <textarea
          name="additionalWeddingInfo"
          value={formData.additionalWeddingInfo}
          onChange={handleInputChange}
          className={`${inputClasses} min-h-[92px] resize-none leading-relaxed`}
          placeholder="예식장 주차, 대중교통 정보, 예식 진행 방식(천주교식 등) 추가 정보를 자유롭게 입력해 주세요."
        />
      </div>
      <div>
        <label className={labelClasses}>담당자에게 전달할 사항 (선택)</label>
        <textarea
          name="ordererMessage"
          value={formData.ordererMessage}
          onChange={handleInputChange}
          className={`${inputClasses} min-h-[92px] resize-none leading-relaxed`}
          placeholder="문구, 일정, 제작 방향 등 주문 전 미리 전달하고 싶은 내용을 자유롭게 적어주세요."
        />
      </div>

      <div className="border-t border-gray-100 pt-5">
        <label className={labelClasses}>계좌 및 연락처 안내 (선택)</label>
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 md:grid-cols-12 md:items-start"
            >
                <select
                  value={acc.bank}
                  onChange={(e) =>
                    handleAccountChange(acc.id, "bank", e.target.value)
                  }
                  className="w-full min-w-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-base focus:border-ourwed-main focus:outline-none md:col-span-3"
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
                <div className="flex w-full min-w-0 flex-col gap-2 md:col-span-4">
                  <select
                    value={acc.relation}
                    onChange={(e) =>
                      handleAccountChange(acc.id, "relation", e.target.value)
                    }
                    className="w-full min-w-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-base focus:border-ourwed-main focus:outline-none"
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
                      className="w-full min-w-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-base focus:border-ourwed-main focus:outline-none"
                    />
                  )}
                </div>
                <input
                  type="text"
                  value={acc.accountNumber}
                  onChange={(e) =>
                    handleAccountChange(acc.id, "accountNumber", e.target.value)
                  }
                  placeholder="계좌번호 (- 포함)"
                  className="w-full min-w-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-base focus:border-ourwed-main focus:outline-none md:col-span-4"
                />
                {accounts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAccountSlot(acc.id)}
                    className="justify-self-end rounded-md p-2 text-gray-400 transition-colors hover:bg-white hover:text-red-500 md:col-span-1 md:self-center md:justify-self-center"
                    aria-label="계좌 삭제"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
            </div>
          ))}
          <button
            type="button"
            onClick={addAccountSlot}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-3 text-[14px] text-gray-500 transition-all hover:border-ourwed-main hover:bg-gray-50 hover:text-ourwed-main"
          >
            <Plus size={16} /> 계좌 추가하기
          </button>
        </div>
      </div>
    </div>
  );

  const renderShippingStep = () => (
    <div className="space-y-5">
      <label className="flex cursor-pointer items-start gap-3">
        <div className="relative mt-0.5 flex items-center justify-center">
          <input
            type="checkbox"
            checked={isRecipientSameAsOrderer}
            onChange={(e) => setIsRecipientSameAsOrderer(e.target.checked)}
            className="peer h-5 w-5 appearance-none rounded-md border border-gray-300 transition-colors checked:border-ourwed-main checked:bg-ourwed-main"
          />
          <Check
            size={14}
            className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100"
          />
        </div>
        <span className="text-[14px] text-gray-600">주문자 정보와 동일합니다</span>
      </label>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClasses}>
            수령인 성함 <RequiredMark />
          </label>
          <input
            type="text"
            name="recipientName"
            value={formData.recipientName}
            onChange={handleInputChange}
            readOnly={isRecipientSameAsOrderer}
            className={isRecipientSameAsOrderer ? readOnlyInputClasses : inputClasses}
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
            readOnly={isRecipientSameAsOrderer}
            className={isRecipientSameAsOrderer ? readOnlyInputClasses : inputClasses}
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
          className={`${inputClasses} min-h-[92px] resize-none`}
          placeholder="우편번호 및 상세주소 포함"
        />
      </div>
      <div>
        <label className={labelClasses}>배송 요청사항 (선택)</label>
        <textarea
          name="shippingMemo"
          value={formData.shippingMemo}
          onChange={handleInputChange}
          className={`${inputClasses} min-h-[82px] resize-none`}
          placeholder="공동현관 비밀번호, 부재 시 요청사항 등 배송 관련 메모를 입력해 주세요."
        />
      </div>
    </div>
  );

  const renderAgreementStep = () => (
    <div className="space-y-5">
      {selectedTemplate && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-[14px] text-gray-600">
          선택한 템플릿은 <strong className="text-ourwed-main">{selectedTemplate.name}</strong>
          입니다. 제출 후 담당자가 내용 확인 및 견적 안내를 드립니다.
        </div>
      )}
      {[
        {
          name: "agreeTemplate",
          checked: formData.agreeTemplate,
          text: "[필수] ourwed는 템플릿 기반 제작이며, 레이아웃 변경이 제한됨을 동의합니다.",
        },
        {
          name: "agreeShipping",
          checked: formData.agreeShipping,
          text: "[필수] ourwed는 인쇄 손상 방지를 위해 청첩장을 펼친 상태로 배송하며, 봉투 삽입과 접지는 받으시는 분께서 직접 진행하시는 점에 동의합니다.",
        },
        {
          name: "agreeRevisionPolicy",
          checked: formData.agreeRevisionPolicy,
          text: "[필수] 시안 수정은 1회까지 무료이며, 2회차부터는 유료로 진행됩니다. 시안 확정 후에는 수정 및 환불이 불가함을 확인했습니다.",
        },
        {
          name: "agreeNotPayment",
          checked: formData.agreeNotPayment,
          text: "[필수] 폼 제출은 결제가 아닌 접수 단계임을 확인했습니다. 작성해주신 내용을 바탕으로 기입해주신 연락처로 진행 관련 메시지를 전달 드리겠습니다.",
        },
      ].map((agreement) => (
        <label key={agreement.name} className="flex cursor-pointer items-start gap-3">
          <div className="relative mt-0.5 flex items-center justify-center">
            <input
              type="checkbox"
              name={agreement.name}
              checked={agreement.checked}
              onChange={handleInputChange}
              className="peer h-5 w-5 appearance-none rounded-md border border-gray-300 transition-colors checked:border-ourwed-main checked:bg-ourwed-main"
            />
            <Check
              size={14}
              className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100"
            />
          </div>
          <span className="text-[14px] leading-relaxed text-gray-600">
            {agreement.text}
          </span>
        </label>
      ))}
      <p className="pt-2 text-center text-[12px] text-gray-500">
        제출 후 영업일 기준 1일 이내에 입력하신 연락처로 견적 및 입금 안내를
        보내드립니다.
      </p>
    </div>
  );

  const renderCurrentStep = () => {
    if (currentStep === 0) return renderOrdererStep();
    if (currentStep === 1) return renderProductStep();
    if (currentStep === 2) return renderWeddingStep();
    if (currentStep === 3) return renderPrintTextStep();
    if (currentStep === 4) return renderShippingStep();
    return renderAgreementStep();
  };

  return (
    <div className="min-h-screen overflow-x-hidden pb-36 sm:pb-32">
      <header className="px-6 pb-8 pt-14 text-center">
        <div className="mb-4 inline-flex items-center justify-center">
          <img src={ourwedLogo} alt="ourwed" className="h-9 w-auto" />
        </div>
        <p className="text-sm uppercase text-gray-500">지류 청첩장 주문 접수</p>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="mb-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-[12px] font-medium uppercase text-gray-400">
                {currentStep + 1} / {FORM_STEPS.length}
              </p>
              <h1 className="mt-1 text-xl font-semibold text-ourwed-main">
                {currentStepMeta.title}
              </h1>
            </div>
            <div className="min-w-[88px] rounded-md bg-ourwed-sub px-3 py-2 text-center text-[13px] text-ourwed-main">
              {Math.round(progressPercent)}%
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-ourwed-main transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <section className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
          <p className="mb-6 text-[14px] text-gray-500">
            {currentStepMeta.caption}
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-white via-white/95 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        <div className="mx-auto max-w-2xl">
          <div className="grid grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)] gap-2 rounded-lg border border-gray-100 bg-white/95 p-2 shadow-lg backdrop-blur-sm">
            <button
              type="button"
              onClick={goPrevious}
              disabled={currentStep === 0 || isSubmitting}
              className="flex items-center justify-center gap-2 rounded-md border border-gray-200 py-4 text-[15px] font-medium text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={17} />
              이전
            </button>
            <button
              type="button"
              onClick={isLastStep ? handleSubmit : goNext}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-md bg-ourwed-main py-4 text-[16px] font-medium text-white shadow-lg transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? "접수 중..."
                : isLastStep
                  ? allRequiredAgreementsChecked
                    ? "주문 접수하기"
                    : "동의 후 접수하기"
                  : "다음"}
              {!isLastStep && <ArrowRight size={17} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {previewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <div>
                  <p className="text-[12px] uppercase text-gray-400">
                    Template Preview
                  </p>
                  <h3 className="text-lg font-semibold text-ourwed-main">
                    {previewTemplate.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ourwed-main"
                  aria-label="미리보기 닫기"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mx-auto aspect-[2/3] w-full max-w-[320px] p-5">
                <TemplateArtwork template={previewTemplate} />
              </div>
              <div className="border-t border-gray-100 p-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      templateId: previewTemplate.id,
                    }));
                    setPreviewTemplate(null);
                  }}
                  className="w-full rounded-md bg-ourwed-main py-3 text-[15px] font-medium text-white transition-colors hover:bg-black"
                >
                  이 템플릿 선택
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                <X size={24} />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-ourwed-main">안내</h3>
              <p className="mb-6 text-[15px] text-gray-600">{alertMessage}</p>
              <button
                type="button"
                onClick={() => setAlertMessage("")}
                className="w-full rounded-md bg-ourwed-sub py-3 font-medium text-ourwed-main transition-colors hover:bg-gray-200"
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-2xl"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-ourwed-main text-white shadow-lg">
                <Check size={32} />
              </div>
              <h3 className="mb-3 text-2xl font-semibold text-ourwed-main">
                주문 접수가 완료되었습니다.
              </h3>
              <p className="mb-8 text-[15px] leading-relaxed text-gray-500">
                소중한 날을 ourwed와 함께 해주셔서 감사합니다.
                <br />
                담당자가 확인 후 기재해주신 연락처로
                <br />
                안내를 도와드리겠습니다.
              </p>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full rounded-md bg-ourwed-main py-4 font-medium text-white transition-colors hover:bg-black"
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
