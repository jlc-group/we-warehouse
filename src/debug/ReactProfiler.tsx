import { Profiler, ProfilerOnRenderCallback, type ReactNode } from 'react';

const onRenderCallback: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  // Only log renders that take more than 5ms to identify problematic components
  if (actualDuration > 5) {
    console.log(`🔍 React Profiler: ${id} (${phase}) - ${actualDuration.toFixed(2)}ms`);
  }
};

interface ReactProfilerProps {
  id: string;
  children: ReactNode;
}

export const ReactProfiler = ({ id, children }: ReactProfilerProps) => (
  <Profiler id={id} onRender={onRenderCallback}>
    {children}
  </Profiler>
);