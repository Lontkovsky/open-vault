import { createRoot } from 'react-dom/client';
import { DemandApp } from './DemandApp.tsx';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(<DemandApp />);
