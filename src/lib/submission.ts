import { TEMPLATES } from "./constants";
import type { AccountSlot, ApplicationFormData } from "../types";

export const resolveCustomQty = (selected: string, custom: string) =>
  selected === "기타" ? custom.trim() : selected;

export const getNumericInvitationQty = (selected: string, custom: string) => {
  const source = selected === "기타" ? custom : selected;
  const parsed = Number.parseInt(source.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const calculateEnvelopeQty = (
  mode: string,
  invitationQty: string,
  invitationQtyCustom: string,
  envelopeQtyCustom: string,
) => {
  if (mode === "custom") {
    return envelopeQtyCustom.trim();
  }

  const baseQty = getNumericInvitationQty(invitationQty, invitationQtyCustom);
  if (!baseQty) {
    return "";
  }

  if (mode === "plus10") {
    return String(baseQty + 10);
  }

  if (mode === "plus20") {
    return String(baseQty + 20);
  }

  return String(baseQty);
};

export const getSelectedTemplate = (formData: ApplicationFormData) =>
  TEMPLATES[formData.paperType]?.find(
    (template) => template.id === formData.templateId,
  );

export const buildPayload = (
  formData: ApplicationFormData,
  accounts: AccountSlot[],
) => {
  const selectedTemplate = getSelectedTemplate(formData);

  return {
    ...formData,
    accounts,
    invitationQtyFinal: resolveCustomQty(
      formData.invitationQty,
      formData.invitationQtyCustom,
    ),
    envelopeQtyFinal: formData.envelopeQty,
    sealingWaxQtyFinal: resolveCustomQty(
      formData.sealingWaxQty,
      formData.sealingWaxQtyCustom,
    ),
    templateName: selectedTemplate?.name || "",
    submittedAt: new Date().toISOString(),
  };
};

export const mapApplicationInsert = (
  applicationId: string,
  formData: ApplicationFormData,
  accounts: AccountSlot[],
) => {
  const payload = buildPayload(formData, accounts);

  return {
    id: applicationId,
    submitted_at: payload.submittedAt,
    status: "new",
    orderer_name: formData.ordererName.trim(),
    orderer_contact: formData.ordererContact.trim(),
    communication_method: formData.communicationMethod,
    orderer_email: formData.ordererEmail.trim() || null,
    orderer_kakao_id: formData.ordererKakaoId.trim() || null,
    paper_type: formData.paperType,
    template_id: formData.templateId,
    template_name: payload.templateName,
    invitation_qty: formData.invitationQty,
    invitation_qty_custom: formData.invitationQtyCustom.trim() || null,
    invitation_qty_final: payload.invitationQtyFinal,
    envelope_qty: formData.envelopeQty,
    envelope_qty_mode: formData.envelopeQtyMode,
    envelope_qty_custom: formData.envelopeQtyCustom.trim() || null,
    envelope_qty_final: payload.envelopeQtyFinal,
    sealing_wax_qty: formData.sealingWaxQty,
    sealing_wax_qty_custom: formData.sealingWaxQtyCustom.trim() || null,
    sealing_wax_qty_final: payload.sealingWaxQtyFinal,
    wedding_date_time: formData.weddingDateTime,
    desired_receive_date: formData.desiredReceiveDate,
    venue_name: formData.venueName.trim(),
    venue_address: formData.venueAddress.trim(),
    groom_name: formData.groomName.trim(),
    bride_name: formData.brideName.trim(),
    cover_english_name: formData.coverEnglishName.trim() || null,
    cover_title_text: formData.coverTitleText.trim() || null,
    parents_notation: formData.parentsNotation.trim() || null,
    greeting_text: formData.greetingText.trim() || null,
    additional_wedding_info: formData.additionalWeddingInfo.trim() || null,
    recipient_name: formData.recipientName.trim(),
    recipient_contact: formData.recipientContact.trim(),
    shipping_address: formData.shippingAddress.trim(),
    agree_template: formData.agreeTemplate,
    agree_shipping: formData.agreeShipping,
    agree_revision_policy: formData.agreeRevisionPolicy,
    agree_not_payment: formData.agreeNotPayment,
    raw_payload: payload,
  };
};

export const mapAccountInsertRows = (
  applicationId: string,
  accounts: AccountSlot[],
) =>
  accounts
    .map((account, index) => ({
      application_id: applicationId,
      slot_order: index + 1,
      bank: account.bank.trim() || null,
      relation: account.relation.trim() || null,
      relation_custom: account.relationCustom?.trim() || null,
      account_number: account.accountNumber.trim() || null,
    }))
    .filter(
      (account) =>
        account.bank ||
        account.relation ||
        account.relation_custom ||
        account.account_number ||
        accounts[account.slot_order - 1]?.bankCustom?.trim() ||
        accounts[account.slot_order - 1]?.accountHolder?.trim(),
    );
