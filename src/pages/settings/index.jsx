import { useCallback, useEffect, useRef, useState } from "react";
import {
  TbBrandTelegram,
  TbCheck,
  TbCopy,
  TbExternalLink,
  TbKey,
  TbPlus,
  TbShieldCheck,
  TbShieldDown,
  TbShieldUp,
  TbTrash,
  TbUserCircle,
  TbUsers,
} from "react-icons/tb";
import styles from "./index.module.scss";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { TokenManager } from "../../api/tokenManager";
import { startTelegramLinkSession } from "../../api/telegramLinkSocket";
import { Badge, Button, Card, Empty, ErrorBox, Loading, Modal, PageHead } from "../../components/ui";
import { useConfirm } from "../../hooks/useConfirm";
import { time } from "../../utils/format";

/**
 * Sozlamalar — o'z hisobi va (superadmin uchun) adminlar boshqaruvi.
 *
 *  • Profil: login, rol, ulangan Telegram. Telegram ulangach admin
 *    panelga bot orqali ham kira oladi.
 *  • Login va parol.
 *  • Adminlar: yaratish, rolini o'zgartirish, qo'lda tasdiqlash, o'chirish.
 *    Backend bularni faqat superadminga ruxsat beradi — oddiy admin
 *    bu bo'limni umuman ko'rmaydi.
 */

const ROLE_LABEL = { superadmin: "Superadmin", admin: "Admin" };

const fullName = (a) => [a?.firstName, a?.lastName].filter(Boolean).join(" ");

export default function Settings() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);
  const isSuper = TokenManager.getUserFromToken()?.role === "superadmin";

  const loadMe = useCallback(async () => {
    try {
      const res = await client.get(ENDPOINTS.ADMIN.ME, { silent: true });
      setMe(res?.data || null);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  if (!me && !error) return <Loading rows={4} />;

  return (
    <>
      <PageHead />
      <ErrorBox error={error} onRetry={loadMe} />

      {me && (
        <div className="grid c2">
          <ProfileCard me={me} onLinked={loadMe} />
          <AccountCard me={me} onSaved={loadMe} />
        </div>
      )}

      {isSuper && me && <AdminsCard me={me} />}
    </>
  );
}

/* ── Profil va Telegram ───────────────────────────────────── */
function ProfileCard({ me, onLinked }) {
  const [linking, setLinking] = useState(false);
  const linked = Boolean(me.telegramId);

  const rows = [
    ["Login", me.username],
    ["Rol", <Badge key="r" tone={me.role === "superadmin" ? "warn" : "info"}>{ROLE_LABEL[me.role] || me.role}</Badge>],
    ["Ism", fullName(me) || "—"],
    ["Telefon", me.phoneNumber || "—"],
    ["Qoʻshilgan", time(me.createdAt)],
  ];

  return (
    <Card title="Profil" icon={TbUserCircle}>
      <dl className={styles.rows}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.row}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className={styles.telegram}>
        <span className={`${styles.tgIcon} ${linked ? styles.tgOn : ""}`}>
          <TbBrandTelegram size={20} />
        </span>
        <div className={styles.tgText}>
          <strong>
            {linked ? (me.telegramUsername ? `@${me.telegramUsername}` : `ID ${me.telegramId}`) : "Telegram ulanmagan"}
          </strong>
          <span className="hint">
            {linked
              ? "Panelga Telegram orqali ham kira olasiz"
              : "Ulasangiz, panelga parolsiz — Telegram orqali kira olasiz"}
          </span>
        </div>
        <Button size="sm" variant={linked ? "ghost" : ""} icon={TbBrandTelegram} onClick={() => setLinking(true)}>
          {linked ? "Qayta ulash" : "Telegramni ulash"}
        </Button>
      </div>

      {linking && (
        <TelegramLinkModal
          onClose={() => setLinking(false)}
          onDone={() => {
            setLinking(false);
            onLinked?.();
          }}
        />
      )}
    </Card>
  );
}

/**
 * Bot havolasi ochiladi, admin botda kontaktini ulashadi — natija socket
 * orqali keladi va oyna o'zi yopiladi. Havola 15 daqiqa amal qiladi.
 */
function TelegramLinkModal({ onClose, onDone }) {
  const [state, setState] = useState({ status: "starting" }); // starting | awaiting | done | error
  // Ota har chizilganda yangi funksiya beradi — effekt unga bog'lansa
  // sessiya qayta-qayta boshlanib, bot havolasi almashib qolardi
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let timer = null;
    const stop = startTelegramLinkSession({
      onUpdate: ({ link, expiresInMinutes }) => setState({ status: "awaiting", link, expiresInMinutes }),
      onDone: (data) => {
        setState({ status: "done", data });
        timer = setTimeout(() => onDoneRef.current?.(), 1200); // natija bir lahza ko'rinsin
      },
      onError: (error) => setState({ status: "error", error }),
    });
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, []);

  return (
    <Modal
      open
      title="Telegramni ulash"
      onClose={onClose}
      actions={
        <>
          <span className="spacer" />
          <button type="button" className="btn ghost sm" onClick={onClose}>
            {state.status === "done" ? "Yopish" : "Bekor qilish"}
          </button>
          {state.status === "awaiting" && (
            <a className="btn" href={state.link} target="_blank" rel="noopener noreferrer">
              <TbExternalLink size={14} /> Botni ochish
            </a>
          )}
        </>
      }
    >
      {state.status === "starting" && <Loading rows={2} />}

      {state.status === "awaiting" && (
        <div className={styles.linkSteps}>
          <ol>
            <li>
              <b>Botni ochish</b> tugmasini bosing — Telegram ochiladi.
            </li>
            <li>
              Botda <b>Start</b> ni, keyin <b>kontaktni ulashish</b> tugmasini bosing.
            </li>
            <li>Shu oyna oʻzi yangilanadi — hech narsa bosish shart emas.</li>
          </ol>
          <p className={styles.waiting}>
            <span className={styles.dot} /> Telegramdan javob kutilmoqda… havola {state.expiresInMinutes || 15} daqiqa
            amal qiladi
          </p>
        </div>
      )}

      {state.status === "done" && (
        <p className={styles.success}>
          <TbCheck size={18} /> Telegram ulandi
          {state.data?.telegramUsername ? `: @${state.data.telegramUsername}` : ""}
        </p>
      )}

      {state.status === "error" && <ErrorBox error={state.error} />}
    </Modal>
  );
}

/* ── Login va parol ───────────────────────────────────────── */
function AccountCard({ me, onSaved }) {
  const [username, setUsername] = useState(me.username || "");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const nameChanged = username.trim() !== me.username;
  const mismatch = password && repeat && password !== repeat;
  const canSave = (nameChanged || password) && !mismatch && !busy;

  const save = async (e) => {
    e.preventDefault();
    const body = {};
    if (nameChanged) {
      if (username.trim().length < 3) return setError(new Error("Login kamida 3 ta belgi boʻlishi kerak"));
      body.username = username.trim();
    }
    if (password) {
      if (password.length < 5) return setError(new Error("Parol kamida 5 ta belgi boʻlishi kerak"));
      if (password !== repeat) return setError(new Error("Parollar bir xil emas"));
      body.password = password;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await client.put(ENDPOINTS.ADMIN.UPDATE(me._id), body);
      setPassword("");
      setRepeat("");
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Login va parol" icon={TbKey}>
      <form onSubmit={save} autoComplete="off">
        <ErrorBox error={error} />

        <label className="field">
          <span>Login</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} disabled={busy} autoComplete="username" />
        </label>

        <label className="field">
          <span>Yangi parol</span>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setSaved(false);
            }}
            placeholder="Oʻzgartirmasangiz boʻsh qoldiring"
            disabled={busy}
            autoComplete="new-password"
          />
        </label>

        {password && (
          <label className="field">
            <span>Parolni takrorlang</span>
            <input
              type="password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              disabled={busy}
              autoComplete="new-password"
            />
            {mismatch && <small className={styles.danger}>Parollar bir xil emas</small>}
          </label>
        )}

        <div className="row end">
          {saved && (
            <span className={styles.saved}>
              <TbCheck size={14} /> Saqlandi
            </span>
          )}
          <Button type="submit" icon={TbCheck} busy={busy} busyText="Saqlanmoqda…" disabled={!canSave}>
            Saqlash
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ── Adminlar (faqat superadmin) ──────────────────────────── */
function AdminsCard({ me }) {
  const [admins, setAdmins] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  const load = useCallback(async () => {
    try {
      const res = await client.get(ENDPOINTS.ADMIN.ALL, { silent: true });
      setAdmins(Array.isArray(res?.data) ? res.data : []);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = (a) => {
    const next = a.role === "superadmin" ? "admin" : "superadmin";
    confirm({
      title: next === "superadmin" ? "Superadmin qilish" : "Oddiy admin qilish",
      message:
        next === "superadmin"
          ? `${a.username} superadmin boʻlsinmi?`
          : `${a.username} oddiy adminga tushirilsinmi?`,
      details:
        next === "superadmin"
          ? "Superadmin boshqa adminlarni yarata, oʻzgartira va oʻchira oladi."
          : "Adminlar boʻlimiga kira olmaydi, faqat oʻz profilini oʻzgartira oladi.",
      confirmText: next === "superadmin" ? "Superadmin qilish" : "Admin qilish",
      busyText: "Saqlanmoqda…",
      tone: next === "superadmin" ? "primary" : "danger",
      action: async () => {
        await client.put(ENDPOINTS.ADMIN.UPDATE(a._id), { role: next });
        await load();
      },
    });
  };

  const verify = (a) =>
    confirm({
      title: "Qoʻlda tasdiqlash",
      message: `${a.username} tasdiqlansinmi?`,
      details:
        "Odatda admin botdagi havola orqali oʻzi tasdiqlanadi. Havola yoʻqolgan boʻlsa shu yerdan tasdiqlang — shundan keyin u login va parol bilan kira oladi.",
      confirmText: "Tasdiqlash",
      busyText: "Tasdiqlanmoqda…",
      tone: "primary",
      action: async () => {
        await client.put(ENDPOINTS.ADMIN.UPDATE(a._id), { isVerified: true });
        await load();
      },
    });

  const remove = (a) =>
    confirm({
      title: "Adminni oʻchirish",
      message: `${a.username} oʻchirilsinmi?`,
      details: "U panelga boshqa kira olmaydi, ochiq turgan sessiyalari ham tugaydi. Bu amalni qaytarib boʻlmaydi.",
      confirmText: "Oʻchirish",
      busyText: "Oʻchirilmoqda…",
      action: async () => {
        await client.delete(ENDPOINTS.ADMIN.DELETE(a._id));
        await load();
      },
    });

  return (
    <Card
      title="Adminlar"
      icon={TbUsers}
      actions={
        <Button size="sm" icon={TbPlus} onClick={() => setCreating(true)}>
          Yangi admin
        </Button>
      }
    >
      <ErrorBox error={error} onRetry={load} />

      {!admins && !error ? (
        <Loading rows={3} />
      ) : admins?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Login</th>
                <th>Telegram</th>
                <th>Rol</th>
                <th>Holat</th>
                <th>Qoʻshilgan</th>
                <th aria-label="Amallar" />
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => {
                const self = String(a._id) === String(me._id);
                return (
                  <tr key={a._id}>
                    <td>
                      <span className={styles.adminName}>{a.username}</span>
                      {self && <span className="hint"> (siz)</span>}
                      {fullName(a) && <span className={styles.adminSub}>{fullName(a)}</span>}
                    </td>
                    <td>{a.telegramUsername ? `@${a.telegramUsername}` : a.telegramId ? "ulangan" : "—"}</td>
                    <td>
                      <Badge tone={a.role === "superadmin" ? "warn" : "info"}>{ROLE_LABEL[a.role] || a.role}</Badge>
                    </td>
                    <td>
                      {a.isVerified ? <Badge tone="ok">tasdiqlangan</Badge> : <Badge tone="danger">tasdiq kutilmoqda</Badge>}
                    </td>
                    <td>{time(a.createdAt)}</td>
                    <td>
                      {!self && (
                        <div className={styles.actions}>
                          {!a.isVerified && (
                            <Button size="sm" variant="ghost" icon={TbShieldCheck} onClick={() => verify(a)}>
                              Tasdiqlash
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={a.role === "superadmin" ? TbShieldDown : TbShieldUp}
                            onClick={() => changeRole(a)}
                          >
                            {a.role === "superadmin" ? "Admin qilish" : "Superadmin qilish"}
                          </Button>
                          {/* Backend superadminni o'chirishga ruxsat bermaydi — avval admin qilinadi */}
                          {a.role !== "superadmin" && (
                            <Button size="sm" variant="ghost" icon={TbTrash} onClick={() => remove(a)} aria-label="Oʻchirish" />
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon={TbUsers}>Adminlar yoʻq</Empty>
      )}

      {creating && (
        <CreateAdminModal
          onClose={() => setCreating(false)}
          onCreated={load}
        />
      )}
      {confirmDialog}
    </Card>
  );
}

/**
 * Yangi admin login va parol bilan yaratiladi, lekin botda tasdiqlanmaguncha
 * kira olmaydi. Server bir martalik bot havolasini qaytaradi — superadmin
 * uni yangi adminga yuboradi. Havola faqat shu yerda bir marta ko'rinadi.
 */
function CreateAdminModal({ onClose, onCreated }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { verifyLink, admin }
  const [copied, setCopied] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    if (username.trim().length < 3) return setError(new Error("Login kamida 3 ta belgi boʻlishi kerak"));
    if (password.length < 5) return setError(new Error("Parol kamida 5 ta belgi boʻlishi kerak"));
    setBusy(true);
    setError(null);
    try {
      const res = await client.post(ENDPOINTS.ADMIN.CREATE, { username: username.trim(), password });
      setResult(res?.data || {});
      onCreated?.();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.verifyLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      open
      title={result ? "Admin yaratildi" : "Yangi admin"}
      onClose={() => !busy && onClose()}
      actions={
        result ? (
          <>
            <span className="spacer" />
            <button type="button" className="btn sm" onClick={onClose}>
              Tayyor
            </button>
          </>
        ) : (
          <>
            <span className="spacer" />
            <button type="button" className="btn ghost sm" onClick={onClose} disabled={busy}>
              Bekor qilish
            </button>
            <Button type="submit" form="create-admin" icon={TbPlus} busy={busy} busyText="Yaratilmoqda…">
              Yaratish
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className={styles.created}>
          <p className={styles.success}>
            <TbCheck size={18} /> <b>{result.admin?.username || username}</b> yaratildi
          </p>
          <p className="hint">
            Bu havolani yangi adminga Telegramda yuboring. U havolani ochib, botda kontaktini ulashadi — shundan
            keyin login va parol bilan panelga kira oladi. Havola faqat shu yerda bir marta koʻrinadi.
          </p>
          <div className={styles.copyRow}>
            <input readOnly value={result.verifyLink || ""} onFocus={(e) => e.target.select()} />
            <Button size="sm" icon={copied ? TbCheck : TbCopy} onClick={copy} disabled={!result.verifyLink}>
              {copied ? "Nusxa olindi" : "Nusxa olish"}
            </Button>
          </div>
        </div>
      ) : (
        <form id="create-admin" onSubmit={create} autoComplete="off">
          <ErrorBox error={error} />
          <label className="field">
            <span>Login</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} disabled={busy} autoFocus />
            <small>Kamida 3 ta belgi</small>
          </label>
          <label className="field">
            <span>Parol</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              autoComplete="new-password"
            />
            <small>Kamida 5 ta belgi — keyin admin uni oʻzi oʻzgartira oladi</small>
          </label>
        </form>
      )}
    </Modal>
  );
}
