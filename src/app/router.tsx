/**
 * 【范本】路由注册
 * 新增页面：在这里加一条 Route，页面一律 React.lazy 动态导入。
 * 未实现的导航项不注册路由，避免跳到空白页。
 */
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DEFAULT_PATH } from './nav-config';

const StylePage = lazy(() => import('../features/style/StylePage'));
const TemplatePage = lazy(() => import('../features/template/TemplatePage'));
const CommonPage = lazy(() => import('../features/common/CommonPage'));
const ActionPage = lazy(() => import('../features/action/ActionPage'));
const RenamePage = lazy(() => import('../features/rename/RenamePage'));
const DlssPage = lazy(() => import('../features/dlss/DlssPage'));
const FontManagePage = lazy(() => import('../features/font-manage/FontManagePage'));
const FontPanelPage = lazy(() => import('../features/font-panel/FontPanelPage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));

/** 调试页：不占导航，手动访问 #/debug */
const HomePage = lazy(() => import('../features/home/HomePage'));

export function AppRoutes() {
  /*
   * `key` = 当前路径：换页即重建边界。没有它的话，某页失败后失败态会一直挂着，
   * 点导航也回不去（边界实例还在 error 状态），与「导航栏仍可用」自相矛盾。
   */
  const { pathname } = useLocation();

  return (
    <ErrorBoundary key={pathname}>
      <Suspense fallback={<div className="mm-route-loading">加载中…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to={DEFAULT_PATH} replace />} />
          <Route path="/style" element={<StylePage />} />
          <Route path="/template" element={<TemplatePage />} />
          <Route path="/common" element={<CommonPage />} />
          <Route path="/action" element={<ActionPage />} />
          <Route path="/rename" element={<RenamePage />} />
          <Route path="/dlss" element={<DlssPage />} />
          <Route path="/font" element={<FontPanelPage />} />
          <Route path="/font-manage" element={<FontManagePage />} />
          <Route path="/set" element={<SettingsPage />} />
          <Route path="/debug" element={<HomePage />} />
          <Route path="*" element={<Navigate to={DEFAULT_PATH} replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
