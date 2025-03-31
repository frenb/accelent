import React, { useState, useCallback, useRef, useEffect } from 'react';
import debounce from 'lodash/debounce';
import Editor from '@monaco-editor/react';

interface Tab {
  id: string;
  name: string;
  content: string;
  type: 'data' | 'prompt' | 'sheets';
  color: string;
  classification: {
    type: 'dataset' | 'prompt' | 'sheets';
    format?: 'json' | 'csv' | 'yaml' | 'structured';
    confidence: number;
  };
}

interface EditorPanelProps {
  onTabDrop: (tabId: string, nodeId: string | null, tabName: string, content: string, dropPosition?: { x: number, y: number }) => void;
  onTabContentChange: (tabId: string, content: string) => void;
  onAddOutputTab?: (name: string, content: string) => void;
}

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const CLASSIFICATION_PAUSE_TIME = 1000; // 1 second pause

if (!GEMINI_API_KEY) {
  console.warn('REACT_APP_GEMINI_API_KEY is not set. Content classification will not work.');
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ onTabDrop, onTabContentChange, onAddOutputTab }) => {
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'Dataset 1',
      name: 'Dataset 1',
      content: `{
  "tactics": [
    {
      "id": "TA0001",
      "name": "Initial Access",
      "description": "Techniques used to gain initial access to a network"
    },
    {
      "id": "TA0002",
      "name": "Execution",
      "description": "Techniques that result in execution of adversary-controlled code"
    }
  ]
}`,
      type: 'data',
      color: '#4CAF50',
      classification: {
        type: 'dataset',
        format: 'json',
        confidence: 0.8
      }
    },
    {
      id: 'Prompt 1',
      name: 'Prompt 1',
      content: `Create a list of top 10 MITRE tactics, format as JSON with the following structure:
{
  "tactics": [
    {
      "id": "TA0001",
      "name": "Tactic Name",
      "description": "Tactic Description"
    }
  ]
}`,
      type: 'prompt',
      color: '#4a90e2',
      classification: {
        type: 'prompt',
        confidence: 0.8
      }
    },
    {
      id: 'Dataset 2',
      name: 'Dataset 2',
      content: `id,name,description
TA0001,Initial Access,Techniques used to gain initial access to a network
TA0002,Execution,Techniques that result in execution of adversary-controlled code`,
      type: 'data',
      color: '#4CAF50',
      classification: {
        type: 'dataset',
        format: 'csv',
        confidence: 0.8
      }
    },
    {
      id: 'Dataset 3',
      name: 'Dataset 3',
      content: `tactics:
  - id: TA0001
    name: Initial Access
    description: Techniques used to gain initial access to a network
  - id: TA0002
    name: Execution
    description: Techniques that result in execution of adversary-controlled code`,
      type: 'data',
      color: '#4CAF50',
      classification: {
        type: 'dataset',
        format: 'yaml',
        confidence: 0.8
      }
    }
  ]);
  const [activeTab, setActiveTab] = useState<string>('Dataset 1');
  const [newTabName, setNewTabName] = useState('');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);
  const lastChangeTime = useRef<number>(Date.now());
  const classificationTimeout = useRef<NodeJS.Timeout | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const [editorMode, setEditorMode] = useState('javascript');

  // Add event listener for creating output tabs
  React.useEffect(() => {
    console.error('Setting up createOutputTab event listener');
    const handleCreateOutputTab = (event: CustomEvent) => {
      console.error('Received createOutputTab event:', event.detail);
      const { name, content, type, color } = event.detail;
      const newTab: Tab = {
        id: `output-${Date.now()}`,
        name,
        content,
        type: type || 'display',
        color: color || '#9C27B0',
        classification: {
          type: 'dataset',
          format: 'json',
          confidence: 0.8
        }
      };
      console.error('Creating new tab:', newTab);
      setTabs(prevTabs => [...prevTabs, newTab]);
      setActiveTab(newTab.id);
    };

    window.addEventListener('createOutputTab', handleCreateOutputTab as EventListener);
    console.error('createOutputTab event listener added');
    
    return () => {
      window.removeEventListener('createOutputTab', handleCreateOutputTab as EventListener);
      console.error('createOutputTab event listener removed');
    };
  }, []);

  const classifyContent = async (content: string, type: string) => {
    if (!GEMINI_API_KEY) {
      console.log('No Gemini API key found, using default classification');
      return {
        type: 'dataset',
        format: 'json',
        confidence: 0.8
      };
    }

    try {
      const prompt = `Analyze this ${type} content and classify it. Return ONLY a JSON object with these exact fields:
{
  "type": "dataset" | "prompt" | "sheets" | "display",
  "format": "json" | "text" | "markdown",
  "confidence": number between 0 and 1
}

Content to analyze:
${content}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const text = result.candidates[0].content.parts[0].text;
      
      // Clean up the response text to ensure it's valid JSON
      const cleanedText = text.trim()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      try {
        const classification = JSON.parse(cleanedText);
        
        // Validate the classification object
        if (!classification.type || !classification.format || typeof classification.confidence !== 'number') {
          throw new Error('Invalid classification format');
        }
        
        return classification;
      } catch (parseError) {
        console.error('Error parsing classification result:', parseError);
        console.log('Raw response:', text);
        return {
          type: 'dataset',
          format: 'json',
          confidence: 0.8
        };
      }
    } catch (error) {
      console.error('Error classifying content:', error);
      return {
        type: 'dataset',
        format: 'json',
        confidence: 0.8
      };
    }
  };

  const debouncedClassify = useCallback(
    debounce(async (content: string, tabId: string) => {
      if (!content.trim()) return;
      
      setIsClassifying(true);
      const classification = await classifyContent(content, getTabType(tabs.find(tab => tab.id === tabId)!));
      setIsClassifying(false);
      
      // Only update the classification, not the content
      setTabs(tabs => tabs.map(tab => 
        tab.id === tabId 
          ? { ...tab, classification }
          : tab
      ));
    }, CLASSIFICATION_PAUSE_TIME),
    []
  );

  const getTabType = (tab: Tab) => {
    switch (tab.classification.type) {
      case 'dataset':
        return 'data-source';
      case 'prompt':
        return 'prompt-template';
      case 'sheets':
        return 'spreadsheet';
      default:
        return 'display';
    }
  };

  const handleDragStart = (event: React.DragEvent, tab: Tab) => {
    const nodeType = getTabType(tab);
    event.dataTransfer.setData('text/plain', tab.id);
    event.dataTransfer.setData('nodeId', nodeType);
    event.dataTransfer.setData('tabName', tab.name);
    event.dataTransfer.setData('tabContent', tab.content);
    event.dataTransfer.setData('tabId', tab.id);
    event.dataTransfer.setData('tabType', nodeType);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const tabId = e.dataTransfer.getData('text/plain');
    const nodeId = e.dataTransfer.getData('nodeId');
    const tabName = e.dataTransfer.getData('tabName');
    const tabContent = e.dataTransfer.getData('tabContent');
    
    if (tabId && tabName && tabContent) {
      onTabDrop(tabId, nodeId || null, tabName, tabContent, {
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const startEditing = (tabId: string, currentName: string) => {
    setEditingTabId(tabId);
    setEditingName(currentName);
  };

  const stopEditing = () => {
    if (editingTabId && editingName.trim()) {
      setTabs(tabs.map(tab => 
        tab.id === editingTabId 
          ? { ...tab, id: editingName.trim(), name: editingName.trim() }
          : tab
      ));
    }
    setEditingTabId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      stopEditing();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditingName('');
    }
  };

  const addNewTab = () => {
    if (!newTabName.trim()) return;

    const newTab: Tab = {
      id: newTabName.trim(),
      name: newTabName.trim(),
      content: '',
      type: 'data',
      color: '#4CAF50',
      classification: {
        type: 'dataset',
        format: 'json',
        confidence: 0.8
      }
    };

    setTabs([...tabs, newTab]);
    setActiveTab(newTab.id);
    setNewTabName('');
  };

  const handleNewTabKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTabName.trim()) {
      addNewTab();
    }
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!value) return;
    
    const now = Date.now();
    const timeSinceLastChange = now - lastChangeTime.current;
    lastChangeTime.current = now;

    // Update the content immediately
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTab 
          ? { ...tab, content: value }
          : tab
      )
    );

    // Notify parent about content change
    onTabContentChange(activeTab, value);

    // Clear any existing timeout
    if (classificationTimeout.current) {
      clearTimeout(classificationTimeout.current);
    }

    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (!currentTab) return;

    // If enough time has passed since the last change, classify immediately
    if (timeSinceLastChange >= CLASSIFICATION_PAUSE_TIME) {
      classifyContent(value, getTabType(currentTab)).then(classification => {
        setTabs(prevTabs => 
          prevTabs.map(tab => 
            tab.id === activeTab 
              ? { ...tab, classification }
              : tab
          )
        );
      });
    } else {
      // Otherwise, set a timeout to classify after the pause
      classificationTimeout.current = setTimeout(() => {
        classifyContent(value, getTabType(currentTab)).then(classification => {
          setTabs(prevTabs => 
            prevTabs.map(tab => 
              tab.id === activeTab 
                ? { ...tab, classification }
                : tab
            )
          );
        });
      }, CLASSIFICATION_PAUSE_TIME);
    }
  }, [activeTab, onTabContentChange, tabs]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (classificationTimeout.current) {
        clearTimeout(classificationTimeout.current);
      }
    };
  }, []);

  const getEditorMode = (tab: Tab) => {
    if (tab.classification?.type === 'dataset') {
      switch (tab.classification.format) {
        case 'json':
          return 'json';
        case 'csv':
          return 'csv';
        case 'yaml':
          return 'yaml';
        default:
          return 'javascript';
      }
    }
    return 'markdown'; // Default to markdown for prompts
  };

  // Update editor mode when active tab changes
  useEffect(() => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (currentTab) {
      setEditorMode(getEditorMode(currentTab));
    }
  }, [activeTab, tabs]);

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content || '';
  const activeTabClassification = tabs.find(tab => tab.id === activeTab)?.classification;
  const activeTabMode = activeTabClassification ? getEditorMode(tabs.find(tab => tab.id === activeTab)!) : 'javascript';

  const deleteTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tab selection when clicking delete
    setTabs(tabs => tabs.filter(tab => tab.id !== tabId));
    if (activeTab === tabId) {
      const remainingTabs = tabs.filter(tab => tab.id !== tabId);
      setActiveTab(remainingTabs[0]?.id || '');
    }
  };

  const handleFontSizeChange = (delta: number) => {
    setFontSize(prev => Math.max(8, Math.min(24, prev + delta)));
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditorMode(e.target.value);
  };

  const createNewTab = () => {
    const newTab: Tab = {
      id: `tab-${Date.now()}`,
      name: newTabName || 'New Tab',
      content: '',
      type: 'prompt',
      color: '#4a90e2',
      classification: {
        type: 'prompt',
        confidence: 0.8
      }
    };
    setTabs((prevTabs) => [...prevTabs, newTab]);
    setActiveTab(newTab.id);
    setNewTabName('');
  };

  const handleTabDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const tabId = event.dataTransfer.getData('text/plain');
    const tab = tabs.find(t => t.id === tabId);
    
    if (tab) {
      const rect = event.currentTarget.getBoundingClientRect();
      const dropPosition = event.clientX - rect.left;
      const newIndex = Math.floor((dropPosition / rect.width) * tabs.length);
      
      setTabs((prevTabs) => {
        const newTabs = [...prevTabs];
        const tabIndex = newTabs.findIndex(t => t.id === tabId);
        newTabs.splice(tabIndex, 1);
        newTabs.splice(newIndex, 0, {
          ...tab,
          classification: {
            type: tab.classification.type,
            format: tab.classification.format,
            confidence: tab.classification.confidence
          }
        });
        return newTabs;
      });
    }
  };

  const handleTabDragStart = (event: React.DragEvent<HTMLDivElement>, tabId: string) => {
    event.dataTransfer.setData('text/plain', tabId);
  };

  const handleTabDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleTabClose = (event: React.MouseEvent, tabId: string) => {
    event.stopPropagation();
    setTabs((prevTabs) => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      if (activeTab === tabId && newTabs.length > 0) {
        setActiveTab(newTabs[0].id);
      }
      return newTabs;
    });
  };

  const getTabIcon = (tab: Tab) => {
    switch (tab.classification.type) {
      case 'dataset':
        return tab.classification.format?.toUpperCase() || 'DS';
      case 'prompt':
        return 'PT';
      case 'sheets':
        return 'SS';
      default:
        return '?';
    }
  };

  return (
    <div 
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%'
      }}
      onDragOver={handleDragOver}
      onDrop={onDrop}
    >
      <div style={{ 
        padding: '10px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, tab)}
            onClick={() => setActiveTab(tab.id)}
            onDoubleClick={() => startEditing(tab.id, tab.name)}
            data-tab-id={tab.id}
            data-tab-type={getTabType(tab)}
            data-tab-name={tab.name}
            style={{
              padding: '8px 16px',
              background: activeTab === tab.id ? tab.color : '#f5f5f5',
              color: activeTab === tab.id ? 'white' : '#333',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              userSelect: 'none',
              position: 'relative',
              paddingRight: '24px',
              minWidth: '100px'
            }}
          >
            <span style={{ 
              width: '20px', 
              height: '20px', 
              background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>
              {getTabIcon(tab)}
            </span>
            {editingTabId === tab.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={stopEditing}
                onKeyDown={handleKeyDown}
                autoFocus
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid currentColor',
                  color: 'inherit',
                  fontSize: 'inherit',
                  padding: '0 4px',
                  width: '120px',
                  outline: 'none'
                }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span>{tab.name}</span>
                {tab.classification && (
                  <span style={{ 
                    fontSize: '10px', 
                    opacity: 0.7,
                    marginTop: '-2px'
                  }}>
                    {tab.classification.type === 'dataset' && tab.classification.format
                      ? `${tab.classification.format.toUpperCase()} Dataset`
                      : 'Prompt'}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={(e) => deleteTab(tab.id, e)}
              style={{
                position: 'absolute',
                right: '4px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: activeTab === tab.id ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                borderRadius: '50%',
                transition: 'all 0.2s ease',
                opacity: 0,
                zIndex: 1,
                pointerEvents: 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.background = activeTab === tab.id 
                  ? 'rgba(255,255,255,0.2)' 
                  : 'rgba(0,0,0,0.1)';
                e.currentTarget.style.color = activeTab === tab.id 
                  ? 'white' 
                  : 'black';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = activeTab === tab.id 
                  ? 'rgba(255,255,255,0.7)' 
                  : 'rgba(0,0,0,0.3)';
              }}
            >
              ×
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            onKeyDown={handleNewTabKeyDown}
            placeholder="New tab name"
            style={{
              padding: '8px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          <button
            onClick={addNewTab}
            style={{
              padding: '8px 16px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Add Tab
          </button>
        </div>
      </div>
      <div style={{ 
        flex: 1, 
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '8px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: '#f5f5f5'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: '#666' }}>Font Size:</label>
            <button
              onClick={() => handleFontSizeChange(-1)}
              style={{
                padding: '4px 8px',
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              -
            </button>
            <span style={{ minWidth: '30px', textAlign: 'center' }}>{fontSize}</span>
            <button
              onClick={() => handleFontSizeChange(1)}
              style={{
                padding: '4px 8px',
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              +
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: '#666' }}>Language:</label>
            <select
              value={editorMode}
              onChange={handleModeChange}
              style={{
                padding: '4px 8px',
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="javascript">JavaScript</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="yaml">YAML</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>
        </div>
        {isClassifying && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#f0f0f0',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666',
            fontFamily: '"Open Sans", sans-serif'
          }}>
            Classifying content...
          </div>
        )}
        {classificationError && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#ffebee',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#c62828',
            maxWidth: '300px',
            whiteSpace: 'pre-wrap',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontFamily: '"Open Sans", sans-serif'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Classification Error:</div>
            {classificationError}
          </div>
        )}
        <Editor
          height="100%"
          defaultLanguage="javascript"
          language={editorMode}
          theme="vs-dark"
          value={activeTabContent}
          onChange={handleEditorChange}
          options={{
            fontSize,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            tabSize: 2,
            insertSpaces: true,
            renderWhitespace: 'selection',
            fontFamily: '"Open Sans", monospace',
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            parameterHints: { enabled: true },
            // Add these options to improve stability
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible'
            }
          }}
        />
      </div>
    </div>
  );
}; 