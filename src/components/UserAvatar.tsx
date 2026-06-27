/**
 * UserAvatar — Small avatar circle showing user's initial + color.
 * Used on ChoreCard to show who's assigned.
 */
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  displayName: string | null;
  colorHex: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export default function UserAvatar({
  displayName,
  colorHex,
  size = 'sm',
  className,
}: UserAvatarProps) {
  const initial = displayName?.charAt(0).toUpperCase() ?? '?';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        size === 'xs'
          ? 'h-5 w-5 text-[8px]'
          : size === 'sm'
            ? 'h-8 w-8 text-xs'
            : 'h-10 w-10 text-sm',
        className,
      )}
      style={{ backgroundColor: colorHex }}
    >
      {initial}
    </div>
  );
}
