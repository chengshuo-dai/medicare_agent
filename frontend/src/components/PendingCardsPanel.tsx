import { useState, useMemo } from 'react';
import { Box, Typography, Paper, Chip, TextField, Button, Fade, Collapse, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import type { InterviewQuestion } from '../types/agent';
import type { ChatMessageItem } from '../types/agent';

interface Props {
  messages: ChatMessageItem[];
  answeredIds: Set<string>;
  onAnswer: (questionId: string, answer: string) => void;
}

const MAX_VISIBLE = 2;

/** Extract all still-pending interview questions across all agent messages */
function getPendingCards(messages: ChatMessageItem[], answeredIds: Set<string>): InterviewQuestion[] {
  const seen = new Set<string>();
  const pending: InterviewQuestion[] = [];
  // Walk messages in reverse (newest last) to preserve question order
  for (const msg of messages) {
    if (msg.role !== 'agent' || !msg.interviewQuestions?.length) continue;
    for (const q of msg.interviewQuestions) {
      if (!answeredIds.has(q.question_id) && !seen.has(q.question_id)) {
        seen.add(q.question_id);
        pending.push(q);
      }
    }
  }
  return pending;
}

function getPhaseColor(phase?: string): { bg: string; border: string; icon: string } {
  const map: Record<string, { bg: string; border: string; icon: string }> = {
    'Symptom Description': { bg: '#FEF9F2', border: '#A3B899', icon: '🌡️' },
    'Visit History': { bg: '#E8ECF2', border: '#5B8C89', icon: '🏥' },
    'Health Status': { bg: '#F0F7F0', border: '#388E3C', icon: '💚' },
    'Allergy Info': { bg: '#FCE4EC', border: '#F06292', icon: '⚠️' },
    'Lifestyle': { bg: '#F3E5F5', border: '#BA68C8', icon: '🍺' },
    'Work & Life': { bg: '#E0F7FA', border: '#4DD0E1', icon: '💼' },
    'Travel History': { bg: '#E8EAF6', border: '#7986CB', icon: '✈️' },
    'Family Health': { bg: '#FFF8E1', border: '#FFD54F', icon: '👨‍👩‍👧' },
    'Medications': { bg: '#E0F2F1', border: '#4DB6AC', icon: '💊' },
    'General': { bg: '#EFEBE9', border: '#BCAAA4', icon: '📋' },
    'Child Development': { bg: '#FCE4EC', border: '#F48FB1', icon: '👶' },
    'Women\'s Health': { bg: '#FCE4EC', border: '#F48FB1', icon: '👩' },
    'Search Supplement': { bg: '#EDE8F6', border: '#9575CD', icon: '🔍' },
    'Symptom Update': { bg: '#F5F5F5', border: '#BDBDBD', icon: '💬' },
  };
  return map[phase || ''] || { bg: '#F0F3EE', border: '#D9D6CE', icon: '💬' };
}

/** Single card */
function CardItem({
  q,
  onAnswer,
  disabled,
}: {
  q: InterviewQuestion;
  onAnswer: (questionId: string, answer: string) => void;
  disabled: boolean;
}) {
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const colors = getPhaseColor(q.colloquial_phase);

  const submitSingle = (option: string) => {
    if (disabled) return;
    onAnswer(q.question_id, option);
  };

  const toggleMulti = (option: string) => {
    if (disabled) return;
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      next.has(option) ? next.delete(option) : next.add(option);
      return next;
    });
  };

  const submitMulti = () => {
    if (disabled || selectedOptions.size === 0) return;
    onAnswer(q.question_id, Array.from(selectedOptions).join('、'));
  };

  const submitText = () => {
    const trimmed = textAnswer.trim();
    if (!trimmed || disabled) return;
    onAnswer(q.question_id, trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitText();
    }
  };

  return (
    <Fade in timeout={400}>
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          mb: 1,
          borderLeft: `4px solid ${colors.border}`,
          bgcolor: colors.bg,
          borderRadius: 2,
          transition: 'all 0.3s ease',
        }}
      >
        {/* Header */}
        <Box display="flex" alignItems="center" mb={1} gap={0.5}>
          <Typography variant="caption" sx={{ fontSize: '1.1rem' }}>{colors.icon}</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {q.colloquial_phase || q.hint || 'Consultation'}
          </Typography>
        </Box>

        {/* Question */}
        <Typography variant="body2" fontWeight={500} mb={1}>
          {q.question}
        </Typography>

        {/* Choices */}
        {q.type === 'choice' && q.options?.length ? (
          <Box display="flex" flexWrap="wrap" gap={0.8}>
            {q.options.map((opt, i) => (
              <Chip
                key={i}
                label={opt}
                size="small"
                onClick={() => submitSingle(opt)}
                disabled={disabled}
                sx={{
                  cursor: disabled ? 'default' : 'pointer',
                  bgcolor: disabled ? 'action.disabledBackground' : '#fff',
                  border: `1px solid ${colors.border}`,
                  '&:hover': !disabled ? { bgcolor: colors.border, color: '#fff' } : {},
                }}
              />
            ))}
          </Box>
        ) : null}

        {/* Multi-choice */}
        {q.type === 'multi_choice' && q.options?.length ? (
          <Box>
            <Box display="flex" flexWrap="wrap" gap={0.8} mb={1}>
              {q.options.map((opt, i) => (
                <Chip
                  key={i}
                  label={opt}
                  size="small"
                  variant={selectedOptions.has(opt) ? 'filled' : 'outlined'}
                  color={selectedOptions.has(opt) ? 'primary' : 'default'}
                  onClick={() => toggleMulti(opt)}
                  disabled={disabled}
                  sx={{ cursor: disabled ? 'default' : 'pointer' }}
                />
              ))}
            </Box>
            <Button
              size="small"
              variant="contained"
              disabled={disabled || selectedOptions.size === 0}
              onClick={submitMulti}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Confirm Selection ({selectedOptions.size})
            </Button>
          </Box>
        ) : null}

        {/* Text input */}
        {(q.type === 'text' || !q.options?.length) && (
          <Box display="flex" gap={1} alignItems="center">
            <TextField
              size="small"
              fullWidth
              placeholder={q.hint || 'Please enter...'}
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
            />
            {q.allow_skip !== false && (
              <Button
                size="small"
                variant="text"
                disabled={disabled}
                onClick={() => submitSingle('Skip')}
                sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'auto' }}
              >
                Skip
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              disabled={disabled || !textAnswer.trim()}
              onClick={submitText}
              sx={{ textTransform: 'none', borderRadius: 2, whiteSpace: 'nowrap' }}
            >
              Send
</Button>
          </Box>
        )}

        {q.hint && q.type !== 'text' && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {q.hint}
          </Typography>
        )}
      </Paper>
    </Fade>
  );
}

export default function PendingCardsPanel({ messages, answeredIds, onAnswer }: Props) {
  const pending = useMemo(() => getPendingCards(messages, answeredIds), [messages, answeredIds]);
  const [collapsed, setCollapsed] = useState(false);

  if (pending.length === 0) return null;

  const visible = pending.slice(0, MAX_VISIBLE);
  const remaining = pending.length - MAX_VISIBLE;

  return (
    <Box
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: '#FAFAFA',
        px: 1.5,
        pt: collapsed ? 0.5 : 1,
        pb: collapsed ? 0.5 : 1,
        maxHeight: collapsed ? 44 : 420,
        overflowY: 'auto',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={collapsed ? 0 : 0.5}
        sx={{ cursor: 'pointer' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          📋 Pending ({pending.length})
        </Typography>
        <Box display="flex" alignItems="center" gap={0.5}>
          {remaining > 0 && !collapsed && (
            <Typography variant="caption" color="text.secondary">
              {remaining} more
            </Typography>
          )}
          <IconButton size="small" sx={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
            <KeyboardArrowUpIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Cards */}
      <Collapse in={!collapsed}>
        <Box>
          {visible.map((q) => (
            <CardItem key={q.question_id} q={q} onAnswer={onAnswer} disabled={false} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
