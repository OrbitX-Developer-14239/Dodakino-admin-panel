import { useEffect, useState } from "react";
import theme from "@theme";
import { Card, Stat, Badge, Meter, Empty, Loading, ErrorBox, Switch, PageHead } from "../../components/ui";

/**
 * Sinov sahifasi — komponentlarni bir joyda ko'rish uchun.
 *
 * MAVZU: ilgari bu yerda `localStorage` ga to'g'ridan-to'g'ri yozilib,
 * qo'lda "themechange" hodisasi yuborilardi — ya'ni ThemeManager
 * chetlab o'tilardi va uning View Transition animatsiyasi, tizim
 * rejimini kuzatishi, tablar orasidagi sinxronizatsiyasi ishlamasdi.
 * Endi mavzu faqat ThemeManager orqali o'zgaradi.
 */
function TestPage() {
  const [mode, setMode] = useState(() => theme.get().mode);
  const [on, setOn] = useState(true);

  useEffect(() => theme.subscribe(() => setMode(theme.get().mode)), []);

  return (
    <>
      <PageHead title="Komponentlar" desc="Dizayn tizimining barcha bo'laklari shu yerda ko'rinadi.">
        <div className="row">
          {["light", "dark", "auto"].map((m) => (
            <button
              key={m}
              type="button"
              className={`btn ${mode === m ? "" : "ghost"} sm`}
              onClick={() => theme.set({ mode: m })}
            >
              {m}
            </button>
          ))}
        </div>
      </PageHead>

      <div className="grid c4">
        <Stat label="Oddiy" value="1 234" sub="izoh matni" />
        <Stat label="Muvaffaqiyat" value="98%" tone="ok" trend={12} />
        <Stat label="Diqqat" value="7" tone="warn" trend={-4} />
        <Stat label="Xato" value="3" tone="danger" />
      </div>

      <Card title="Tugmalar">
        <div className="row">
          <button type="button" className="btn">Asosiy</button>
          <button type="button" className="btn ghost">Ghost</button>
          <button type="button" className="btn danger">O'chirish</button>
          <button type="button" className="btn sm">Kichik</button>
          <button type="button" className="btn" disabled>O'chirilgan</button>
        </div>
      </Card>

      <Card title="Belgilar va o'lchagich">
        <div className="row">
          <Badge>Oddiy</Badge>
          <Badge tone="ok">Faol</Badge>
          <Badge tone="warn">Kutilmoqda</Badge>
          <Badge tone="info">Ma'lumot</Badge>
          <Badge tone="danger">Xato</Badge>
          <Badge tone="ok" pulse>Jonli</Badge>
        </div>

        <div style={{ marginTop: "var(--margin-16)" }}>
          <Meter label="Disk bandligi" value={62} max={100} />
        </div>
      </Card>

      <Card title="Maydonlar">
        <label className="field">
          <span>Matn</span>
          <input placeholder="Bir nima yozing" />
        </label>

        <label className="field">
          <span>Tanlov</span>
          <select>
            <option>Birinchi</option>
            <option>Ikkinchi</option>
          </select>
        </label>

        <Switch
          checked={on}
          onChange={setOn}
          label="Kalit"
          hint="Ha/yo'q sozlamasi uchun"
        />
      </Card>

      <Card title="Holatlar">
        <ErrorBox error={{ message: "Namuna xato xabari" }} onRetry={() => {}} />
        <Loading rows={2} />
        <Empty>Bu yerda hozircha hech narsa yo'q</Empty>
      </Card>
    </>
  );
}

export default TestPage;
