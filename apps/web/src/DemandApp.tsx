import { useEffect, useState } from 'react';
import type { DemandAnswerType, DemandPollStatusType } from '../../../packages/domain/src/demand.ts';
import { DemandApiFailure, loadDemandPoll, recordDemandResponse } from './demand-api.ts';
import openVoteMark from './assets/openvote-mark.svg';
import walkthroughPoster from './assets/platform-walkthrough-poster.jpg';
import walkthroughVideo from './assets/platform-walkthrough.mp4';

const launchSupportGoal = 10_000;

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

  const supportingResponses = poll === null ? null : poll.results.counts[0];

  return <div className="demand-page">
    <a className="skip" href="#main">До основного вмісту</a>
    <header className="demand-header">
      <a className="brand" href="#top" aria-label="OpenVote — на початок сторінки"><span className="brand-mark" aria-hidden="true"><img src={openVoteMark} alt="" /></span><span>OpenVote<small>Чесно. Прозоро. Анонімно.</small></span></a>
      <a className="button primary" href="#poll">Проголосувати</a>
    </header>
    <main id="main" className="demand-main">
      <section className="demand-hero" id="top">
        <div className="demand-hero-copy"><h1>Чи потрібна вам незалежна відкрита платформа для голосувань?</h1><p className="demand-lead">Ми розробляємо платформу, де можна буде брати участь у незалежних відкритих голосуваннях і розміщувати власні. Допоможіть зрозуміти, чи потрібна вам така платформа.</p>{supportingResponses !== null && <aside className="demand-launch-goal" aria-labelledby="demand-launch-goal-title"><p className="eyebrow" id="demand-launch-goal-title">МЕТА ЗАПУСКУ</p><p className="demand-launch-goal-target"><strong>{supportingResponses.toLocaleString('uk-UA')}</strong> із {launchSupportGoal.toLocaleString('uk-UA')} голосів «Підтримую»</p>{supportingResponses < launchSupportGoal ? <><p className="demand-launch-goal-note">Коли досягнемо мети, запустимо повну платформу.</p><p className="demand-launch-goal-status">До мети: <strong>{(launchSupportGoal - supportingResponses).toLocaleString('uk-UA')}</strong></p></> : <p className="demand-launch-goal-status"><strong>Мету досягнуто. Запускаємо OpenVote.</strong></p>}</aside>}</div>
        <section className="demand-poll-card demand-hero-poll" id="poll" aria-label="Опитування">
          {loading ? <p role="status">Завантаження опитування…</p> : poll === null ? <div className="notice error" role="alert">{error}</div> : <>
            {recorded !== null ? <div className="demand-success" role="status"><span aria-hidden="true">✓</span><h2>Дякуємо за ваш голос.</h2></div> : <form onSubmit={event => { event.preventDefault(); void submit(); }}><fieldset disabled={busy}><legend>{poll.question}</legend><div className="demand-answers">{poll.answers.map(answer => <label className="choice" key={answer}><input type="radio" name="demand-answer" checked={selected === answer} onChange={() => { setSelected(answer); setConfirmed(false); }} />{answer}</label>)}</div></fieldset>{selected !== null && <label className="choice demand-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Підтверджую вибір: «{selected}».</label>}{error !== null && <p className="notice error" role="alert">{error}</p>}<button className="primary" type="submit" disabled={selected === null || !confirmed || busy}>{busy ? 'Надсилання…' : 'Надіслати відповідь'}</button></form>}
            <section className="demand-results" aria-labelledby="demand-results-title">
              <h3 id="demand-results-title">Поточні результати</h3>
              <p className="demand-results-total">Всього відповідей: <strong>{poll.results.totalResponses}</strong></p>
              <dl>{poll.answers.map((answer, index) => <div key={answer}><dt>{answer}</dt><dd>{poll.results.counts[index]}</dd></div>)}</dl>
            </section>
          </>}
        </section>
      </section>

      <section className="demand-about" id="about" aria-labelledby="about-title"><div className="demand-section-heading"><p className="eyebrow">ЩО МИ РОЗРОБЛЯЄМО</p><h2 id="about-title">Місце для відкритих громадських питань</h2><p>Мета повної платформи — дати людям зрозумілий спосіб ставити питання, брати участь і перевіряти оприлюднені результати.</p></div><div className="demand-feature-grid"><article><span>01</span><h3>Розміщувати питання</h3><p>Автори зможуть пропонувати громадські, соціальні, економічні, культурні та інші теми.</p></article><article><span>02</span><h3>Брати участь</h3><p>Учасники зможуть прочитати контекст і зробити остаточний вибір за відкритими правилами.</p></article><article><span>03</span><h3>Перевіряти результат</h3><p>Оприлюднений підсумок матиме зрозумілу базу розрахунку й матеріали для незалежної перевірки.</p></article></div></section>

      <section className="demand-demo" id="demo" aria-labelledby="demo-title">
        <div className="demand-demo-heading"><h2 id="demo-title">Як працює платформа</h2></div>
        <div className="demand-demo-grid">
          <div className="demand-video-frame"><video controls muted playsInline preload="metadata" poster={walkthroughPoster} aria-label="Демонстрація створення питання, голосування та перегляду результату"><source src={walkthroughVideo} type="video/mp4" />Не вдалося відтворити відео.</video></div>
          <ol className="demand-demo-steps" aria-label="Етапи роботи платформи" role="list"><li><span>01</span><div><h3>Створити питання</h3><p>Додати контекст, аргументи та правила участі.</p></div></li><li><span>02</span><div><h3>Проголосувати</h3><p>Ознайомитися з умовами й підтвердити остаточний вибір.</p></div></li><li><span>03</span><div><h3>Перевірити результат</h3><p>Побачити підсумок і матеріали для незалежної перевірки.</p></div></li></ol>
        </div>
      </section>

      <section className="demand-privacy" id="privacy" aria-labelledby="privacy-title"><div><p className="eyebrow">ПРИВАТНІСТЬ</p><h2 id="privacy-title">Без документів і контактних даних</h2></div><div><p>Для участі не потрібні ПІБ, РНОКПП, документи, email або номер телефону. Відповідь не пов’язується з іменем або контактними даними.</p><p>Участь добровільна. Опитування не перевіряє особу, громадянство або унікальність учасників, тому результат показує відповіді учасників цього опитування, а не думку українців загалом.</p></div></section>
    </main>
    <footer><span>OpenVote · Відкритий код AGPL-3.0</span><span>Не державний сервіс. Не офіційне голосування.</span><a href="https://github.com/Lontkovsky/openvote">GitHub ↗</a></footer>
  </div>;
}
