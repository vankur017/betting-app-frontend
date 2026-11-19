import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { env } from '../../config/env';
import { GAMES } from '../games/catalog';

const sectionClass = 'scroll-mt-24 rounded-2xl border border-night-800 bg-night-900 p-6';

export function HelpPage() {
  const { hash } = useLocation();

  // React Router does not scroll to fragments, e.g. the footer's /help#report link.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Help & rules" description={`How ${env.appName} works.`} />

      <section id="virtual-coins" aria-labelledby="coins-heading" className={sectionClass}>
        <h2 id="coins-heading" className="text-lg font-semibold">Virtual coins</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-night-300">
          <li>Coins are virtual. They have no monetary value.</li>
          <li>Coins cannot be bought, sold, transferred, withdrawn, or redeemed for anything.</li>
          <li>Each new account receives a starter balance once.</li>
          <li>The server decides every outcome and records every stake and return in your ledger.</li>
          <li>Outcomes are random. No strategy guarantees a win.</li>
        </ul>
      </section>

      <section id="rules" aria-labelledby="rules-heading" className={sectionClass}>
        <h2 id="rules-heading" className="text-lg font-semibold">Game rules</h2>
        <div className="mt-4 flex flex-col gap-6">
          {GAMES.map((game) => (
            <div key={game.slug}>
              <h3 className="font-semibold text-night-100">{game.name}</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-night-300">
                {game.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section id="play-well" aria-labelledby="play-heading" className={sectionClass}>
        <h2 id="play-heading" className="text-lg font-semibold">Play for fun</h2>
        <p className="mt-4 text-sm text-night-300">
          This is entertainment. Take breaks, and stop if it stops being fun.
        </p>
      </section>

      <section id="report" aria-labelledby="report-heading" className={sectionClass}>
        <h2 id="report-heading" className="text-lg font-semibold">Report a bug or abuse</h2>
        {env.supportEmail ? (
          <p className="mt-4 text-sm text-night-300">
            Email{' '}
            <a
              href={`mailto:${env.supportEmail}?subject=${encodeURIComponent(`${env.appName} report`)}`}
              className="font-semibold text-mint-300 underline hover:text-mint-400"
            >
              {env.supportEmail}
            </a>
            . Include what happened, when, and the round ID if you have one.
          </p>
        ) : (
          <p className="mt-4 text-sm text-night-300">
            A reporting channel has not been configured yet. Set VITE_SUPPORT_EMAIL to show one here.
          </p>
        )}
      </section>
    </div>
  );
}
