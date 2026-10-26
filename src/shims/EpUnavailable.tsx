import React from 'react';

/** 삭제된 화면·capability 대신 쓰는 빈 상태 */
export const EpUnavailable: React.FC<{ title?: string }> = ({
  title = '이 화면은 현재 빌드에서 사용할 수 없습니다.',
}) => (
  <div
    data-testid="module-unavailable"
    style={{ padding: 16, fontSize: 14, color: '#64748b' }}
  >
    {title}
  </div>
);

export default EpUnavailable;
