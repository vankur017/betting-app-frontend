import { Link, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { buttonClasses } from '../../components/ui/buttonStyles';
import { PageHeader } from '../../components/ui/PageHeader';
import { NotFoundPage } from '../NotFoundPage';
import { gameBySlug } from './catalog';

/** Shown for games that are not built yet (Phase 4). */
export function GamePlaceholderPage() {
  const { slug } = useParams();
  const game = gameBySlug(slug);
  if (!game) return <NotFoundPage />;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={game.name} description={game.tagline} />
      <Alert tone="info" title="Coming soon">
        {game.name} is not playable yet. Crash is available now.
      </Alert>
      <section aria-labelledby="rules-heading" className="rounded-2xl border border-night-800 bg-night-900 p-6">
        <h2 id="rules-heading" className="text-lg font-semibold">
          How {game.name} works
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-night-300">
          {game.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </section>
      <div>
        <Link to="/" className={buttonClasses('secondary')}>
          Back to lobby
        </Link>
      </div>
    </div>
  );
}
