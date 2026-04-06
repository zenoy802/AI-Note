import React, { useState } from 'react';
import { Box, IconButton, Tooltip, Zoom } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useCopy } from '../hooks/useCopy';

interface CodeBlockProps {
  code: string;
  language: string;
  mode?: 'light' | 'dark';
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, mode = 'dark' }) => {
  const { copied, copy } = useCopy();
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = () => {
    copy(code);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        my: 1,
        '&:hover': {
          '& .copy-button': {
            opacity: 1,
          },
        },
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box
        className="copy-button"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
          zIndex: 1,
        }}
      >
        <Tooltip
          title={copied ? '已复制!' : '复制代码'}
          placement="left"
          TransitionComponent={Zoom}
        >
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
      <SyntaxHighlighter
        style={mode === 'dark' ? oneDark : oneLight}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '16px',
          paddingTop: '40px',
          borderRadius: '12px',
          fontSize: '14px',
          lineHeight: '1.6',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </Box>
  );
};

export default CodeBlock;
