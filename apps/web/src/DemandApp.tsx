import { useEffect, useState } from 'react';
import { demandQuestion } from '../../../packages/domain/src/demand.ts';
import type { DemandAnswerType, DemandPollStatusType } from '../../../packages/domain/src/demand.ts';
import { DemandApiFailure, loadDemandPoll, recordDemandResponse } from './demand-api.ts';

function errorText(error: unknown): string {
  if (error instanceof DemandApiFailure) {
    if (error.message === 'FINAL_RESPONSE_ALREADY_RECORDED') return 'У цьому браузері вже збережено іншу остаточну відповідь. Нову відповідь не прийнято.';
    if (error.message === 'DEMAND_CREDENTIAL_REQUIRED') return 'Технічний ідентифікатор цього браузера відсутній. Відповідь не надіслано.';
    if (error.message === 'INVALID_DEMAND_CREDENTIAL') return 'Технічний ідентифікатор цього браузера пошкоджено. Відповідь не надіслано.';
    if (error.message === 'ORIGIN_REJECTED') return 'Запит надіслано не з дозволеної адреси. Відповідь не збережено.';
    return `Сервіс відхилив запит: ${error.message}. Відповідь не підтверджено.`;
  }
  if (error instanceof Error && error.name === 'TimeoutError') return 'Сервіс не відповів вчасно. Збереження відповіді не підтверджено.';
  return 'Не вдалося зв’язатися із сервісом. Збереження відповіді не підтверджено.';
}

export function DemandApp() {
  const [poll, setPoll] = useState<DemandPollStatusType | null>(null);
  const [selected, setSelected] = useState<DemandAnswerType | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [recorded, setRecorded] = useState<DemandAnswerType | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadDemandPoll().then(value => {
      if (!active) return;
      setPoll(value);
      setRecorded(value.response === null ? null : value.response.answer);
    }).catch((reason: unknown) => { if (active) setError(errorText(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit() {
    if (selected === null || !confirmed) return;
    setBusy(true); setError(null);
    try {
      const result = await recordDemandResponse(selected);
      setRecorded(result.answer);
      setSelected(null); setConfirmed(false);
    } catch (reason) { setError(errorText(reason)); }
    finally { setBusy(false); }
  }

  return <div className="demand-page">
    <a className="skip" href="#main">До основного вмісту</a>
    <div className="demand-environment"><span className="status-dot" /> Платформа в розробці <span>Зараз доступне одне відкрите опитування</span></div>
    <header className="demand-header">
      <a className="brand" href="#top" aria-label="Відкритий голос — на початок сторінки"><span className="brand-mark">вг</span><span>Відкритий голос<small>Незалежна платформа</small></span></a>
      <nav aria-label="Навігація сторінкою"><a href="#about">Про платформу</a><a href="#poll">Опитування</a><a href="#privacy">Приватність</a></nav>
      <a className="button secondary" href="https://github.com/Lontkovsky/openvote">Відкритий код ↗</a>
    </header>
    <main id="main" className="demand-main">
      <section className="demand-hero" id="top">
        <div className="demand-hero-copy"><p className="eyebrow">ПЛАТФОРМА В РОЗРОБЦІ</p><h1>{demandQuestion}</h1><p className="demand-lead">Ми розробляємо платформу, де можна буде брати участь у незалежних відкритих голосуваннях і розміщувати власні. Допоможіть зрозуміти, чи потрібна вам така платформа.</p><a className="button primary" href="#poll">Відповісти в опитуванні</a></div>
        <aside className="demand-launch-card" aria-label="Межі першого запуску"><p className="eyebrow">ПЕРШИЙ ПУБЛІЧНИЙ КРОК</p><h2>Одне питання.<br />Одна остаточна відповідь.</h2><p>Цей запуск збирає лише сигнал попиту. Повна платформа ще розробляється.</p><dl><div><dt>Перевірка особи</dt><dd>Немає</dd></div><div><dt>Поточні результати</dt><dd>Не публікуються</dd></div><div><dt>Дані у формі</dt><dd>Лише відповідь</dd></div></dl></aside>
      </section>

      <section className="demand-about" id="about" aria-labelledby="about-title"><div className="demand-section-heading"><p className="eyebrow">ЩО МИ РОЗРОБЛЯЄМО</p><h2 id="about-title">Місце для відкритих громадських питань</h2><p>Мета повної платформи — дати людям зрозумілий спосіб ставити питання, брати участь і перевіряти оприлюднені результати.</p></div><div className="demand-feature-grid"><article><span>01</span><h3>Розміщувати питання</h3><p>Автори зможуть пропонувати громадські, соціальні, економічні, культурні та інші теми.</p></article><article><span>02</span><h3>Брати участь</h3><p>Учасники зможуть прочитати контекст і зробити остаточний вибір за відкритими правилами.</p></article><article><span>03</span><h3>Перевіряти результат</h3><p>Оприлюднений підсумок матиме зрозумілу базу розрахунку й матеріали для незалежної перевірки.</p></article></div></section>

      <section className="demand-poll-section" id="poll" aria-labelledby="poll-title">
        <div className="demand-poll-copy"><p className="eyebrow">ВІДКРИТЕ ОПИТУВАННЯ</p><h2 id="poll-title">Допоможіть перевірити потребу</h2><p>Оберіть одну відповідь. Вона стане остаточною для технічного ідентифікатора цього браузера.</p><div className="demand-methodology"><h3>Що означає цей результат</h3><p>Це відкрите опитування з добровільною участю. Воно не перевіряє особу або громадянство, не гарантує одну відповідь від однієї людини й не є репрезентативним опитуванням населення.</p><p>Це не державний сервіс і не офіційне голосування. Повна платформа ще розробляється; у цьому запуску немає перевірки права участі, криптографічного бюлетеня чи незалежно перевірюваного підрахунку.</p></div></div>
        <div className="demand-poll-card">
          {loading ? <p role="status">Завантаження опитування…</p> : poll === null ? <div className="notice error" role="alert">{error}</div> : recorded !== null ? <div className="demand-success" role="status"><span aria-hidden="true">✓</span><p className="eyebrow">ВІДПОВІДЬ ПРИЙНЯТО</p><h2>Дякуємо. Відповідь збережено.</h2><p>Ваш остаточний вибір у цьому браузері: <strong>{recorded}</strong>.</p><p className="muted">Поточний розподіл відповідей не публікується під час збору.</p></div> : <form onSubmit={event => { event.preventDefault(); void submit(); }}><p className="demand-version">Версія {poll.version} · {poll.pollId}</p><fieldset disabled={busy}><legend>{poll.question}</legend><div className="demand-answers">{poll.answers.map(answer => <label className="choice" key={answer}><input type="radio" name="demand-answer" checked={selected === answer} onChange={() => { setSelected(answer); setConfirmed(false); }} />{answer}</label>)}</div></fieldset>{selected !== null && <label className="choice demand-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Підтверджую остаточну відповідь: «{selected}».</label>}{error !== null && <p className="notice error" role="alert">{error}</p>}<button className="primary" type="submit" disabled={selected === null || !confirmed || busy}>{busy ? 'Надсилання…' : 'Надіслати відповідь'}</button><p className="muted">Після прийняття змінити відповідь для цього технічного ідентифікатора не можна.</p></form>}
        </div>
      </section>

      <section className="demand-privacy" id="privacy" aria-labelledby="privacy-title"><div><p className="eyebrow">ПРИВАТНІСТЬ</p><h2 id="privacy-title">Без документів і контактних даних</h2></div><div><p>Форма не запитує ПІБ, РНОКПП, документи, email або номер телефону. Для обмеження випадкових повторних відповідей у цьому браузері до одного року зберігається випадковий технічний ідентифікатор; у базі зберігаються лише його необоротний відбиток і вибрана відповідь. Таблиця відповідей не містить IP-адреси, User-Agent або часу відповіді.</p><p>Очищення даних сайту або інший браузер дозволяють відповісти повторно. Тому результат описуватиме відповіді учасників цього опитування, а не кількість унікальних людей чи думку українців загалом.</p></div></section>
    </main>
    <footer><span>Відкритий голос · Відкритий код AGPL-3.0</span><span>Не державний сервіс. Не офіційне голосування.</span><a href="https://github.com/Lontkovsky/openvote">GitHub ↗</a></footer>
  </div>;
}
