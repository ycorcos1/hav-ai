import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('test infrastructure', () => {
  it('renders a React Native component', async () => {
    await render(<Text>test infrastructure ready</Text>);

    expect(screen.getByText('test infrastructure ready')).toBeOnTheScreen();
  });
});
