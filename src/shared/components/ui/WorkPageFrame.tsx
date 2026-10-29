import React from 'react';
import { cn } from '@/shared/lib/utils';

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
 * ModuleAppShell main의 p-5 거터를 존중하며, 폭·섹션 간격만 담당한다.
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
    className={cn('mx-auto w-full space-y-6 pb-6', WIDTH_CLASS[width], className)}
    {...rest}
  >
    {children}
  </Tag>
);
