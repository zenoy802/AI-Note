import React from 'react';
import { Card, CardContent, Typography, Box, Chip, alpha } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { colors } from '../theme';

interface ModelCardProps {
  name: string;
  displayName: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}

const getModelColor = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('qwen')) return colors.models.qwen;
  if (lowerName.includes('kimi')) return colors.models.kimi;
  if (lowerName.includes('deepseek')) return colors.models.deepseek;
  if (lowerName.includes('gpt') || lowerName.includes('claude')) return colors.models.gpt;
  return colors.primary.main;
};

const getModelDescription = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('qwen')) return '阿里云通义千问大模型';
  if (lowerName.includes('kimi')) return 'Moonshot AI 助手';
  if (lowerName.includes('deepseek')) return '深度求索 reasoning 模型';
  return 'AI 助手';
};

export const ModelCard: React.FC<ModelCardProps> = ({
  name,
  displayName,
  description,
  selected,
  onClick,
}) => {
  const modelColor = getModelColor(name);
  const modelDescription = description || getModelDescription(name);

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        border: '2px solid',
        borderColor: selected ? modelColor : 'transparent',
        bgcolor: selected ? alpha(modelColor, 0.08) : 'background.paper',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) => theme.shadows[4],
          borderColor: alpha(modelColor, 0.5),
        },
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {selected && (
        <Chip
          label="已选择"
          size="small"
          sx={{
            position: 'absolute',
            top: -10,
            right: 12,
            bgcolor: modelColor,
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
      )}
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(modelColor, 0.15),
              color: modelColor,
            }}
          >
            <SmartToyIcon />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {modelDescription}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ModelCard;
