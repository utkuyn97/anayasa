/**
 * TasksPage — Container with 3 top-tabs: My Tasks / Household / Personal.
 *
 * URL: /tasks/me (default), /tasks/household, /tasks/personal
 * Default tab: "Görevlerim" (myTasks) — not persisted in localStorage.
 */
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import MyTasksView from '@/modules/chores/MyTasksView';
import ChoresHouseholdView from '@/modules/chores/ChoresHouseholdView';
import PersonalTasksView from '@/modules/personal-tasks/PersonalTasksView';

const tabs = [
  { key: 'me', labelKey: 'tasks.myTasks' },
  { key: 'household', labelKey: 'tasks.household' },
  { key: 'personal', labelKey: 'tasks.personal' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

export default function TasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();

  // Default to 'me' if no tab param or invalid
  const activeTab: TabKey =
    tab === 'household' || tab === 'personal' ? tab : 'me';

  const handleTabChange = (newTab: TabKey) => {
    navigate(`/tasks/${newTab}`, { replace: true });
  };

  return (
    <div>
      {/* Top tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {tabs.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
              activeTab === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-4">
        {activeTab === 'me' && <MyTasksView />}
        {activeTab === 'household' && <ChoresHouseholdView />}
        {activeTab === 'personal' && <PersonalTasksView />}
      </div>
    </div>
  );
}
