import { act, fireEvent, render } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockSignIn = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/lib/supabase/services', () => ({
  authService: { signIn: (...args: unknown[]) => mockSignIn(...args) },
}));

import { LoginScreen } from '@/features/auth/screens/LoginScreen';

async function fillLoginForm(screen: Awaited<ReturnType<typeof render>>) {
  await fireEvent.changeText(screen.getByLabelText('Email'), 'athlete@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'strong-password');
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the canonical fields with secure password entry', async () => {
    const screen = await render(<LoginScreen />);

    expect(screen.getByText('Continue your training journey with havAI.')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
  });

  it('blocks required and invalid-email submissions', async () => {
    const screen = await render(<LoginScreen />);
    const submit = screen.getByRole('button', { name: 'Log In' });

    await fireEvent.press(submit);
    expect(screen.getByText('Enter your email.')).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'password');
    await fireEvent.press(submit);

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('sends canonical credentials and hands active sessions to the root route', async () => {
    mockSignIn.mockResolvedValue({
      user: { id: 'user-id', email: 'athlete@example.com' },
      session: { user: { id: 'user-id', email: 'athlete@example.com' } },
    });
    const screen = await render(<LoginScreen />);
    await fillLoginForm(screen);

    await fireEvent.press(screen.getByRole('button', { name: 'Log In' }));

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'athlete@example.com',
      password: 'strong-password',
    });
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('prevents duplicate submissions while loading', async () => {
    let resolveSignIn!: (value: { user: { id: string }; session: null }) => void;
    mockSignIn.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );
    const screen = await render(<LoginScreen />);
    await fillLoginForm(screen);
    const submit = screen.getByRole('button', { name: 'Log In' });

    await act(async () => {
      fireEvent.press(submit);
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.press(submit);
      await Promise.resolve();
    });

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveSignIn({ user: { id: 'user-id' }, session: null });
      await Promise.resolve();
    });
  });

  it('shows sanitized authentication errors', async () => {
    mockSignIn.mockRejectedValue({
      code: 'invalid_credentials',
      message: 'raw provider message',
    });
    const screen = await render(<LoginScreen />);
    await fillLoginForm(screen);
    await fireEvent.press(screen.getByRole('button', { name: 'Log In' }));

    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
    expect(screen.queryByText('raw provider message')).toBeNull();
  });
});
