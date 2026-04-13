import React from 'react';
import { Box, Paper, Typography, Avatar, alpha, useTheme } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from './CodeBlock';
import { colors } from '../theme';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

const getModelColor = (model?: string): string => {
  if (!model) return colors.primary.main;
  const lowerName = model.toLowerCase();
  if (lowerName.includes('gemini')) return colors.models.gemini;
  if (lowerName.includes('claude')) return colors.models.claude;
  if (lowerName.includes('gpt')) return colors.models.gpt;
  if (lowerName.includes('qwen')) return colors.models.qwen;
  if (lowerName.includes('kimi')) return colors.models.kimi;
  if (lowerName.includes('deepseek')) return colors.models.deepseek;
  return colors.primary.main;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, model }) => {
  const theme = useTheme();
  const isUser = role === 'user';
  const modelColor = getModelColor(model);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 1.5,
        mb: 2,
        alignItems: 'flex-start',
      }}
    >
      <Avatar
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          bgcolor: isUser ? colors.primary.main : alpha(modelColor, 0.15),
          color: isUser ? '#fff' : modelColor,
        }}
      >
        {isUser ? <PersonIcon /> : <SmartToyIcon />}
      </Avatar>

      <Box sx={{ maxWidth: 'calc(100% - 60px)', flex: 1 }}>
        {!isUser && model && (
          <Typography
            variant="caption"
            sx={{
              ml: 1,
              mb: 0.5,
              display: 'block',
              color: modelColor,
              fontWeight: 600,
            }}
          >
            {model}
          </Typography>
        )}

        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: isUser
              ? alpha(colors.primary.main, 0.1)
              : theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.6)
              : theme.palette.background.paper,
            color: 'text.primary',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            border: '1px solid',
            borderColor: isUser
              ? alpha(colors.primary.main, 0.2)
              : theme.palette.divider,
          }}
        >
          <ReactMarkdown
            components={{
              code({ inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const code = String(children).replace(/\n$/, '');

                if (!inline && match) {
                  return (
                    <CodeBlock
                      code={code}
                      language={match[1]}
                      mode={theme.palette.mode}
                    />
                  );
                }

                return (
                  <code
                    className={className}
                    {...props}
                    style={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.875em',
                      fontFamily: 'monospace',
                    }}
                  >
                    {children}
                  </code>
                );
              },
              p: ({ children }) => (
                <Typography variant="body1" sx={{ mb: 1, lineHeight: 1.7 }}>
                  {children}
                </Typography>
              ),
              h1: ({ children }) => (
                <Typography variant="h5" fontWeight={600} sx={{ mt: 2, mb: 1 }}>
                  {children}
                </Typography>
              ),
              h2: ({ children }) => (
                <Typography variant="h6" fontWeight={600} sx={{ mt: 2, mb: 1 }}>
                  {children}
                </Typography>
              ),
              h3: ({ children }) => (
                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1.5, mb: 0.5 }}>
                  {children}
                </Typography>
              ),
              ul: ({ children }) => (
                <Box component="ul" sx={{ pl: 2, mb: 1 }}>
                  {children}
                </Box>
              ),
              ol: ({ children }) => (
                <Box component="ol" sx={{ pl: 2, mb: 1 }}>
                  {children}
                </Box>
              ),
              li: ({ children }) => (
                <Box component="li" sx={{ mb: 0.5 }}>
                  {children}
                </Box>
              ),
              blockquote: ({ children }) => (
                <Box
                  component="blockquote"
                  sx={{
                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                    pl: 2,
                    py: 0.5,
                    my: 1,
                    color: 'text.secondary',
                    fontStyle: 'italic',
                  }}
                >
                  {children}
                </Box>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </Paper>
      </Box>
    </Box>
  );
};

export default MessageBubble;
