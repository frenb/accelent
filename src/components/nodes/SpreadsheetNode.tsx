import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

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
};

export const SpreadsheetNode: React.FC<SpreadsheetNodeProps> = ({ data, id, onRemove }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  // Parse input data and update grid
  useEffect(() => {
    const processInput = async () => {
      if (data.input && !data.output) {
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

  return (
    <div style={styles.container}>
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
      )}
      <Handle type="source" position={Position.Bottom} style={styles.handle} />
    </div>
  );
}; 