import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, IconButton, Typography, Paper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import TableChartIcon from '@mui/icons-material/TableChart';
import InputIcon from '@mui/icons-material/Input';

interface SpreadsheetNodeProps {
  data: {
    label: string;
    input?: string;
    output?: string;
    tabId?: string;
    sourceType?: string;
    sourceConfig?: any;
  };
  id: string;
  onRemove: (nodeId: string) => void;
  onTabAdd?: (name: string, content: string, type: string) => void;
}

const styles = {
  container: {
    width: 400,
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '12px',
    position: 'relative' as const,
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    padding: '4px 8px',
    background: '#f5f5f5',
    borderRadius: '4px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#333',
    margin: 0,
  },
  deleteButton: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    opacity: 0,
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 1,
    },
  },
  handle: {
    width: '8px',
    height: '8px',
    background: '#555',
    borderRadius: '50%',
  },
  grid: {
    flex: 1,
    width: '100%',
    minHeight: '200px',
    '& .MuiDataGrid-root': {
      border: 'none',
      '& .MuiDataGrid-cell': {
        borderBottom: '1px solid #eee',
      },
      '& .MuiDataGrid-columnHeaders': {
        background: '#f5f5f5',
        borderBottom: '1px solid #ddd',
      },
    },
  },
  executing: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#666',
    padding: '8px',
  },
  spinner: {
    width: '12px',
    height: '12px',
    border: '2px solid #f0f0f0',
    borderTop: '2px solid #2196F3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  preview: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '20px',
    cursor: 'pointer',
    '&:hover': {
      background: '#f5f5f5',
    },
  },
  previewIcon: {
    fontSize: '48px',
    color: '#666',
    marginBottom: '8px',
  },
  previewText: {
    color: '#666',
    textAlign: 'center' as const,
  },
  inputPreview: {
    marginBottom: '12px',
    padding: '8px',
    background: '#f8f9fa',
    borderRadius: '4px',
    border: '1px solid #e9ecef',
  },
  inputHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    color: '#666',
  },
  inputContent: {
    fontSize: '12px',
    color: '#666',
    whiteSpace: 'pre-wrap',
    maxHeight: '100px',
    overflow: 'auto',
    fontFamily: 'monospace',
  },
};

export const SpreadsheetNode: React.FC<SpreadsheetNodeProps> = ({ data, id, onRemove, onTabAdd }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPreview, setIsPreview] = useState(true);
  const { getEdges, getNode, setNodes, getNodes } = useReactFlow();

  // Function to update input data from connected nodes
  const updateInputData = useCallback(() => {
    const edges = getEdges();
    const inputEdge = edges.find(edge => edge.target === id);
    if (inputEdge) {
      const sourceNode = getNode(inputEdge.source);
      if (sourceNode) {
        // Update this node's input data with the source node's output
        const nodes = getNodes();
        const updatedNodes = nodes.map(node => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                input: sourceNode.data.output || ''
              }
            };
          }
          return node;
        });
        setNodes(updatedNodes);
      }
    } else {
      // If no input connection, clear the input data
      const nodes = getNodes();
      const updatedNodes = nodes.map(node => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              input: ''
            }
          };
        }
        return node;
      });
      setNodes(updatedNodes);
    }
  }, [getEdges, getNode, getNodes, setNodes, id]);

  // Update input data when edges change or when source node output changes
  useEffect(() => {
    updateInputData();
  }, [getEdges(), getNode, updateInputData]);

  // Parse input data and update grid
  useEffect(() => {
    const processInput = async () => {
      if (data.input) {
        console.error('Processing input data:', data.input);
        setIsExecuting(true);
        try {
          const parsedData = JSON.parse(data.input);
          if (Array.isArray(parsedData)) {
            // Generate columns from the first row
            const firstRow = parsedData[0];
            const newColumns = Object.keys(firstRow).map(key => ({
              field: key,
              headerName: key,
              width: 150,
            }));
            setColumns(newColumns);

            // Add id field to each row for DataGrid
            const newRows = parsedData.map((row, index) => ({
              id: index,
              ...row,
            }));
            setRows(newRows);

            // Update the node's output through a custom event
            const event = new CustomEvent('updateNodeOutput', {
              detail: {
                nodeId: id,
                output: data.input // Pass through the input as output
              }
            });
            window.dispatchEvent(event);
          }
        } catch (error) {
          console.error('Error parsing input data:', error);
          const event = new CustomEvent('updateNodeOutput', {
            detail: {
              nodeId: id,
              output: `Error: ${error instanceof Error ? error.message : 'Failed to parse input data'}`
            }
          });
          window.dispatchEvent(event);
        } finally {
          setIsExecuting(false);
        }
      }
    };

    processInput();
  }, [data.input, id]);

  const handleDelete = useCallback(() => {
    onRemove(id);
  }, [id, onRemove]);

  const handleDoubleClick = useCallback(() => {
    if (onTabAdd && data.input) {
      onTabAdd(data.label, data.input, 'sheets');
    }
  }, [onTabAdd, data.label, data.input]);

  return (
    <div 
      style={styles.container}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} style={styles.handle} />
      <div style={styles.header}>
        <Typography style={styles.title}>{data.label}</Typography>
        <IconButton
          size="small"
          onClick={handleDelete}
          style={styles.deleteButton}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </div>
      {isExecuting ? (
        <div style={styles.executing}>
          <div style={styles.spinner} />
          Processing data...
        </div>
      ) : (
        <>
          {data.input && (
            <div style={styles.inputPreview}>
              <div style={styles.inputHeader}>
                <InputIcon fontSize="small" />
                <Typography variant="caption">Input Data</Typography>
              </div>
              <div style={styles.inputContent}>
                {data.input}
              </div>
            </div>
          )}
          {rows.length > 0 ? (
            <Box style={styles.grid}>
              <DataGrid
                rows={rows}
                columns={columns}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 5,
                    }
                  }
                }}
                pageSizeOptions={[5]}
                disableRowSelectionOnClick
                autoHeight
                hideFooter={rows.length <= 5}
              />
            </Box>
          ) : (
            <div style={styles.preview}>
              <TableChartIcon style={styles.previewIcon} />
              <Typography style={styles.previewText}>
                {data.input ? 'Invalid input data format' : 'No input data connected'}
              </Typography>
            </div>
          )}
        </>
      )}
      <Handle type="source" position={Position.Bottom} style={styles.handle} />
    </div>
  );
}; 