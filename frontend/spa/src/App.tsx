import Layout from '@/layouts/default/Layout.tsx';
import themeService from '@/services/ThemeService.ts';

function App() {
    themeService.init();

    return <Layout />;
}

export default App;
