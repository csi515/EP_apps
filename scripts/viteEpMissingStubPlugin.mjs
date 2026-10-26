/**
 * 삭제된 capability/page 모듈을 빈 스텁으로 연결한다.
 * EP_apps 포크에서 Moa 전용 화면이 없어도 Vite 빌드가 끝나게 한다.
 */
import fs from 'node:fs';
import path from 'node:path';

const VIRTUAL_PREFIX = '\0ep-missing:';

function tryFsResolve(candidate) {
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx', '/index.js'];
  for (const ext of extensions) {
    const full = candidate + ext;
    try {
      if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function epMissingModuleStubPlugin(rootDir) {
  const srcRoot = path.resolve(rootDir, 'src');

  const underSrc = (filePath) => {
    const normalized = path.resolve(filePath).toLowerCase();
    const root = srcRoot.toLowerCase();
    return normalized === root || normalized.startsWith(root + path.sep);
  };

  return {
    name: 'ep-missing-module-stub',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (source.startsWith('\0') || source.startsWith('virtual:')) return null;
      if (source.includes('node_modules') || (importer && importer.includes('node_modules'))) {
        return null;
      }

      let absolute = null;
      if (source.startsWith('@/')) {
        absolute = path.resolve(srcRoot, source.slice(2));
      } else if (source.startsWith('.') && importer && underSrc(importer)) {
        absolute = path.resolve(path.dirname(importer), source);
      } else if (path.isAbsolute(source) && underSrc(source)) {
        absolute = source;
      } else {
        return null;
      }

      if (tryFsResolve(absolute)) return null;

      return {
        id: VIRTUAL_PREFIX + absolute.replace(/\\/g, '/'),
        syntheticNamedExports: true,
      };
    },
    load(id) {
      const cleanId = id.split('?')[0];
      let label = cleanId;
      if (cleanId.startsWith(VIRTUAL_PREFIX)) {
        label = cleanId.slice(VIRTUAL_PREFIX.length);
      } else if (underSrc(cleanId) && !tryFsResolve(cleanId)) {
        label = cleanId.replace(/\\/g, '/');
      } else {
        return null;
      }

      return `
import { createElement } from 'react';

function EpUnavailable(_props) {
  return createElement(
    'div',
    {
      'data-testid': 'module-unavailable',
      'data-module': ${JSON.stringify(label)},
      style: { padding: '16px', fontSize: '14px', color: '#64748b' },
    },
    '이 화면은 현재 빌드에서 사용할 수 없습니다.'
  );
}
EpUnavailable.displayName = 'EpUnavailable';

const stub = new Proxy(EpUnavailable, {
  get(target, prop, receiver) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return EpUnavailable;
    if (prop === 'then') return undefined;
    if (prop in target) return Reflect.get(target, prop, receiver);
    return EpUnavailable;
  },
  apply(_target, _thisArg, args) {
    return EpUnavailable(...args);
  },
});

export default stub;
`;
    },
  };
}
