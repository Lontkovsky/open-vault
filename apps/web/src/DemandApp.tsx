import { useEffect, useState } from 'react';
import { demandQuestion } from '../../../packages/domain/src/demand.ts';
import type { DemandAnswerType, DemandPollStatusType } from '../../../packages/domain/src/demand.ts';
import { DemandApiFailure, loadDemandPoll, recordDemandResponse } from './demand-api.ts';
import openVoteMark from './assets/openvote-mark.svg';
import walkthroughPoster from './assets/platform-walkthrough-poster.jpg';
import walkthroughVideo from './assets/platform-walkthrough.mp4';

function errorText(error: unknown): string {
  if (error instanceof DemandApiFailure) {
    if (error.message === 'FINAL_RESPONSE_ALREADY_RECORDED') return 'Попередню остаточну відповідь уже прийнято. Нову відповідь не прийнято.';
    if (error.message === 'DEMAND_CREDENTIAL_REQUIRED') return 'Не вдалося підтвердити сесію. Відповідь не надіслано.';
    if (error.message === 'INVALID_DEMAND_CREDENTIAL') return 'Не вдалося підтвердити сесію. Відповідь не надіслано.';
    if (error.message === 'ORIGIN_REJECTED') return 'Не вдалося перевірити запит. Відповідь не надіслано.';
    return 'Не вдалося прийняти відповідь. Спробуйте ще раз.';
  }
  return 'Відповідь не надіслано. Спробуйте ще раз.';
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
    if (selected === null || !confirmed || poll === null) return;
    setBusy(true); setError(null);
    try {
      const result = await recordDemandResponse(selected);
      setRecorded(result.answer);
      setPoll({ ...poll, response: { answer: result.answer }, results: result.results });
      setSelected(null); setConfirmed(false);
    } catch (reason) { setError(errorText(reason)); }
    finally { setBusy(false); }
  }

  return <div className="demand-page">
    <a className="skip" href="#main">До основного вмісту</a>
    <header className="demand-header">
      <a className="brand" href="#top" aria-label="OpenVote — на початок сторінки"><span className="brand-mark" aria-hidden="true"><img src={openVoteMark} alt="" /></span><span>OpenVote<small>Незалежна платформа</small></span></a>
      <a className="button primary" href="#poll">Проголосувати</a>
    </header>
    <main id="main" className="demand-main">
      <section className="demand-hero" id="top">
        <div className="demand-hero-copy"><p className="eyebrow">ВІДКРИТЕ ОПИТУВАННЯ</p><h1>{demandQuestion}</h1><p className="demand-lead">Допоможіть вирішити, чи варто розвивати платформу для незалежних відкритих голосувань.</p></div>
      </section>

      <section className="demand-poll-section" id="poll" aria-labelledby="poll-title">
        <div className="demand-poll-copy"><p className="eyebrow">ВАШ ГОЛОС</p><h2 id="poll-title">Оберіть одну відповідь</h2><div className="demand-methodology"><p>Участь добровільна. Опитування не перевіряє особу, громадянство або унікальність учасників, тому результати не відображають думку українців загалом.</p></div></div>
        <div className="demand-poll-card">
          {loading ? <p role="status">Завантаження опитування…</p> : poll === null ? <div className="notice error" role="alert">{error}</div> : <>
            {recorded !== null ? <div className="demand-success" role="status"><span aria-hidden="true">✓</span><h2>Дякуємо за ваш голос.</h2></div> : <form onSubmit={event => { event.preventDefault(); void submit(); }}><fieldset disabled={busy}><legend>{poll.question}</legend><div className="demand-answers">{poll.answers.map(answer => <label className="choice" key={answer}><input type="radio" name="demand-answer" checked={selected === answer} onChange={() => { setSelected(answer); setConfirmed(false); }} />{answer}</label>)}</div></fieldset>{selected !== null && <label className="choice demand-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Підтверджую вибір: «{selected}».</label>}{error !== null && <p className="notice error" role="alert">{error}</p>}<button className="primary" type="submit" disabled={selected === null || !confirmed || busy}>{busy ? 'Надсилання…' : 'Надіслати відповідь'}</button></form>}
            <section className="demand-results" aria-labelledby="demand-results-title">
              <h3 id="demand-results-title">Поточні результати</h3>
              <p className="demand-results-total">Всього відповідей: <strong>{poll.results.totalResponses}</strong></p>
              <dl>{poll.answers.map((answer, index) => <div key={answer}><dt>{answer}</dt><dd>{poll.results.counts[index]}</dd></div>)}</dl>
            </section>
          </>}
        </div>
      </section>

      <section className="demand-demo" id="demo" aria-labelledby="demo-title">
        <div className="demand-demo-heading"><p className="eyebrow">СИНТЕТИЧНА ДЕМОНСТРАЦІЯ</p><h2 id="demo-title">Як працюватиме платформа</h2><p>Короткий огляд поточного прототипу на тестових даних. Інтерфейс ще розвивається.</p></div>
        <div className="demand-demo-grid">
          <div className="demand-video-frame"><video controls muted playsInline preload="metadata" poster={walkthroughPoster} aria-label="Демонстрація створення питання, голосування та перегляду результату"><source src={walkthroughVideo} type="video/mp4" />Ваш браузер не підтримує відтворення відео.</video></div>
          <ol className="demand-demo-steps" aria-label="Етапи роботи платформи" role="list"><li><span>01</span><div><h3>Створити питання</h3><p>Додати контекст, аргументи та правила участі.</p></div></li><li><span>02</span><div><h3>Проголосувати</h3><p>Ознайомитися з умовами й підтвердити остаточний вибір.</p></div></li><li><span>03</span><div><h3>Перевірити результат</h3><p>Побачити підсумок і матеріали для незалежної перевірки.</p></div></li></ol>
        </div>
      </section>
    </main>
    <footer><span>OpenVote · Відкритий код AGPL-3.0</span><span>Не державний сервіс. Не офіційне голосування.</span><a href="https://github.com/Lontkovsky/openvote">GitHub ↗</a></footer>
  </div>;
}
