import { render } from 'preact';
import { App } from './shell/App';
import './styles/globals.css';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app mount point');

render(<App />, root);
