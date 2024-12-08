import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import NotFoundView from '../NotFoundView';

describe('NotFound', () => {
    it('renders NotFound component', () => {
        render(<NotFoundView />);
        expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
        expect(screen.getByText('The page you are looking for does not exist.')).toBeInTheDocument();
    });
});
