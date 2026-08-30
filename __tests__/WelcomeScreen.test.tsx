import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { WelcomeScreen } from '@/features/auth/screens/WelcomeScreen';

describe('WelcomeScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders the canonical welcome screen and actions', async () => {
    const screen = await render(<WelcomeScreen />);

    expect(screen.getByText('Welcome to havAI')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeTruthy();
    expect(screen.queryByText('Auth')).toBeNull();
  });

  it('navigates Create Account to signup', async () => {
    const screen = await render(<WelcomeScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));

    expect(mockPush).toHaveBeenCalledWith('/(auth)/signup');
  });

  it('navigates Log In to login', async () => {
    const screen = await render(<WelcomeScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Log In' }));

    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });
});
