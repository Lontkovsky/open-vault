import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Categories, Poll, policyText } from '../../../packages/domain/src/index.ts';
import type { PollType } from '../../../packages/domain/src/index.ts';
import { request } from './api.ts';
import { PollPage, stateNames } from './PollPage.tsx';
import { Identity } from './Identity.tsx';
import { DraftEditor, MyPolls, ReviewQueue } from './Workspace.tsx';
import openVoteMark from './assets/openvote-mark.svg';

export function App() {
  const [route, setRoute] = useState(location.hash);
  const [auth, setAuth] = useState<Auth | null>(null);
  useEffect(() => {
    if (auth === null) return;
    const timer = setTimeout(() => setAuth(null), Math.max(0, Date.parse(auth.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [auth]);
  const [polls, setPolls] = useState<PollType[]>([]), [query, setQuery] = useState(''), [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null), [loading, setLoading] = useState(true);
  useEffect(() => { const update = () => setRoute(location.hash); addEventListener('hashchange', update); return () => removeEventListener('hashchange', update); }, []);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    setLoading(true); setError(null);
    request('management', '/v1/polls?' + params.toString()).then(value => {
      const result = z.object({ polls: z.array(Poll) }).parse(value);
      if (active) setPolls(result.polls);
    }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Помилка запиту'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, category, route]);
  return <>
    <a className="skip" href="#main">До основного вмісту</a>
    <div className="environment"><span className="status-dot" /> Синтетична demo-версія <span>Лише тестові особи · справжні документи не приймаються</span></div>
    <header className="site-header"><a className="brand" href="#/" aria-label="OpenVote — на початок сторінки"><span className="brand-mark" aria-hidden="true"><img src={openVoteMark} alt="" /></span><span>OpenVote<small>Чесно. Прозоро. Анонімно.</small></span></a>
      <nav aria-label="Основна навігація"><a href="#/" aria-current={!route || route === '#/' ? 'page' : undefined}>Голосування</a><a href="#/trust">Центр довіри</a><a href="#/help">Довідка</a></nav>
      {auth === null ? <a className="button secondary" href="#/identity">Підтвердити участь</a> : <div className="account-actions"><a href="#/mine">Мої питання</a>{auth.role === 'moderator' && <a href="#/moderation">Модерація</a>}<button className="secondary" onClick={() => { void request('identity', '/v1/session', 'DELETE', undefined, auth.token).then(() => { setAuth(null); location.hash = '#/'; }).catch((e: Error) => setError(e.message)); }}>Вийти</button></div>}</header>
    <main id="main" tabIndex={-1}>
      {route === '#/trust' ? <section className="reading"><p className="eyebrow">ВІДКРИТІ ПРАВИЛА</p><h1>Довіра починається з перевірки</h1><p className="lead">OpenVote відкриває правила, код і матеріали для перевірки — та чесно показує межі системи.</p><div className="reading-grid"><article className="reading-card"><span>01</span><h2>Що можна перевірити</h2><p>Публічний архів дозволяє перевірити криптографічні докази й підрахунок. Tracker підтверджує включення бюлетеня, але не розкриває відповідь.</p></article>
        <article className="reading-card"><span>02</span><h2>Зовнішні спостерігачі</h2><p>Окрема програма зберігає підписану історію та звіряє опублікований підрахунок без доступу до ідентифікації.</p></article>
        <article className="reading-card"><span>03</span><h2>Від кого залежить приватність</h2><p>Сторона, яка видає право участі, бачить особу. Достатня змова власників ключів може розшифрувати бюлетені.</p></article>
        <article className="reading-card"><span>04</span><h2>Чого ми не обіцяємо</h2><p>Ця версія не захищає від примусу, зараженого пристрою чи підміни клієнтського коду. Незалежний аудит ще не виконано.</p></article></div>
        <details className="technical-disclosure"><summary>Технічні відомості</summary><p>Demo-версія використовує Belenios 3.3.0 і лише синтетичні особи. Спостерігач потребує заздалегідь перевіреного ключа та manifest. Суперечливі історії виявляються після обміну свідченнями. Повністю ізольовані спостерігачі не гарантують виявлення split-view.</p></details><p><a href="https://github.com/Lontkovsky/openvote">Код, рішення й перевірки на GitHub ↗</a></p></section>
      : route === '#/help' ? <section className="reading"><p className="eyebrow">ЧОТИРИ КРОКИ</p><h1>Як працює участь</h1><p className="lead">Від питання до перевіреного підсумку — без прихованих кроків.</p><ol className="steps"><li><h2>Прочитайте питання й правила</h2><p>Одразу перевірте, хто може брати участь і коли завершиться голосування.</p></li><li><h2>Підтвердьте право участі</h2><p>У demo-версії використовуйте лише тестову особу. Зміна провайдера не дає другого голосу.</p></li><li><h2>Зробіть остаточний вибір</h2><p>Відповідь шифрується на вашому пристрої. Після прийняття змінити її не можна.</p></li><li><h2>Перевірте підсумок</h2><p>Збережіть tracker для перевірки включення. Розподіл відповідей відкривається лише після закриття й за достатньої кількості учасників.</p></li></ol></section>
      : route.startsWith('#/identity') ? <Identity onSignedIn={signedIn => { setAuth(signedIn); const destination = new URLSearchParams(route.split('?')[1]).get('return'); location.hash = destination !== null && destination.startsWith('#/poll/') ? destination : '#/'; }} />
      : route.startsWith('#/poll/') ? <PollPage key={route} id={route.slice(7)} auth={auth} />
      : route === '#/new' || route.startsWith('#/edit/') ? auth === null ? <Identity onSignedIn={setAuth} /> : <DraftEditor auth={auth} id={route.startsWith('#/edit/') ? route.slice(7) : null} />
      : route === '#/mine' ? auth === null ? <Identity onSignedIn={setAuth} /> : <MyPolls auth={auth} />
      : route === '#/moderation' ? auth === null ? <Identity onSignedIn={setAuth} /> : <ReviewQueue auth={auth} />
      : <><section className="page-heading"><div><p className="eyebrow">ВІДКРИТІ ГОЛОСУВАННЯ</p><h1>Голосування</h1><p className="lead">Ставте важливі питання, робіть приватний вибір і перевіряйте оприлюднений результат.</p></div><a className="button primary" href="#/new">+ Створити питання</a></section>
        <div className="catalog-tools"><label className="search">Пошук питань<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Категорія<select value={category} onChange={e => setCategory(e.target.value)}><option value="">Усі категорії</option>{Categories.map(c => <option key={c}>{c}</option>)}</select></label></div>
        <div className="catalog-layout"><section aria-label="Каталог голосувань"><div className="section-line"><h2>Каталог</h2><span>Новіші спочатку</span></div>{loading ? <p role="status">Завантаження голосувань…</p> : error ? <div className="notice error" role="alert">Не вдалося завантажити каталог: {error}</div> : polls.length === 0 ? <div className="empty"><span className="empty-symbol">+</span><h2>Питань ще немає</h2><p>{query || category ? 'За цими умовами голосувань не знайдено.' : 'Створіть першу пропозицію після підтвердження тестової особи.'}</p></div> : <div className="poll-list">{polls.map(poll => <article className="poll-card" key={poll.id}><div className="card-top"><span className="category">{poll.content.category}</span><span className="state">{stateNames[poll.state]}</span></div><h2><a href={`#/poll/${poll.id}`}>{poll.content.question}</a></h2><p>{poll.content.context}</p><div className="card-bottom"><span>{poll.content.authorAlias}</span><span>{policyText(poll.content.policy)}</span></div></article>)}</div>}</section>
          <aside className="principles"><span className="eyebrow">ВАЖЛИВЕ ПРАВИЛО</span><h2>Одна людина — один голос.</h2><p>Зміна пристрою чи способу підтвердження не додає ще одного голосу.</p><div className="rule" /><h3>Результат — про учасників</h3><p>OpenVote показує позицію учасників конкретного голосування, а не думку всього населення.</p><a href="#/trust">Межі гарантій <span aria-hidden="true">↗</span></a></aside></div></>}
    </main><footer><span>OpenVote · Чесно. Прозоро. Анонімно.</span><span>Не державний сервіс. Не офіційні вибори.</span><a href="https://github.com/Lontkovsky/openvote">Відкритий код ↗</a></footer>
  </>;
}

export type Auth = { token: string; role: string; expiresAt: string };
