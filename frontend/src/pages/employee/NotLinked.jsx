import { UserX } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import EmptyState from '../../components/feedback/EmptyState';
import { normalizeError } from '../../lib/errors';

/** True when an API error means "this account has no employee record". */
export const isNotLinkedError = (error) => Boolean(error) && normalizeError(error).kind === 'notfound';

export default function NotLinked() {
  return (
    <Card>
      <EmptyState
        icon={UserX}
        title="Your account isn't linked to an employee record yet"
        description="Nothing is wrong on your end. Ask an administrator to add you as an employee using this email address, and your attendance, payroll and reviews will appear here."
      />
    </Card>
  );
}
