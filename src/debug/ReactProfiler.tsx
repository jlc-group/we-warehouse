import { Profiler, ProfilerOnRenderCallback } from 'react';

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

export const ReactProfiler: React.FC<ReactProfilerProps> = ({ id, children }) => (
  <Profiler id={id} onRender={onRenderCallback}>
    {children}
  </Profiler>
);