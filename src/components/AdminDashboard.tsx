import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Check,
  ClipboardList,
  LogIn,
  LogOut,
  RefreshCcw,
  Search,
  UserPlus,
} from "lucide-react";
import ourwedLogo from "../assets/ourwed-logo.svg";
import { STATUS_OPTIONS, getStatusLabel } from "../lib/constants";
import { displayValue, formatDate, formatDateTime } from "../lib/format";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type {
  AccountSlot,
  ApplicationAccountRow,
  ApplicationEventRow,
  ApplicationRow,
  ApplicationStatus,
} from "../types";

const statusTone: Record<ApplicationStatus, string> = {
  new: "bg-blue-50 text-blue-700",
  quoted: "bg-indigo-50 text-indigo-700",
  paid: "bg-emerald-50 text-emerald-700",
  drafting: "bg-amber-50 text-amber-700",
  confirmed: "bg-cyan-50 text-cyan-700",
  printing: "bg-purple-50 text-purple-700",
  shipped: "bg-teal-50 text-teal-700",
  done: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-50 text-red-700",
};

const InfoGrid = ({
  items,
}: {
  items: { label: string; value: unknown }[];
}) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {items.map((item) => (
      <div key={item.label} className="rounded-lg border border-gray-100 bg-white p-3">
        <p className="mb-1 text-[12px] uppercase text-gray-400">{item.label}</p>
        <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ourwed-main">
          {displayValue(item.value)}
        </p>
      </div>
    ))}
  </div>
);

const TextSection = ({
  title,
  value,
}: {
  title: string;
  value: string | null | undefined;
}) => (
  <div className="rounded-lg border border-gray-100 bg-white p-4">
    <p className="mb-2 text-[12px] uppercase text-gray-400">{title}</p>
    <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ourwed-main">
      {displayValue(value)}
    </p>
  </div>
);

const getRawText = (row: ApplicationRow, key: string) => {
  const value = row.raw_payload?.[key];
  return typeof value === "string" && value.trim() ? value : null;
};

const getRawAccount = (row: ApplicationRow, slotOrder: number) => {
  const accounts = row.raw_payload?.accounts;
  if (!Array.isArray(accounts)) {
    return null;
  }

  const account = accounts[slotOrder - 1];
  if (!account || typeof account !== "object") {
    return null;
  }

  return account as Partial<AccountSlot>;
};

export default function AdminDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [accounts, setAccounts] = useState<ApplicationAccountRow[]>([]);
  const [events, setEvents] = useState<ApplicationEventRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">(
    "all",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusDraft, setStatusDraft] = useState<ApplicationStatus>("new");
  const [statusNote, setStatusNote] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  const selectedApplication =
    applications.find((application) => application.id === selectedId) || null;

  const filteredApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesStatus =
        statusFilter === "all" || application.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [
          application.orderer_name,
          application.orderer_contact,
          application.groom_name,
          application.bride_name,
          application.venue_name,
          application.template_name,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesQuery;
    });
  }, [applications, query, statusFilter]);

  const counts = useMemo(() => {
    const base = STATUS_OPTIONS.reduce(
      (acc, option) => ({ ...acc, [option.value]: 0 }),
      {} as Record<ApplicationStatus, number>,
    );

    applications.forEach((application) => {
      base[application.status] += 1;
    });

    return base;
  }, [applications]);

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setApplications([]);
      setAccounts([]);
      setEvents([]);
      setSelectedId(null);
      return;
    }

    void loadApplications();
  }, [session]);

  useEffect(() => {
    if (!selectedApplication) {
      setAccounts([]);
      setEvents([]);
      return;
    }

    setStatusDraft(selectedApplication.status);
    setStatusNote("");
    void loadDetails(selectedApplication.id);
  }, [selectedApplication?.id]);

  const loadApplications = async () => {
    if (!supabase) return;

    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(
        "신청 목록을 불러오지 못했습니다. 로그인 이메일이 admin_users에 등록되어 있는지, Supabase SQL이 적용되었는지 확인해 주세요.",
      );
      setApplications([]);
    } else {
      const rows = (data || []) as ApplicationRow[];
      setApplications(rows);
      setSelectedId((current) => current || rows[0]?.id || null);
    }

    setIsLoading(false);
  };

  const loadDetails = async (applicationId: string) => {
    if (!supabase) return;

    const [accountResult, eventResult] = await Promise.all([
      supabase
        .from("application_accounts")
        .select("*")
        .eq("application_id", applicationId)
        .order("slot_order", { ascending: true }),
      supabase
        .from("application_events")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false }),
    ]);

    if (!accountResult.error) {
      setAccounts((accountResult.data || []) as ApplicationAccountRow[]);
    }

    if (!eventResult.error) {
      setEvents((eventResult.data || []) as ApplicationEventRow[]);
    }
  };

  const handlePasswordLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    setIsLoggingIn(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: loginId.trim(),
      password: loginPassword,
    });

    setIsLoggingIn(false);
    setAuthMessage(
      error
        ? "로그인에 실패했습니다. 아이디, 비밀번호, 관리자 권한 등록 여부를 확인해 주세요."
        : "",
    );
  };

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
  };

  const handleSaveStatus = async () => {
    if (!supabase || !selectedApplication || !session?.user.email) return;

    const statusChanged = statusDraft !== selectedApplication.status;
    if (!statusChanged && !statusNote.trim()) {
      setErrorMessage("변경할 상태 또는 메모를 입력해 주세요.");
      return;
    }

    setIsSavingStatus(true);
    setErrorMessage("");

    if (statusChanged) {
      const { error } = await supabase
        .from("applications")
        .update({
          status: statusDraft,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedApplication.id);

      if (error) {
        setErrorMessage("상태 변경을 저장하지 못했습니다.");
        setIsSavingStatus(false);
        return;
      }
    }

    const { error: eventError } = await supabase
      .from("application_events")
      .insert({
        application_id: selectedApplication.id,
        actor_email: session.user.email,
        event_type: statusChanged ? "status_changed" : "note",
        old_status: statusChanged ? selectedApplication.status : null,
        new_status: statusChanged ? statusDraft : null,
        note: statusNote.trim() || null,
      });

    if (eventError) {
      setErrorMessage("히스토리 기록을 저장하지 못했습니다.");
    } else {
      await loadApplications();
      await loadDetails(selectedApplication.id);
      setStatusNote("");
    }

    setIsSavingStatus(false);
  };

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !session?.user.email) return;

    setInviteMessage("");

    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteMessage("등록할 관리자 이메일을 입력해 주세요.");
      return;
    }

    const { error } = await supabase.from("admin_users").insert({
      email,
      invited_by: session.user.email,
    });

    if (error) {
      setInviteMessage(
        "초대 저장에 실패했습니다. 이미 등록된 이메일이거나 권한이 없을 수 있습니다.",
      );
      return;
    }

    setInviteEmail("");
    setInviteMessage(
      `${email} 이메일을 관리자 목록에 추가했습니다. Supabase Auth 사용자 생성과 비밀번호 설정도 필요합니다.`,
    );
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-gray-100 bg-white p-6 text-center shadow-sm">
          <img src={ourwedLogo} alt="ourwed" className="mx-auto mb-4 h-9 w-auto" />
          <h1 className="mb-2 text-xl font-semibold text-ourwed-main">
            Supabase 설정이 필요합니다
          </h1>
          <p className="text-[14px] leading-relaxed text-gray-500">
            `.env.local`에 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`를
            추가한 뒤 다시 실행해 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[14px] text-gray-500">
        관리자 세션 확인 중...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <form
          onSubmit={handlePasswordLogin}
          className="w-full max-w-md rounded-lg border border-gray-100 bg-white p-6 shadow-sm"
        >
          <img src={ourwedLogo} alt="ourwed" className="mb-6 h-9 w-auto" />
          <h1 className="text-2xl font-semibold text-ourwed-main">
            관리자 로그인
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-gray-500">
            등록된 관리자 계정으로 대시보드에 접속합니다.
          </p>
          <label className="mt-6 block text-[13px] font-medium uppercase text-gray-500">
            아이디
          </label>
          <input
            type="email"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 text-base focus:border-ourwed-main focus:outline-none focus:ring-1 focus:ring-ourwed-main"
            placeholder="admin@example.com"
            autoComplete="username"
            required
          />
          <label className="mt-4 block text-[13px] font-medium uppercase text-gray-500">
            비밀번호
          </label>
          <input
            type="password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 text-base focus:border-ourwed-main focus:outline-none focus:ring-1 focus:ring-ourwed-main"
            placeholder="관리자 비밀번호"
            autoComplete="current-password"
            required
          />
          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ourwed-main px-4 py-3 text-[15px] font-medium text-white transition-colors hover:bg-black disabled:opacity-60"
          >
            <LogIn size={16} />
            {isLoggingIn ? "로그인 중..." : "로그인"}
          </button>
          {authMessage && (
            <p className="mt-4 rounded-lg bg-gray-50 p-3 text-[13px] leading-relaxed text-gray-600">
              {authMessage}
            </p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ourwed-bg px-4 py-6 sm:px-6">
      <header className="mx-auto mb-6 flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img src={ourwedLogo} alt="ourwed" className="h-9 w-auto" />
          <div>
            <h1 className="text-2xl font-semibold text-ourwed-main">
              신청 관리자
            </h1>
            <p className="text-[13px] text-gray-500">{session.user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/"
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-[14px] text-gray-600 transition-colors hover:text-ourwed-main"
          >
            신청 폼
          </a>
          <button
            type="button"
            onClick={() => void loadApplications()}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-[14px] text-gray-600 transition-colors hover:text-ourwed-main"
          >
            <RefreshCcw size={15} />
            새로고침
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-md bg-ourwed-main px-3 py-2 text-[14px] text-white transition-colors hover:bg-black"
          >
            <LogOut size={15} />
            로그아웃
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg border p-3 text-left ${
                statusFilter === "all"
                  ? "border-ourwed-main bg-white"
                  : "border-gray-100 bg-white/70"
              }`}
            >
              <p className="text-[12px] text-gray-400">전체</p>
              <p className="mt-1 text-xl font-semibold text-ourwed-main">
                {applications.length}
              </p>
            </button>
            {STATUS_OPTIONS.map((status) => (
              <button
                type="button"
                key={status.value}
                onClick={() => setStatusFilter(status.value)}
                className={`rounded-lg border p-3 text-left ${
                  statusFilter === status.value
                    ? "border-ourwed-main bg-white"
                    : "border-gray-100 bg-white/70"
                }`}
              >
                <p className="text-[12px] text-gray-400">{status.label}</p>
                <p className="mt-1 text-xl font-semibold text-ourwed-main">
                  {counts[status.value]}
                </p>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-lg border border-gray-200 py-3 pl-9 pr-3 text-base focus:border-ourwed-main focus:outline-none focus:ring-1 focus:ring-ourwed-main"
                placeholder="이름, 연락처, 장소 검색"
              />
            </div>
            {errorMessage && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-[13px] leading-relaxed text-red-700">
                {errorMessage}
              </p>
            )}
            <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {isLoading ? (
                <p className="py-8 text-center text-[14px] text-gray-500">
                  불러오는 중...
                </p>
              ) : filteredApplications.length === 0 ? (
                <p className="py-8 text-center text-[14px] text-gray-500">
                  표시할 신청 건이 없습니다.
                </p>
              ) : (
                filteredApplications.map((application) => (
                  <button
                    type="button"
                    key={application.id}
                    onClick={() => setSelectedId(application.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      selectedId === application.id
                        ? "border-ourwed-main bg-ourwed-sub"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ourwed-main">
                          {application.orderer_name}
                        </p>
                        <p className="mt-1 text-[13px] text-gray-500">
                          {application.groom_name} · {application.bride_name}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-1 text-[12px] font-medium ${statusTone[application.status]}`}
                      >
                        {getStatusLabel(application.status)}
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-500">
                      {application.template_name} · {formatDate(application.created_at)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <form
            onSubmit={handleInvite}
            className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2 text-ourwed-main">
              <UserPlus size={17} />
              <h2 className="font-semibold">관리자 권한 등록</h2>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-base focus:border-ourwed-main focus:outline-none focus:ring-1 focus:ring-ourwed-main"
                placeholder="admin@example.com"
              />
              <button
                type="submit"
                className="rounded-md bg-ourwed-main px-3 py-2 text-[14px] font-medium text-white transition-colors hover:bg-black"
              >
                추가
              </button>
            </div>
            {inviteMessage && (
              <p className="mt-3 text-[13px] leading-relaxed text-gray-500">
                {inviteMessage}
              </p>
            )}
          </form>
        </aside>

        <section className="min-w-0">
          {!selectedApplication ? (
            <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-gray-100 bg-white text-center shadow-sm">
              <div>
                <ClipboardList className="mx-auto mb-3 text-gray-300" size={36} />
                <p className="text-[14px] text-gray-500">
                  왼쪽에서 신청 건을 선택해 주세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-1 text-[12px] font-medium ${statusTone[selectedApplication.status]}`}
                      >
                        {getStatusLabel(selectedApplication.status)}
                      </span>
                      <span className="text-[13px] text-gray-400">
                        접수 {formatDateTime(selectedApplication.created_at)}
                      </span>
                    </div>
                    <h2 className="text-2xl font-semibold text-ourwed-main">
                      {selectedApplication.groom_name} · {selectedApplication.bride_name}
                    </h2>
                    <p className="mt-2 text-[14px] text-gray-500">
                      {selectedApplication.venue_name} ·{" "}
                      {formatDateTime(selectedApplication.wedding_date_time)}
                    </p>
                  </div>
                  <div className="w-full rounded-lg border border-gray-100 bg-gray-50 p-3 xl:max-w-md">
                    <label className="text-[12px] uppercase text-gray-400">
                      진행 상태
                    </label>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
                      <select
                        value={statusDraft}
                        onChange={(event) =>
                          setStatusDraft(event.target.value as ApplicationStatus)
                        }
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-base focus:border-ourwed-main focus:outline-none"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={statusNote}
                        onChange={(event) => setStatusNote(event.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-base focus:border-ourwed-main focus:outline-none"
                        placeholder="변경 메모"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveStatus}
                      disabled={isSavingStatus}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ourwed-main px-3 py-2 text-[14px] font-medium text-white transition-colors hover:bg-black disabled:opacity-60"
                    >
                      <Check size={15} />
                      {isSavingStatus ? "저장 중..." : "상태 저장"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-sm">
                <h3 className="mb-3 font-semibold text-ourwed-main">주문자</h3>
                <InfoGrid
                  items={[
                    { label: "성함", value: selectedApplication.orderer_name },
                    { label: "연락처", value: selectedApplication.orderer_contact },
                    {
                      label: "소통 수단",
                      value:
                        selectedApplication.communication_method === "email"
                          ? "이메일"
                          : "카카오톡",
                    },
                    {
                      label: "이메일",
                      value: selectedApplication.orderer_email,
                    },
                    {
                      label: "카카오톡",
                      value: selectedApplication.orderer_kakao_id,
                    },
                  ]}
                />
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-sm">
                <h3 className="mb-3 font-semibold text-ourwed-main">상품</h3>
                <InfoGrid
                  items={[
                    { label: "지류 형태", value: selectedApplication.paper_type },
                    { label: "템플릿", value: selectedApplication.template_name },
                    {
                      label: "청첩장 수량",
                      value: `${selectedApplication.invitation_qty_final}매`,
                    },
                    {
                      label: "봉투 수량",
                      value: `${selectedApplication.envelope_qty_final}매`,
                    },
                    {
                      label: "실링왁스",
                      value:
                        selectedApplication.sealing_wax_qty_final === "선택 안함"
                          ? "선택 안함"
                          : `${selectedApplication.sealing_wax_qty_final}매`,
                    },
                  ]}
                />
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-sm">
                <h3 className="mb-3 font-semibold text-ourwed-main">예식</h3>
                <InfoGrid
                  items={[
                    {
                      label: "예식 일시",
                      value: formatDateTime(selectedApplication.wedding_date_time),
                    },
                    {
                      label: "수령 희망일",
                      value: formatDate(selectedApplication.desired_receive_date),
                    },
                    { label: "예식장", value: selectedApplication.venue_name },
                    { label: "주소", value: selectedApplication.venue_address },
                    { label: "신랑", value: selectedApplication.groom_name },
                    { label: "신부", value: selectedApplication.bride_name },
                    {
                      label: "표지 영문 이름",
                      value: selectedApplication.cover_english_name,
                    },
                    {
                      label: "표지 타이틀",
                      value: selectedApplication.cover_title_text,
                    },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <TextSection
                  title="혼주 표기"
                  value={selectedApplication.parents_notation}
                />
                <TextSection
                  title="초대 인사말"
                  value={selectedApplication.greeting_text}
                />
                <TextSection
                  title="추가 정보"
                  value={selectedApplication.additional_wedding_info}
                />
              </div>

              <TextSection
                title="담당자에게 전달할 사항"
                value={getRawText(selectedApplication, "ordererMessage")}
              />

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-sm">
                <h3 className="mb-3 font-semibold text-ourwed-main">배송</h3>
                <InfoGrid
                  items={[
                    { label: "수령인", value: selectedApplication.recipient_name },
                    {
                      label: "수령인 연락처",
                      value: selectedApplication.recipient_contact,
                    },
                    { label: "배송지", value: selectedApplication.shipping_address },
                    {
                      label: "배송 요청사항",
                      value: getRawText(selectedApplication, "shippingMemo"),
                    },
                  ]}
                />
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-sm">
                <h3 className="mb-3 font-semibold text-ourwed-main">계좌 안내</h3>
                {accounts.length === 0 ? (
                  <p className="rounded-lg bg-white p-4 text-[14px] text-gray-500">
                    입력된 계좌 정보가 없습니다.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {accounts.map((account) => {
                      const rawAccount = getRawAccount(
                        selectedApplication,
                        account.slot_order,
                      );
                      const bankName =
                        account.bank === "기타"
                          ? rawAccount?.bankCustom || account.bank
                          : account.bank;
                      const relation =
                        account.relation === "기타"
                          ? account.relation_custom
                          : account.relation;

                      return (
                        <div
                          key={account.id}
                          className="rounded-lg border border-gray-100 bg-white p-4"
                        >
                          <p className="text-[12px] uppercase text-gray-400">
                            계좌 {account.slot_order}
                          </p>
                          <p className="mt-2 font-medium text-ourwed-main">
                            {displayValue(bankName)} · {displayValue(relation)}
                          </p>
                          <p className="mt-1 text-[14px] text-gray-600">
                            예금주 {displayValue(rawAccount?.accountHolder)}
                          </p>
                          <p className="mt-1 break-words text-[14px] text-gray-600">
                            {displayValue(account.account_number)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-sm">
                <h3 className="mb-3 font-semibold text-ourwed-main">동의 항목</h3>
                <InfoGrid
                  items={[
                    {
                      label: "템플릿 제작",
                      value: selectedApplication.agree_template ? "동의" : "미동의",
                    },
                    {
                      label: "배송 정책",
                      value: selectedApplication.agree_shipping ? "동의" : "미동의",
                    },
                    {
                      label: "수정/환불",
                      value: selectedApplication.agree_revision_policy
                        ? "동의"
                        : "미동의",
                    },
                    {
                      label: "접수 단계",
                      value: selectedApplication.agree_not_payment
                        ? "동의"
                        : "미동의",
                    },
                  ]}
                />
              </div>

              <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="mb-3 font-semibold text-ourwed-main">히스토리</h3>
                {events.length === 0 ? (
                  <p className="text-[14px] text-gray-500">
                    아직 기록된 상태 변경이나 메모가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                      >
                        <p className="text-[13px] text-gray-500">
                          {formatDateTime(event.created_at)} ·{" "}
                          {displayValue(event.actor_email)}
                        </p>
                        <p className="mt-1 text-[14px] text-ourwed-main">
                          {event.event_type === "status_changed"
                            ? `${getStatusLabel(event.old_status || "")} → ${getStatusLabel(event.new_status || "")}`
                            : "메모"}
                        </p>
                        {event.note && (
                          <p className="mt-2 whitespace-pre-wrap text-[14px] text-gray-600">
                            {event.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
