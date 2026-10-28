import { notFound } from 'next/navigation';

/** Unknown paths under a locale get the branded 404 inside the site layout. */
export default function UnknownPage() {
  notFound();
}
