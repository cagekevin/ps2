import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/global.css';

/* 开发时在浏览器里塞一份假属性，方便对照样式；生产构建不会加载（见 dev/preview.ts） */
if (import.meta.env.DEV) {
  void import('./dev/preview').then((module) => module.installPreviewData());
}

const root = document.getElementById('root');
if (!root) throw new Error('缺少 #root 节点');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
