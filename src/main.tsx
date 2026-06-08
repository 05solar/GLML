import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initDeviceFit } from './util/deviceFit';
import './globals.css';

// ?fx=0 → 모션(애니메이션) 끄기
if (new URLSearchParams(location.search).get('fx') === '0') {
  document.documentElement.classList.add('nofx');
}

// 데스크톱에서 폰 프레임을 화면에 맞춰 축소(레터박스)
initDeviceFit();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
