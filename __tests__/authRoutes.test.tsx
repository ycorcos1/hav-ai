import { render } from '@testing-library/react-native';

const mockRegisteredScreens: string[] = [];
const mockPush = jest.fn();
let mockInitialRouteName: string | undefined;

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  function Stack({
    children,
    initialRouteName,
  }: {
    children?: unknown;
    initialRouteName?: string;
  }) {
    mockInitialRouteName = initialRouteName;
    return React.createElement(View, null, children);
  }

  Stack.Screen = ({ name }: { name: string }) => {
    mockRegisteredScreens.push(name);
    return null;
  };

  return { Stack, useRouter: () => ({ push: mockPush }) };
});

import AuthLayout from '@/app/(auth)/_layout';
import LoginRoute from '@/app/(auth)/login';
import SignupRoute from '@/app/(auth)/signup';
import WelcomeRoute from '@/app/(auth)/welcome';

describe('auth routes', () => {
  beforeEach(() => {
    mockRegisteredScreens.length = 0;
    mockInitialRouteName = undefined;
  });

  it('registers the canonical auth routes in the auth stack', async () => {
    await render(<AuthLayout />);

    expect(mockInitialRouteName).toBe('welcome');
    expect(mockRegisteredScreens).toEqual(['welcome', 'login', 'signup']);
  });

  it.each([
    ['Welcome to havAI', WelcomeRoute],
    ['Login', LoginRoute],
    ['Signup', SignupRoute],
  ])('renders the minimal %s route placeholder', async (title, Route) => {
    const screen = await render(<Route />);

    expect(screen.getByText(title)).toBeTruthy();
  });
});
