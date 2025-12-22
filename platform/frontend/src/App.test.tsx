/**
 * App 组件单元测试
 * 元征 · 合伙人赋能平台
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (initialRoute = '/') => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('App', () => {
  it('应该正确渲染', () => {
    const { container } = renderWithProviders();
    expect(container).toBeDefined();
  });

  it('应该在登录页面显示登录按钮', () => {
    renderWithProviders('/login');
    // 登录页面应该存在
    expect(screen.getByRole('button')).toBeDefined();
  });
});






