export interface AccountSlot {
  id: string;
  bank: string;
  relation: string;
  relationCustom?: string;
  accountNumber: string;
}

export interface Template {
  id: string;
  name: string;
  tone: string;
}

export type CommunicationMethod = "email" | "kakao";

export type ApplicationStatus =
  | "new"
  | "quoted"
  | "paid"
  | "drafting"
  | "confirmed"
  | "printing"
  | "shipped"
  | "done"
  | "cancelled";

export interface ApplicationFormData {
  ordererName: string;
  ordererContact: string;
  communicationMethod: CommunicationMethod;
  ordererEmail: string;
  ordererKakaoId: string;
  paperType: string;
  templateId: string;
  invitationQty: string;
  invitationQtyCustom: string;
  envelopeQty: string;
  envelopeQtyMode: string;
  envelopeQtyCustom: string;
  sealingWaxQty: string;
  sealingWaxQtyCustom: string;
  weddingDateTime: string;
  desiredReceiveDate: string;
  venueName: string;
  venueAddress: string;
  groomName: string;
  brideName: string;
  coverEnglishName: string;
  coverTitleText: string;
  parentsNotation: string;
  greetingText: string;
  additionalWeddingInfo: string;
  ordererMessage: string;
  recipientName: string;
  recipientContact: string;
  shippingAddress: string;
  shippingMemo: string;
  agreeTemplate: boolean;
  agreeShipping: boolean;
  agreeRevisionPolicy: boolean;
  agreeNotPayment: boolean;
}

export interface ApplicationRow {
  id: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  status: ApplicationStatus;
  orderer_name: string;
  orderer_contact: string;
  communication_method: CommunicationMethod;
  orderer_email: string | null;
  orderer_kakao_id: string | null;
  paper_type: string;
  template_id: string;
  template_name: string;
  invitation_qty: string;
  invitation_qty_custom: string | null;
  invitation_qty_final: string;
  envelope_qty: string;
  envelope_qty_mode: string;
  envelope_qty_custom: string | null;
  envelope_qty_final: string;
  sealing_wax_qty: string;
  sealing_wax_qty_custom: string | null;
  sealing_wax_qty_final: string;
  wedding_date_time: string;
  desired_receive_date: string;
  venue_name: string;
  venue_address: string;
  groom_name: string;
  bride_name: string;
  cover_english_name: string | null;
  cover_title_text: string | null;
  parents_notation: string | null;
  greeting_text: string | null;
  additional_wedding_info: string | null;
  recipient_name: string;
  recipient_contact: string;
  shipping_address: string;
  agree_template: boolean;
  agree_shipping: boolean;
  agree_revision_policy: boolean;
  agree_not_payment: boolean;
  raw_payload: Record<string, unknown> | null;
}

export interface ApplicationAccountRow {
  id: string;
  application_id: string;
  slot_order: number;
  bank: string | null;
  relation: string | null;
  relation_custom: string | null;
  account_number: string | null;
  created_at: string;
}

export interface ApplicationEventRow {
  id: string;
  application_id: string;
  actor_email: string | null;
  event_type: string;
  old_status: ApplicationStatus | null;
  new_status: ApplicationStatus | null;
  note: string | null;
  created_at: string;
}
