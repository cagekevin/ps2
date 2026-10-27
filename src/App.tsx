import { HashRouter } from 'react-router-dom';
import { Layout } from './app/layout';
import { Providers } from './app/providers';
import { AppRoutes } from './app/router';

export default function App() {
  return (
    <Providers>
      <HashRouter>
        <Layout>
          <AppRoutes />
        </Layout>
      </HashRouter>
    </Providers>
  );
}
