import { act, fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSignUp = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('@/lib/supabase/services', () => ({
  authService: { signUp: (...args: unknown[]) => mockSignUp(...args) },
}));

import { SignupScreen } from '@/features/auth/screens/SignupScreen';

async function fillSignupForm(screen: Awaited<ReturnType<typeof render>>) {
  await fireEvent.changeText(screen.getByLabelText('Email'), 'athlete@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'strong-password');
  await fireEvent.changeText(
    screen.getByLabelText('Confirm password'),
    'strong-password',
  );
}

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the canonical fields with secure password entry', async () => {
    const screen = await render(<SignupScreen />);

    expect(screen.getByText('Create your account')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
    expect(screen.getByLabelText('Confirm password')).toHaveProp(
      'secureTextEntry',
      true,
    );
  });

  it('blocks required, invalid-email, and mismatched-password submissions', async () => {
    const screen = await render(<SignupScreen />);
    const submit = screen.getByRole('button', { name: 'Create Account' });

    await fireEvent.press(submit);
    expect(screen.getByText('Enter your email.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'password');
    await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'different');
    await fireEvent.press(submit);

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('sends canonical credentials and hands active sessions to the root route', async () => {
    mockSignUp.mockResolvedValue({
      user: { id: 'user-id', email: 'athlete@example.com' },
      session: { user: { id: 'user-id', email: 'athlete@example.com' } },
    });
    const screen = await render(<SignupScreen />);
    await fillSignupForm(screen);

    await fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Create your account')).toBeTruthy();
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'athlete@example.com',
      password: 'strong-password',
    });
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('shows the approved null-session confirmation and links to Login', async () => {
    mockSignUp.mockResolvedValue({
      user: { id: 'user-id', email: 'athlete@example.com' },
      session: null,
    });
    const screen = await render(<SignupScreen />);
    await fillSignupForm(screen);

    await fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));

    expect(
      await screen.findByText('Check your email to confirm your account.'),
    ).toBeTruthy();
    expect(screen.queryByText('private provider detail')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Log In' }));
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('sanitizes provider errors and prevents duplicate submissions while loading', async () => {
    let resolveSignup!: (value: { user: { id: string }; session: null }) => void;
    mockSignUp.mockReturnValue(
      new Promise((resolve) => {
        resolveSignup = resolve;
      }),
    );
    const screen = await render(<SignupScreen />);
    await fillSignupForm(screen);
    const submit = screen.getByRole('button', { name: 'Create Account' });

    await act(async () => {
      fireEvent.press(submit);
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.press(submit);
      await Promise.resolve();
    });
    expect(mockSignUp).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSignup({ user: { id: 'user-id' }, session: null });
      await Promise.resolve();
    });
  });

  it('maps known AuthErrorCode values without showing provider details', async () => {
    mockSignUp.mockRejectedValue({
      code: 'email_already_registered',
      message: 'raw provider message',
    });
    const screen = await render(<SignupScreen />);
    await fillSignupForm(screen);
    await fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));

    expect(
      await screen.findByText('An account with this email already exists.'),
    ).toBeTruthy();
    expect(screen.queryByText('raw provider message')).toBeNull();
  });
});
