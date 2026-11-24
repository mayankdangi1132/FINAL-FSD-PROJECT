import { Link } from 'react-router-dom';
import { Soup } from 'lucide-react';
import { EmptyState } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <div className="container narrow">
      <EmptyState
        icon={Soup}
        title="Page not found"
        text="The page you're looking for isn't on the menu. Let's get you back on track."
        action={<Link to="/" className="btn btn-primary">Back to home</Link>}
      />
    </div>
  );
}
