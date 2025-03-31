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
  onAddOutputTab?: (name: string, content: string, type: string) => void;
  onAddTab: (tab: Tab) => void;
  onUpdateTab: (tab: Tab) => void;
  onDeleteTab: (tabId: string) => void;
  tabs: Tab[];
}

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const CLASSIFICATION_PAUSE_TIME = 1000; // 1 second pause

if (!GEMINI_API_KEY) {
  console.warn('REACT_APP_GEMINI_API_KEY is not set. Content classification will not work.');
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ onTabDrop, onTabContentChange, onAddOutputTab, onAddTab, onUpdateTab, onDeleteTab, tabs }) => {
  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id || '');
  const [newTabName, setNewTabName] = useState('');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);
  const lastChangeTime = useRef<number>(Date.now());
  const classificationTimeout = useRef<NodeJS.Timeout | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const [editorMode, setEditorMode] = useState('javascript');

  const getEditorMode = (tab: Tab) => {
    if (!tab.classification) return 'javascript';
    
    switch (tab.classification.type) {
      case 'dataset':
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
      case 'prompt':
        return 'markdown';
      default:
        return 'javascript';
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
    event.dataTransfer.setData('sourceType', tab.classification?.type || 'dataset');
    event.dataTransfer.setData('sourceConfig', JSON.stringify({
      type: tab.classification?.type || 'dataset',
      format: tab.classification?.format || 'json'
    }));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const getTabType = (tab: Tab) => {
    if (!tab.classification) return 'data-source';
    
    switch (tab.classification.type) {
      case 'dataset':
        return 'data-source';
      case 'prompt':
        return 'prompt-template';
      case 'sheets':
        return 'spreadsheet';
      default:
        return 'data-source';
    }
  };

  // Add event listener for creating output tabs
  React.useEffect(() => {
    console.error('Setting up createOutputTab event listener');
    const handleCreateOutputTab = (event: CustomEvent) => {
      console.error('Received createOutputTab event:', event.detail);
      const { name, content, type } = event.detail;
      if (onAddOutputTab) {
        onAddOutputTab(name, content, type);
      }
    };

    window.addEventListener('createOutputTab', handleCreateOutputTab as EventListener);
    console.error('createOutputTab event listener added');
    
    return () => {
      window.removeEventListener('createOutputTab', handleCreateOutputTab as EventListener);
      console.error('createOutputTab event listener removed');
    };
  }, [onAddOutputTab]);

  // Update active tab when tabs change
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(tab => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

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

  // Create a debounced classification function
  const debouncedClassify = useCallback(
    debounce(async (content: string, tabId: string) => {
      try {
        setIsClassifying(true);
        setClassificationError(null);
        
        const currentTab = tabs.find(tab => tab.id === tabId);
        if (!currentTab) return;

        const classification = await classifyContent(content, getTabType(currentTab));
        
        // Update the tab with the new classification
        const updatedTab: Tab = {
          ...currentTab,
          classification: {
            type: classification.type as 'dataset' | 'prompt' | 'sheets',
            format: classification.format as 'json' | 'csv' | 'yaml' | 'structured',
            confidence: classification.confidence
          }
        };
        
        // Use onUpdateTab for classification updates
        onUpdateTab(updatedTab);

        // Update editor mode based on classification
        if (classification.type === 'prompt') {
          setEditorMode('markdown');
        } else {
          setEditorMode(getEditorMode(updatedTab));
        }
      } catch (error) {
        console.error('Error classifying content:', error);
        setClassificationError(error instanceof Error ? error.message : 'Failed to classify content');
      } finally {
        setIsClassifying(false);
      }
    }, 2000),
    [tabs, onUpdateTab]
  );

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!value || !activeTab) return;
    
    // Get the current tab for classification
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (!currentTab) return;

    // Update the tab's content in the parent component
    onTabContentChange(activeTab, value);

    // Only classify if there's actual content
    if (value.trim()) {
      // Debounce the classification call
      debouncedClassify(value, activeTab);
    }
  }, [activeTab, debouncedClassify, tabs, onTabContentChange]);

  // Clean up the debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedClassify.cancel();
    };
  }, [debouncedClassify]);

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
  "format": "json" | "csv" | "yaml" | "structured",
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

  const deleteTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tab selection when clicking delete
    const remainingTabs = tabs.filter(tab => tab.id !== tabId);
    if (activeTab === tabId) {
      setActiveTab(remainingTabs[0]?.id || '');
    }
    // Call onDeleteTab to remove the tab from the parent's state
    onDeleteTab(tabId);
  };

  const handleFontSizeChange = (delta: number) => {
    setFontSize(prev => Math.max(8, Math.min(24, prev + delta)));
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditorMode(e.target.value);
  };

  const getTabIcon = (tab: Tab) => {
    if (!tab.classification) return '?';
    
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

  const addNewTab = async () => {
    if (!newTabName.trim()) return;

    // Create a new tab with default prompt classification
    const newTab: Tab = {
      id: newTabName.trim(),
      name: newTabName.trim(),
      content: '',  // Start with empty content
      type: 'prompt',
      color: '#4CAF50',
      classification: {
        type: 'prompt',
        format: 'structured',
        confidence: 0.8
      }
    };

    // Add the tab
    onAddTab(newTab);
    setActiveTab(newTab.id);
    setNewTabName('');
  };

  const handleNewTabKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTabName.trim()) {
      addNewTab();
    }
  };

  const handleTabClose = (event: React.MouseEvent, tabId: string) => {
    event.stopPropagation();
    onDeleteTab(tabId);
    if (activeTab === tabId) {
      const remainingTabs = tabs.filter(tab => tab.id !== tabId);
      setActiveTab(remainingTabs[0]?.id || '');
    }
  };

  const startEditing = (tabId: string, tabName: string) => {
    setEditingTabId(tabId);
    setEditingName(tabName);
  };

  const stopEditing = () => {
    setEditingTabId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      stopEditing();
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
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            Classifying content...
          </div>
        )}
        {classificationError && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(255, 0, 0, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
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
            scrollBeyond: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}; 