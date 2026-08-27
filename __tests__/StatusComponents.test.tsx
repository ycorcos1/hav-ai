import { render, screen } from '@testing-library/react-native';

import { OfflineBanner } from '@/components/OfflineBanner';
import { PRBanner } from '@/components/PRBanner';
import {
  SyncIndicator,
  type SyncStatus,
} from '@/components/SyncIndicator';
import { colors, radius, spacing } from '@/theme';

describe('status components', () => {
  it('renders the subtle default offline state', async () => {
    await render(<OfflineBanner />);
    const banner = screen.getByLabelText('Offline · Saved on device');

    expect(banner).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(banner).toHaveProp('accessibilityRole', 'text');
    expect(banner).toHaveStyle({
      backgroundColor: colors.surface.primary,
      borderColor: colors.border.default,
      borderRadius: radius.control,
    });
    expect(screen.getByText('Offline · Saved on device')).toBeOnTheScreen();
  });

  it('supports custom offline messaging and hidden state', async () => {
    const { rerender } = await render(
      <OfflineBanner message="Offline · Workout saved locally" />,
    );

    expect(screen.getByText('Offline · Workout saved locally')).toBeOnTheScreen();

    await rerender(<OfflineBanner visible={false} />);

    expect(screen.queryByText('Offline · Saved on device')).not.toBeOnTheScreen();
  });

  it.each<[Exclude<SyncStatus, 'hidden'>, string]>([
    ['syncing', 'Syncing...'],
    ['synced', 'Synced'],
    ['needsAttention', 'Needs Attention'],
  ])('renders the %s sync state with text semantics', async (status, label) => {
    await render(<SyncIndicator status={status} />);
    const indicator = screen.getByLabelText(label);

    expect(indicator).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(indicator).toHaveProp('accessibilityRole', 'text');
    expect(screen.getByText(label)).toBeOnTheScreen();
  });

  it('hides the normal idle sync state and supports contextual text', async () => {
    const { rerender } = await render(<SyncIndicator status="hidden" />);

    expect(screen.queryByText('Synced')).not.toBeOnTheScreen();

    await rerender(
      <SyncIndicator
        message="1 workout waiting to sync"
        status="needsAttention"
      />,
    );

    expect(screen.getByText('1 workout waiting to sync')).toBeOnTheScreen();
  });

  it('renders generic personal-record content and previous context', async () => {
    await render(
      <PRBanner
        previousValue="Previous best · 185 × 8"
        title="NEW REP PR"
        value="185 × 9"
      />,
    );
    const banner = screen.getByRole('alert');

    expect(banner).toHaveProp(
      'accessibilityLabel',
      'NEW REP PR. 185 × 9. Previous best · 185 × 8',
    );
    expect(banner).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(banner).toHaveStyle({
      backgroundColor: colors.accent.soft,
      borderColor: colors.accent.primary,
      borderRadius: radius.card,
      padding: spacing.md,
    });
    expect(screen.getByText('NEW REP PR')).toHaveStyle({
      color: colors.accent.primary,
    });
    expect(screen.getByText('185 × 9')).toBeOnTheScreen();
    expect(screen.getByText('Previous best · 185 × 8')).toBeOnTheScreen();
  });

  it('renders PR feedback without optional previous context', async () => {
    await render(<PRBanner title="NEW MAX WEIGHT PR" value="225 LB" />);

    expect(screen.getByText('NEW MAX WEIGHT PR')).toBeOnTheScreen();
    expect(screen.getByText('225 LB')).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveProp(
      'accessibilityLabel',
      'NEW MAX WEIGHT PR. 225 LB',
    );
  });

  it('does not disable text scaling on status content', async () => {
    await render(
      <>
        <OfflineBanner />
        <SyncIndicator status="syncing" />
        <PRBanner title="NEW PR" value="30 × 15" />
      </>,
    );

    expect(screen.getByText('Offline · Saved on device')).not.toHaveProp(
      'allowFontScaling',
    );
    expect(screen.getByText('Syncing...')).not.toHaveProp('allowFontScaling');
    expect(screen.getByText('30 × 15')).not.toHaveProp('allowFontScaling');
  });
});
