import { Link } from 'react-router-dom';
import { buttonClasses } from '../components/ui/buttonStyles';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-sm font-semibold text-mint-400">404</p>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-night-300">That page does not exist or has moved.</p>
      <Link to="/" className={buttonClasses('primary')}>
        Go to lobby
      </Link>
    </div>
  );
}
