import { render } from 'preact';
import { language, ui } from './i18n';
import { App } from './shell/App';
import './styles/globals.css';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app mount point');

// The page says what language it speaks, for screen readers and hyphenation alike.
document.documentElement.lang = language;
document.title = ui.app.name;

render(<App />, root);
