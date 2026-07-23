import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { InstitutionConfig, Node, Vars } from "./lib/types";
import { makeCisApi, lookupOrCreateAccount } from "./lib/api";

const SESSION_SECONDS = 120;

const DEMO_PERSONAS = [
  { phone: "+265991000001", label: "Chisomo Banda" },
  { phone: "+265991000002", label: "Thoko Mvula" },
];

interface MenuRow {
  num: string;
  label: string;
}

function parseMenuLines(text: string): MenuRow[] {
  return text
    .split("\n")
    .map((line): MenuRow | null => {
      const m = line.match(/^(\d+)\.\s*(.+)$/);
      return m ? { num: m[1], label: m[2] } : null;
    })
    .filter((row): row is MenuRow => row !== null);
}

interface Props {
  institution: InstitutionConfig;
}

export default function UssdPhone({ institution }: Props) {
  const api = useMemo(() => makeCisApi(), []);
  const storageKey = `cis-sim-phone:${institution.key}`;

  // --- SIM state: which phone number is "inserted", and the CIS
  // account that was provisioned (or found) for it ---
  const [phone, setPhone] = useState<string | null>(() => localStorage.getItem(storageKey));
  const [accountId, setAccountId] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [phoneEntry, setPhoneEntry] = useState("");

  // --- USSD session state ---
  const [dialed, setDialed] = useState<string>("");
  const [live, setLive] = useState<boolean>(false);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [entry, setEntry] = useState<string>("");
  const [vars, setVars] = useState<Vars>({});
  const [seconds, setSeconds] = useState<number>(SESSION_SECONDS);
  const [processing, setProcessing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const node: Node | null = nodeId ? institution.nodes[nodeId] : null;
  const isEnd = node?.type === "end";
  const isMenu = node?.type === "menu";
  const isAction = node?.type === "action";

  // Provision (or look up) the CIS account the moment a SIM is inserted —
  // mirrors a real telecom's wallet auto-provisioning on first dial.
  const insertSim = useCallback(
    async (phoneNumber: string) => {
      setProvisioning(true);
      setProvisionError(null);
      try {
        const result = await lookupOrCreateAccount(phoneNumber, institution);
        setAccountId(result.accountId);
        setPhone(phoneNumber);
        localStorage.setItem(storageKey, phoneNumber);
      } catch (err) {
        setProvisionError("Could not reach CIS. Is the backend running on the expected URL?");
      } finally {
        setProvisioning(false);
      }
    },
    [institution, storageKey]
  );

  useEffect(() => {
    if (phone) insertSim(phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ejectSim = () => {
    localStorage.removeItem(storageKey);
    setPhone(null);
    setAccountId(null);
    setLive(false);
    setNodeId(null);
  };

  // --- Session timer ---
  const endSession = useCallback((toExpired: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (toExpired) {
      setNodeId("expired");
      setLive(true);
      setEntry("");
    } else {
      setLive(false);
      setNodeId(null);
      setDialed("");
      setEntry("");
      setHistory([]);
      setVars({});
    }
  }, []);

  useEffect(() => {
    if (!live || isEnd || processing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          endSession(true);
          return SESSION_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [live, isEnd, processing, nodeId, endSession]);

  // --- Arriving at an ACTION node triggers a real, awaited CIS call.
  // This is what turns "Send Money" etc. from fiction into fact. ---
  useEffect(() => {
    if (!live || !isAction || !node || node.type !== "action" || !accountId) return;
    let cancelled = false;
    setProcessing(true);
    node
      .run({ vars, accountId, api })
      .then((result) => {
        if (cancelled) return;
        setVars((v) => ({ ...v, ...(result.setVars ?? {}) }));
        setNodeId(result.nextNodeId);
        setSeconds(SESSION_SECONDS);
      })
      .finally(() => {
        if (!cancelled) setProcessing(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, isAction, live]);

  const startSession = (code: string) => {
    if (code !== institution.dialCode) return;
    setNodeId(institution.entryNodeId);
    setHistory([]);
    setVars({});
    setEntry("");
    setSeconds(SESSION_SECONDS);
    setLive(true);
  };

  const goTo = (targetId: string, overrides?: Vars) => {
    setSeconds(SESSION_SECONDS);
    if (overrides) setVars((v) => ({ ...v, ...overrides }));
    setHistory((h) => (nodeId ? [...h, nodeId] : h));
    setNodeId(targetId);
    setEntry("");
  };

  const goBack = () => {
    if (!history.length || processing) return;
    const prev = [...history];
    const back = prev.pop() as string;
    setHistory(prev);
    setNodeId(back);
    setEntry("");
    setSeconds(SESSION_SECONDS);
  };

  const selectMenuOption = (num: string) => {
    if (!node || node.type !== "menu") return;
    const target = node.options[num];
    if (!target) return;
    if (typeof target === "string") goTo(target);
    else goTo(target.to, target.set);
  };

  const keyPress = (k: string) => {
    if (!live) {
      if (dialed.length < 12) setDialed(dialed + k);
      return;
    }
    if (isEnd || processing) return;
    setEntry((e) => (e.length < 20 ? e + k : e));
  };

  const backspace = () => {
    if (!live) {
      setDialed((d) => d.slice(0, -1));
      return;
    }
    setEntry((e) => e.slice(0, -1));
  };

  const submit = () => {
    if (!live) {
      startSession(dialed);
      return;
    }
    if (!node || isEnd || processing) return;
    if (entry === "00") {
      setSeconds(SESSION_SECONDS);
      setHistory([]);
      setNodeId(institution.entryNodeId);
      setEntry("");
      return;
    }
    if (entry === "0" && history.length) {
      goBack();
      return;
    }
    if (node.type === "menu") {
      selectMenuOption(entry);
      return;
    }
    if (node.type === "input") {
      goTo(node.next, { [node.store]: entry });
    }
  };

  // --- No SIM inserted yet: provisioning screen ---
  if (!phone) {
    return (
      <div className="w-[340px] rounded-[36px] bg-gradient-to-b from-[#3a3a38] to-[#232321] p-5 shadow-2xl border border-black/40">
        <div className="flex justify-center mb-3">
          <div className="w-14 h-1.5 rounded-full bg-black/50" />
        </div>
        <div className="rounded-md bg-[#aebb8f] border-4 border-[#1f1f1d] p-4 mb-3 min-h-[220px] flex flex-col justify-center gap-3">
          <div className="font-mono text-[13px] text-[#20240f] text-center mb-2">No SIM inserted</div>
          <input
            value={phoneEntry}
            onChange={(e) => setPhoneEntry(e.target.value)}
            placeholder="+265..."
            className="font-mono text-[13px] bg-white/60 border border-[#20240f]/30 rounded px-2 py-1 text-[#20240f] outline-none"
          />
          <button
            disabled={provisioning || !phoneEntry}
            onClick={() => insertSim(phoneEntry)}
            className="h-9 rounded bg-[#20240f] text-[#aebb8f] text-xs font-medium disabled:opacity-40"
          >
            {provisioning ? "Inserting..." : "Insert SIM"}
          </button>
          <div className="text-[10px] text-[#2f3324] text-center mt-1">or use a demo persona</div>
          {DEMO_PERSONAS.map((p) => (
            <button
              key={p.phone}
              disabled={provisioning}
              onClick={() => insertSim(p.phone)}
              className="h-8 rounded border border-[#20240f]/40 text-[#20240f] text-[11px] font-mono disabled:opacity-40"
            >
              {p.label} · {p.phone}
            </button>
          ))}
          {provisionError && <div className="text-[10px] text-red-800 text-center mt-1">{provisionError}</div>}
        </div>
      </div>
    );
  }

  const screenText = live && node
    ? processing
      ? "Please wait..."
      : node.type !== "action"
      ? node.text(vars)
      : ""
    : `Type ${institution.dialCode} then press the green key\n(or tap Quick Dial below)`;
  const menuRows = isMenu ? parseMenuLines(screenText) : [];

  return (
    <div className="w-[340px] rounded-[36px] bg-gradient-to-b from-[#3a3a38] to-[#232321] p-5 shadow-2xl border border-black/40">
      <div className="flex justify-center mb-3">
        <div className="w-14 h-1.5 rounded-full bg-black/50" />
      </div>

      <div className="flex justify-between items-center px-1 mb-2 text-[10px] text-[#d8d8d4] font-mono">
        <span>SIM: {phone}</span>
        <button onClick={ejectSim} className="underline opacity-70">eject</button>
      </div>

      <div className="rounded-md bg-[#aebb8f] border-4 border-[#1f1f1d] p-3 mb-3 relative overflow-hidden" style={{ borderColor: live ? institution.brandColor : "#1f1f1d" }}>
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 3px)" }}
        />
        <div className="flex justify-between items-center text-[10px] text-[#2f3324] mb-1 font-mono">
          <span>{live ? institution.headerLabel : institution.headerLabel}</span>
          {live && !isEnd && !processing && <span>{seconds}s</span>}
        </div>

        {isMenu ? (
          <div className="space-y-0.5">
            {menuRows.map((row) => (
              <button
                key={row.num}
                onClick={() => selectMenuOption(row.num)}
                className="w-full text-left font-mono text-[13px] text-[#20240f] py-0.5 active:bg-[#20240f]/10 rounded px-1 -mx-1"
              >
                {row.num}. {row.label}
              </button>
            ))}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-[13px] leading-snug text-[#20240f] min-h-[90px]">
            {screenText}
          </pre>
        )}

        {live && node && node.type === "input" && !processing && (
          <div className="border-t border-[#20240f]/30 mt-2 pt-1 font-mono text-[13px] text-[#20240f] min-h-[18px]">
            {node.mask ? "•".repeat(entry.length) : entry || " "}
          </div>
        )}
        {!live && (
          <div className="border-t border-[#20240f]/30 mt-2 pt-1 font-mono text-[13px] text-[#20240f] min-h-[18px]">
            {dialed || " "}
          </div>
        )}
        {live && !isEnd && !processing && (
          <div className="text-[9px] text-[#2f3324] mt-1 font-mono opacity-70">
            {isMenu ? "Tap an option, or type its number" : "Type your answer below"} · 0 Back · 00 Main
          </div>
        )}
      </div>

      {!live && (
        <button
          onClick={() => { setDialed(institution.dialCode); startSession(institution.dialCode); }}
          className="w-full mb-3 h-9 rounded-lg active:opacity-80 text-white text-xs font-medium"
          style={{ backgroundColor: institution.brandColor }}
        >
          Quick Dial {institution.dialCode}
        </button>
      )}

      <div className="flex justify-between px-1 mb-2 text-[11px] font-medium text-[#d8d8d4]">
        <span>{live ? (isEnd ? "" : "OK") : "Call"}</span>
        <span>{live && history.length && !processing ? "Back" : ""}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((k) => (
          <button
            key={k}
            onClick={() => keyPress(k)}
            disabled={processing}
            className="h-11 rounded-lg bg-[#4a4a47] active:bg-[#5c5c58] text-[#eee] text-base font-medium shadow-inner disabled:opacity-40"
          >
            {k}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={submit}
          disabled={processing}
          className="h-11 rounded-lg active:opacity-80 text-white text-sm font-semibold disabled:opacity-40"
          style={{ backgroundColor: institution.brandColor }}
        >
          {live ? "OK" : "Call"}
        </button>
        <button
          onClick={live && history.length ? goBack : backspace}
          disabled={processing}
          className="h-11 rounded-lg bg-[#4a4a47] active:bg-[#5c5c58] text-[#eee] text-sm font-semibold disabled:opacity-40"
        >
          {live && history.length ? "Back" : "⌫"}
        </button>
        <button
          onClick={() => endSession(false)}
          className="h-11 rounded-lg bg-[#8a3030] active:bg-[#a13a3a] text-white text-sm font-semibold"
        >
          End
        </button>
      </div>

      {isEnd && live && (
        <button onClick={() => endSession(false)} className="w-full mt-3 h-9 rounded-lg bg-[#2f2f2d] text-[#ccc] text-xs">
          ← Dial again
        </button>
      )}
    </div>
  );
}
