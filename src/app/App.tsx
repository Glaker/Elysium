import { MantineProvider } from '@mantine/core';
import { RouterProvider } from 'react-router';

import { AuthProvider } from '@/app/AuthProvider';
import { router } from '@/app/router';
import { theme } from '@/app/theme';

import '@mantine/core/styles.css';

export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark" forceColorScheme="dark">
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </MantineProvider>
  );
}
