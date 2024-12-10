import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import './i18n';
import './styles/index.scss';
import './styles/ag-grid-theme.scss';

createRoot(document.getElementById('root')!).render(<App />);
