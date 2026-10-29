import React from 'react';
import { cn } from '@/shared/lib/utils';
import { WORK_PAGE_GUTTER_CLASS, WORK_PAGE_STACK_CLASS } from './workPageSpacing';

export type WorkPageWidth = 'hub' | 'form';

const WIDTH_CLASS: Record<WorkPageWidth, string> = {
  hub: 'max-w-6xl',
  form: 'max-w-3xl',
};

export interface WorkPageFrameProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  /** hub: 목록·허브 / form: 단건·좁은 폼 */
  width?: WorkPageWidth;
  as?: 'div' | 'main';
}

/**
 * 업무 화면 공통 가로·세로 프레임.
 * 페이지 거터(좌우·상하)와 섹션 간격·최대 폭을 담당한다.
 * ModuleAppShell / WorkAppShell 본문에는 추가 padding을 두지 않는다.
 */
export const WorkPageFrame: React.FC<WorkPageFrameProps> = ({
  children,
  width = 'hub',
  as: Tag = 'div',
  className,
  ...rest
}) => (
  <Tag
    data-work-page-width={width}
    className={cn(
      'mx-auto w-full',
      WORK_PAGE_GUTTER_CLASS,
      WORK_PAGE_STACK_CLASS,
      WIDTH_CLASS[width],
      className
    )}
    {...rest}
  >
    {children}
  </Tag>
);
