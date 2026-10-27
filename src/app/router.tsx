/**
 * 【范本】路由注册
 * 新增页面：在这里加一条 Route，页面一律 React.lazy 动态导入。
 * 未实现的导航项不注册路由，避免跳到空白页。
 */
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DEFAULT_PATH } from './nav-config';

const StylePage = lazy(() => import('../features/style/StylePage'));
const FontManagePage = lazy(() => import('../features/font-manage/FontManagePage'));

/** 调试页：不占导航，手动访问 #/debug */
const HomePage = lazy(() => import('../features/home/HomePage'));

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="mm-loading">加载中…</div>}>
      <Routes>
        <Route path="/" element={<Navigate to={DEFAULT_PATH} replace />} />
        <Route path="/style" element={<StylePage />} />
        <Route path="/font-manage" element={<FontManagePage />} />
        <Route path="/debug" element={<HomePage />} />
        <Route path="*" element={<Navigate to={DEFAULT_PATH} replace />} />
      </Routes>
    </Suspense>
  );
}
