import React from 'react';
import { PipelineEditor } from './PipelineEditor.tsx';
import { Pipeline } from './types/Pipeline';

const initialPipeline: Pipeline = {
  id: '1',
  name: 'My Pipeline',
  nodes: [],
  connections: []
};

const App: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <PipelineEditor 
        pipeline={initialPipeline}
        onChange={(pipeline) => console.log('Pipeline changed:', pipeline)}
      />
    </div>
  );
};

export default App; 