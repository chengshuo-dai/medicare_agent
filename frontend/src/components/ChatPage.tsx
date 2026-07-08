import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Fab,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import type { ChatMessageItem, ChatSession, GuestStatus, SSEEvent, DiagnosisReport, WorkflowStep, LabReportResult } from '../types/agent';
import { agentApi } from '../api/agent';
import { uploadDocument, getParseResult } from '../api/documents';
import { getToken } from '../api/client';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import GuestBanner from './GuestBanner';
import PendingCardsPanel from './PendingCardsPanel';
import FullScreenReport from './FullScreenReport';
import UploadStatusBanner from './UploadStatusBanner';

interface UploadItem {
  fileId: string;
  fileName: string;
  status: 'parsing' | 'completed' | 'failed';
}

const QUICK_REPLIES = [
  'Headache and fever',
  'Stomach pain and diarrhea',
  'Coughing for a week',
  'Recent health checkup analysis',
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const sagePrimary = '#7D9B76';
const sagePrimaryDark = '#5C7A55';
const sageText = '#2C3E2D';
const sageBorder = '#D9D6CE';

export default function ChatPage() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [guestStatus, setGuestStatus] = useState<GuestStatus | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [reportData, setReportData] = useState<DiagnosisReport | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isDiagnosed, setIsDiagnosed] = useState(false);
  type ChatMode = 'idle' | 'consulting' | 'diagnosed';
  const [chatMode, setChatMode] = useState<ChatMode>('idle');
  const backendSessionIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);
  const pendingSessionRef = useRef<{ sessionId: string; questionId: string } | null>(null);
  const [activeUploads, setActiveUploads] = useState<UploadItem[]>([]);
  const uploadBannerDismissed = useRef(false);
  const failedFileAttempts = useRef<Map<string, number>>(new Map());

  // Initialize: unified auth entry point — decide token strategy on page load
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const initAuth = async () => {
      const token = getToken();
      if (token) {
        // Has access_token — validate it against /auth/me
        try {
          const res = await fetch('/api/v1/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            return; // Token valid — registered user, nothing to do
          }
        } catch {
          // Network error — keep access_token and hope it still works
          return;
        }
        // Token invalid/expired — clear and fall through to guest mode
        localStorage.removeItem('access_token');
      }

      // Guest mode — verify stored guest token or create new one
      const stored = agentApi.getGuestStatus();
      if (stored) {
        try {
          const status = await agentApi.fetchGuestStatus();
          if (status) {
            setGuestStatus(status);
            return;
          }
        } catch {
          // Token invalid — will create new one below
        }
      }
      agentApi.clearGuestToken();
      try {
        await agentApi.createGuestSession();
        setGuestStatus(agentApi.getGuestStatus());
      } catch (e) {
        console.error('Failed to create guest session:', e);
      }
    };

    initAuth();
  }, []);

  // Scroll to bottom — only when new messages are added and user is near bottom
  const prevMsgLen = useRef(messages.length);
  useEffect(() => {
    const hasActiveQuestions = messages.some(m => m.role === 'agent' && (m.interviewQuestions?.length));
    if (!hasActiveQuestions && messages.length > prevMsgLen.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgLen.current = messages.length;
  }, [messages]);

  // Scroll listener
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollDown(!nearBottom);
  }, []);

  // Create new session
  const startNewSession = useCallback(() => {
    const id = generateId();
    const newSession: ChatSession = {
      id,
      title: 'New Chat',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(id);
    setChatMode('idle');
    setIsDiagnosed(false);
    setReportData(null);
    setShowReport(false);
    backendSessionIdRef.current = null;
    pendingSessionRef.current = null;
    setAnsweredIds(new Set());
    setActiveUploads([]);
    uploadBannerDismissed.current = false;
    failedFileAttempts.current = new Map();
    setMessages([
      {
        id: generateId(),
        role: 'agent',
        content: `Hello! I am MediCareAI Intelligent Medical Assistant🩺\n\nI can help you with:\n• Symptom analysis and preliminary diagnosis\n• Lab report interpretation\n• Health recommendations\n\nPlease describe your symptoms or upload relevant checkup reports.`,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Initialize: use useLayoutEffect + setTimeout to defer setState to next tick
  useLayoutEffect(() => {
    if (sessions.length > 0) return;
    const timer = setTimeout(() => {
      startNewSession();
    }, 0);
    return () => clearTimeout(timer);
  }, [sessions.length, startNewSession]);

  const handleSend = useCallback(
    async (text: string) => {
      if (isStreaming || !currentSessionId) return;

      if (chatMode === 'idle') {
        setChatMode('consulting');
      }

      if (!getToken()) {
        localStorage.removeItem('guest_token');
        localStorage.removeItem('guest_status');
        try {
          await agentApi.createGuestSession();
        } catch {
          // Continue with whatever token we have — better than blocking send
        }
      }

      const userMsg: ChatMessageItem = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      setIsStreaming(true);
      const agentMsgId = generateId();
      let content = '';
      let structured: DiagnosisReport | undefined;
      const workflowSteps: WorkflowStep[] = [];

      // Workflow step helper function
      const addStep = (step: Omit<WorkflowStep, 'id' | 'timestamp'>) => {
        const newStep: WorkflowStep = { ...step, id: generateId(), timestamp: new Date() };
        workflowSteps.push(newStep);
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === agentMsgId);
          if (idx === -1) {
            return [...prev, { id: agentMsgId, role: 'agent', content: '', timestamp: new Date(), isStreaming: true, workflowSteps: [...workflowSteps] }];
          }
          const next = prev.slice();
          next[idx] = { ...next[idx], workflowSteps: [...workflowSteps] };
          return next;
        });
      };

      // Plan C: diagnosed mode routes to dedicated chat endpoint
      if (chatMode === 'diagnosed' && backendSessionIdRef.current) {
        try {
          await agentApi.streamChat(
            backendSessionIdRef.current,
            text,
            (event: SSEEvent) => {
              switch (event.event) {
                case 'text':
                  content += event.data?.text || '';
                  setMessages((prev) => {
                    const idx = prev.findIndex((m) => m.id === agentMsgId);
                    if (idx === -1) {
                      return [...prev, { id: agentMsgId, role: 'agent', content, timestamp: new Date(), isStreaming: true }];
                    }
                    const next = prev.slice();
                    next[idx] = { ...next[idx], content, isStreaming: true };
                    return next;
                  });
                  break;
                case 'complete':
                  setMessages((prev) => {
                    const idx = prev.findIndex((m) => m.id === agentMsgId);
                    if (idx === -1) return prev;
                    const next = prev.slice();
                    next[idx] = { ...next[idx], isStreaming: false };
                    return next;
                  });
                  setIsStreaming(false);
                  break;
                case 'error':
                  setMessages((prev) => [...prev, { id: generateId(), role: 'agent', content: `Request failed, please retry`, timestamp: new Date() }]);
                  setIsStreaming(false);
                  break;
              }
            }
          );
        } catch {
          setMessages((prev) => [...prev, { id: generateId(), role: 'agent', content: `Connection failed, please check network and retry`, timestamp: new Date() }]);
          setIsStreaming(false);
        }
        return;
      }

      // Lightweight patient history — only user Q&A, exclude verbose reports.
      // The diagnosis pipeline uses this for classify_intent context.
      // The chat endpoint (_build_chat_context) loads full context from DB.
      const patientHistory = messages
        .filter(m => m.role === 'user' && m.content.length < 500)
        .map(m => `Patient: ${m.content.slice(0, 300)}`)
        .join('\n')
        .slice(0, 3000);

      try {
        await agentApi.streamDiagnose(
          { message: text, session_id: currentSessionId, patient_history: patientHistory },
          (event: SSEEvent) => {
            switch (event.event) {
              case 'intent': {
                const intent = event.data?.intent as string || 'diagnosis';
                const confidence = event.data?.confidence as string || 'medium';
                const reasoning = event.data?.reasoning as string || '';
                addStep({
                  type: 'intent',
                  status: 'done',
                  title: `MasterAgent identified intent: ${intent}`,
                  detail: `Confidence: ${confidence}${reasoning ? ` | ${reasoning}` : ''}`,
                });
                break;
              }
              case 'agent_switch': {
                const agentDisplay = event.data?.agent_display as string || event.data?.agent as string || 'Unknown';
                addStep({
                  type: 'agent_switch',
                  status: 'done',
                  title: `Switched to ${agentDisplay}`,
                  detail: event.data?.message as string || '',
                });
                break;
              }
              case 'thinking': {
                const stepName = event.data?.step as string || 'thinking';
                const messageText = event.data?.message as string || 'Analyzing...';
                addStep({
                  type: 'thinking',
                  status: 'done',
                  title: messageText,
                  detail: event.data?.detail as string || '',
                });
                break;
              }
              case 'tool_call': {
                const toolName = event.data?.tool as string || 'Unknown tool';
                addStep({
                  type: 'tool_call',
                  status: 'done',
                  title: event.data?.message as string || `Calling${toolName}...`,
                  toolName,
                  toolParams: (event.data?.params as Record<string, unknown>) || {},
                });
                break;
              }
              case 'tool_result': {
                const toolName = event.data?.tool as string || 'Unknown tool';
                addStep({
                  type: 'tool_result',
                  status: 'done',
                  title: event.data?.message as string || `${toolName} Execution complete`,
                  toolName,
                  toolResult: event.data?.result,
                });
                break;
              }
              case 'text': {
                content += event.data?.text || '';
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === agentMsgId);
                  if (idx === -1) {
                    return [...prev, { id: agentMsgId, role: 'agent', content, timestamp: new Date(), isStreaming: true, workflowSteps: [...workflowSteps] }];
                  }
                  const next = prev.slice();
                  next[idx] = { ...next[idx], content, isStreaming: true, workflowSteps: [...workflowSteps] };
                  return next;
                });
                break;
              }
              case 'structured':
                structured = event.data as unknown as DiagnosisReport;
                setReportData(structured);
                setShowReport(true);
                setIsDiagnosed(true);
                setChatMode('diagnosed');
                pendingSessionRef.current = null;
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === agentMsgId);
                  if (idx === -1) return prev;
                  const next = prev.slice();
                  next[idx] = { ...next[idx], structured, content: content || next[idx].content || 'Diagnosis report generated', workflowSteps: [...workflowSteps] };
                  return next;
                });
                break;
              case 'question': {
                const q = event.data as unknown as { question_id: string; question: string; type: string; options?: string[]; hint?: string; allow_skip?: boolean; colloquial_phase?: string; phase?: string; questions?: InterviewQuestion[] };
                const qs: InterviewQuestion[] = 'questions' in event.data ? (event.data as { questions: InterviewQuestion[] }).questions : [q as InterviewQuestion];
                // sessionId will be set when 'complete' event with status='waiting_for_answer' arrives
                // For now, just set the questionId; sessionId is updated in the 'complete' handler
                if (!pendingSessionRef.current) {
                  pendingSessionRef.current = { sessionId: '', questionId: q.question_id };
                } else {
                  pendingSessionRef.current.questionId = q.question_id;
                }
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === agentMsgId);
                  if (idx === -1) {
                    return [...prev, {
                      id: agentMsgId,
                      role: 'agent',
                      content: '',
                      timestamp: new Date(),
                      isStreaming: true,
                      workflowSteps: [...workflowSteps],
                      interviewQuestions: qs,
                    }];
                  }
                  const next = prev.slice();
                  next[idx] = { ...next[idx], isStreaming: true, workflowSteps: [...workflowSteps], interviewQuestions: qs };
                  return next;
                });
                break;
              }
              case 'interview_progress': {
                addStep({
                  type: 'thinking',
                  status: 'done',
                  title: '📋 Interview info collected',
                  detail: Object.entries(event.data?.collected as Record<string, unknown> || {})
                    .filter(([k]) => !k.startsWith('__'))
                    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', '),
                });
                break;
              }
              case 'error': {
                const errorMsg = event.data?.message as string || event.data?.error as string || 'Service error';
                addStep({
                  type: 'thinking',
                  status: 'error',
                  title: `Error: ${errorMsg}`,
                });
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === agentMsgId);
                  if (idx === -1) {
                    return [...prev, { id: agentMsgId, role: 'agent', content: `❌ Error: ${errorMsg}`, timestamp: new Date(), workflowSteps: [...workflowSteps] }];
                  }
                  const next = prev.slice();
                  next[idx] = { ...next[idx], content: `❌ Error: ${errorMsg}`, isStreaming: false, workflowSteps: [...workflowSteps] };
                  return next;
                });
                break;
              }
              case 'complete': {
                const sid = event.data?.session_id as string;
                if (sid) backendSessionIdRef.current = sid;
                const status = event.data?.status as string;
                if (status === 'waiting_for_answer') {
                  if (sid) {
                    if (!pendingSessionRef.current) {
                      pendingSessionRef.current = { sessionId: sid, questionId: '' };
                    } else {
                      pendingSessionRef.current.sessionId = sid;
                    }
                  }
                  break;
                }
                addStep({
                  type: 'complete',
                  status: 'done',
                  title: event.data?.message as string || '✅ Response complete',
                });
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === agentMsgId);
                  if (idx === -1) return prev;
                  const next = prev.slice();
                  next[idx] = { ...next[idx], isStreaming: false, workflowSteps: [...workflowSteps] };
                  return next;
                });
                setIsStreaming(false);
                pendingSessionRef.current = null;
                break;
              }
            }
          }
        );
      } catch {
        setMessages((prev) => [...prev, { id: generateId(), role: 'agent', content: `❌ Connection failed, please check network and retry`, timestamp: new Date() }]);
        setIsStreaming(false);
      }
    },
    [isStreaming, currentSessionId, chatMode]
  );

  const handleInterviewAnswer = useCallback(
    async (questionId: string, answer: string) => {
      // P0-1: Block interview answers after diagnosis
      if (chatMode === 'diagnosed') return;

      const pending = pendingSessionRef.current;
      if (!pending?.sessionId) return;

      setAnsweredIds((prev) => new Set([...prev, questionId]));

      // Disable the previous agent message's interview question
      setMessages((prev) => {
        const idx = prev.findLastIndex((m) => m.role === 'agent' && (m.interviewQuestion?.question_id === questionId || m.interviewQuestions?.some(iq => iq.question_id === questionId)));
        if (idx === -1) return prev;
        const next = prev.slice();
        const remaining = (next[idx].interviewQuestions || []).filter(iq => iq.question_id !== questionId);
        next[idx] = { ...next[idx], interviewQuestion: undefined, interviewQuestions: remaining.length > 0 ? remaining : undefined };
        if (remaining.length === 0) next[idx].isStreaming = false;
        return next;
      });

      // Add user answer as a new message
      const userAnswerMsg: ChatMessageItem = {
        id: generateId(),
        role: 'user',
        content: answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userAnswerMsg]);

      setIsStreaming(true);
      const agentMsgId = generateId();
      let content = '';
      let structured: DiagnosisReport | undefined;
      const workflowSteps: WorkflowStep[] = [];

      const addStep = (step: Omit<WorkflowStep, 'id' | 'timestamp'>) => {
        const newStep: WorkflowStep = { ...step, id: generateId(), timestamp: new Date() };
        workflowSteps.push(newStep);
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === agentMsgId);
          if (idx === -1) {
            return [...prev, { id: agentMsgId, role: 'agent', content: '', timestamp: new Date(), isStreaming: true, workflowSteps: [...workflowSteps] }];
          }
          const next = prev.slice();
          next[idx] = { ...next[idx], workflowSteps: [...workflowSteps] };
          return next;
        });
      };

      try {
        await agentApi.streamDiagnoseContinue(
          { session_id: pending.sessionId, question_id: questionId, answer },
          (event: SSEEvent) => {
            switch (event.event) {
              case 'thinking': {
                addStep({
                  type: 'thinking',
                  status: 'done',
                  title: (event.data?.message as string) || 'Analyzing...',
                  detail: (event.data?.detail as string) || '',
                });
                break;
              }
              case 'tool_call': {
                const toolName = (event.data?.tool as string) || 'Unknown tool';
                addStep({
                  type: 'tool_call',
                  status: 'done',
                  title: (event.data?.message as string) || `Calling${toolName}...`,
                  toolName,
                  toolParams: (event.data?.params as Record<string, unknown>) || {},
                });
                break;
              }
              case 'tool_result': {
                const toolName = (event.data?.tool as string) || 'Unknown tool';
                addStep({
                  type: 'tool_result',
                  status: 'done',
                  title: (event.data?.message as string) || `${toolName} Execution complete`,
                  toolName,
                  toolResult: event.data?.result,
                });
                break;
              }
              case 'text': {
                content += (event.data?.text as string) || '';
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === agentMsgId);
                  if (idx === -1) {
                    return [...prev, { id: agentMsgId, role: 'agent', content, timestamp: new Date(), isStreaming: true, workflowSteps: [...workflowSteps] }];
                  }
                  const next = prev.slice();
                  next[idx] = { ...next[idx], content, isStreaming: true, workflowSteps: [...workflowSteps] };
                  return next;
                });
                break;
              }
              case 'structured':
                structured = event.data as unknown as DiagnosisReport;
                setReportData(structured);
                setShowReport(true);
                setIsDiagnosed(true);
                setChatMode('diagnosed');
                pendingSessionRef.current = null;
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === agentMsgId);
                  if (idx === -1) return prev;
                  const next = prev.slice();
                  next[idx] = { ...next[idx], structured, content: content || next[idx].content || 'Diagnosis report generated', workflowSteps: [...workflowSteps] };
                  return next;
                });
                break;
              case 'question': {
                const q = event.data as unknown as { question_id: string; question: string; type: string; options?: string[]; hint?: string; allow_skip?: boolean; colloquial_phase?: string; phase?: string; questions?: InterviewQuestion[] };
                const qs: InterviewQuestion[] = 'questions' in event.data ? (event.data as { questions: InterviewQuestion[] }).questions : [q as InterviewQuestion];
                // sessionId will be set when 'complete' event with status='waiting_for_answer' arrives
                // For now, just set the questionId; sessionId is updated in the 'complete' handler
                if (!pendingSessionRef.current) {
                  pendingSessionRef.current = { sessionId: '', questionId: q.question_id };
                } else {
                  pendingSessionRef.current.questionId = q.question_id;
                }
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === agentMsgId);
                  if (idx === -1) {
                    return [...prev, {
                      id: agentMsgId,
                      role: 'agent',
                      content: '',
                      timestamp: new Date(),
                      isStreaming: true,
                      workflowSteps: [...workflowSteps],
                      interviewQuestions: qs,
                    }];
                  }
                  const next = prev.slice();
                  next[idx] = { ...next[idx], isStreaming: true, workflowSteps: [...workflowSteps], interviewQuestions: qs };
                  return next;
                });
                break;
              }
              case 'interview_progress': {
                addStep({
                  type: 'thinking',
                  status: 'done',
                  title: '📋 Interview info collected',
                  detail: Object.entries(event.data?.collected as Record<string, unknown> || {})
                    .filter(([k]) => !k.startsWith('__'))
                    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', '),
                });
                break;
              }
              case 'error': {
                const errorMsg = (event.data?.message as string) || (event.data?.error as string) || 'Service error';
                addStep({
                  type: 'thinking',
                  status: 'error',
                  title: `Error: ${errorMsg}`,
                });
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === agentMsgId);
                  if (idx === -1) {
                    return [...prev, { id: agentMsgId, role: 'agent', content: `❌ Error: ${errorMsg}`, timestamp: new Date(), workflowSteps: [...workflowSteps] }];
                  }
                  const next = prev.slice();
                  next[idx] = { ...next[idx], content: `❌ Error: ${errorMsg}`, isStreaming: false, workflowSteps: [...workflowSteps] };
                  return next;
                });
                break;
              }
              case 'complete': {
                const status = event.data?.status as string;
                if (status === 'waiting_for_answer') {
                  const sid = event.data?.session_id as string;
                  if (sid) {
                    if (!pendingSessionRef.current) {
                      pendingSessionRef.current = { sessionId: sid, questionId: '' };
                    } else {
                      pendingSessionRef.current.sessionId = sid;
                      // Keep the existing questionId, don't overwrite it
                    }
                  }
                  break;
                }
                if (status === 'already_diagnosed') {
                  setIsDiagnosed(true);
                  setChatMode('diagnosed');
                  setMessages((prev) => {
                    const idx = prev.findIndex((m) => m.id === agentMsgId);
                    if (idx === -1) {
                      return [...prev, { id: agentMsgId, role: 'system', content: '✅ Consultation complete, diagnosis report generated.', timestamp: new Date() }];
                    }
                    const next = prev.slice();
                    next[idx] = { ...next[idx], isStreaming: false, content: '✅ Consultation complete, diagnosis report generated.', workflowSteps: [...workflowSteps] };
                    return next;
                  });
                  setIsStreaming(false);
                  pendingSessionRef.current = null;
                  break;
                }
                addStep({
                  type: 'complete',
                  status: 'done',
                  title: (event.data?.message as string) || '✅ Response complete',
                });
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === agentMsgId);
                  if (idx === -1) return prev;
                  const next = prev.slice();
                  next[idx] = { ...next[idx], isStreaming: false, workflowSteps: [...workflowSteps] };
                  return next;
                });
                setIsStreaming(false);
                pendingSessionRef.current = null;
                break;
              }
            }
          }
        );
      } catch {
        setMessages((prev) => [...prev, { id: generateId(), role: 'agent', content: `❌ Connection failed, please check network and retry`, timestamp: new Date() }]);
        setIsStreaming(false);
      }
    },
    [isStreaming, currentSessionId]
  );

  const handleQuickReply = useCallback(
    (text: string) => {
      if (isStreaming) return;
      handleSend(text);
    },
    [isStreaming, handleSend]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!getToken()) {
        localStorage.removeItem('guest_token');
        localStorage.removeItem('guest_status');
        try {
          await agentApi.createGuestSession();
        } catch {
          // Continue — better than blocking the upload
        }
      }

      const uploadId = generateId();

      setActiveUploads((prev) => [
        ...prev,
        { fileId: uploadId, fileName: file.name, status: 'parsing' },
      ]);

      setMessages((prev) => [
        ...prev,
        {
          id: uploadId,
          role: 'agent',
          content: '',
          timestamp: new Date(),
          uploadStatus: 'processing',
          uploadFileName: file.name,
        },
      ]);

      try {
        const uploadRes = await uploadDocument(file);
        const fileId = uploadRes.file_id;

        // Poll for result
        const poll = setInterval(async () => {
          try {
            const result = await getParseResult(fileId);

            if (result.status === 'completed' && result.result) {
              clearInterval(poll);
              setActiveUploads((prev) =>
                prev.map((u) => (u.fileId === uploadId ? { ...u, status: 'completed' } : u))
              );
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === uploadId
                    ? {
                        ...m,
                        uploadStatus: 'completed',
                        labReport: result.result,
                        content: `📄 ${file.name} Parse complete`,
                      }
                    : m
                )
              );
              // Immediately post completed lab report to the session
              try {
                const token = getToken();
                const uploadSessionId = backendSessionIdRef.current || currentSessionId;
                await fetch(`/api/v1/agents/sessions/${uploadSessionId}/lab-reports`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : { 'X-Guest-Token': localStorage.getItem('guest_token') || '' }),
                  },
                  body: JSON.stringify([result.result]),
                });
              } catch {
                console.warn('[DEBUG] Failed to post lab report for:', file.name);
              }
            } else if (result.status === 'failed') {
              clearInterval(poll);
              const prevFails = failedFileAttempts.current.get(file.name) || 0;
              failedFileAttempts.current.set(file.name, prevFails + 1);
              setActiveUploads((prev) =>
                prev.map((u) => (u.fileId === uploadId ? { ...u, status: 'failed' } : u))
              );
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === uploadId
                    ? {
                        ...m,
                        uploadStatus: 'failed',
                        uploadError: result.error || 'Parse failed',
                        content: `❌ ${file.name} Parse failed`,
                      }
                    : m
                )
              );
            }
          } catch {
            // Keep polling on transient errors
          }
        }, 1500);

        // Timeout after 120 seconds
        setTimeout(() => {
          clearInterval(poll);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === uploadId && m.uploadStatus === 'processing'
                ? { ...m, uploadStatus: 'failed', uploadError: 'Parse timeout, please retry', content: `❌ ${file.name} Parse timeout` }
                : m
            )
          );
        }, 120000);
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === uploadId
              ? {
                  ...m,
                  uploadStatus: 'failed',
                  uploadError: err.message || 'Upload failed',
                  content: `❌ ${file.name} Upload failed`,
                }
              : m
          )
        );
      }
    },
    [currentSessionId, chatMode]
  );

  const handleNewChat = useCallback(() => {
    startNewSession();
    setHistoryOpen(false);
  }, [startNewSession]);

  // Group sessions by date for history display
  const groupedSessions = sessions.reduce<Record<string, ChatSession[]>>((acc, s) => {
    const date = new Date(s.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#F6F4EF' }}>
      <CssBaseline />

      {/* Top Bar */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: `1px solid ${sageBorder}` }}>
        <Toolbar sx={{ minHeight: 56, px: { xs: 1.5, sm: 2 } }}>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 700, color: sageText, fontSize: { xs: '1rem', sm: '1.15rem' } }}>
            MediCareAI Assistant
          </Typography>
          <IconButton
            onClick={() => setHistoryOpen(true)}
            sx={{ mr: 0.5, color: sageText }}
            aria-label="Chat history"
          >
            <HistoryIcon />
          </IconButton>
          <IconButton
            onClick={handleNewChat}
            sx={{
              color: '#fff',
              bgcolor: sagePrimary,
              '&:hover': { bgcolor: sagePrimaryDark },
              width: 36,
              height: 36,
            }}
            aria-label="New chat"
          >
            <AddIcon sx={{ fontSize: 20 }} />
          </IconButton>
          {guestStatus && (
            <Box sx={{ ml: 1 }}>
              <GuestBanner
                status={guestStatus}
                onRegister={() => { window.location.href = '/register'; }}
                onLogin={() => { window.location.href = '/login'; }}
              />
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Chat Area */}
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{ flex: 1, overflowY: 'auto', p: { xs: 1, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 0.5 }}
      >
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onInterviewAnswer={handleInterviewAnswer}
          />
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Pending Cards Panel (consulting mode) */}
      {chatMode === 'consulting' && (
        <PendingCardsPanel
          messages={messages}
          answeredIds={answeredIds}
          onAnswer={handleInterviewAnswer}
        />
      )}

      {/* Scroll-to-bottom FAB */}
      {showScrollDown && (
        <Fab
          size="small"
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          sx={{ position: 'fixed', bottom: 80, right: 24, bgcolor: 'background.paper', boxShadow: 2, zIndex: 5 }}
        >
          <KeyboardArrowDownIcon />
        </Fab>
      )}

      {/* Report FAB */}
      {reportData && (
        <Fab
          size="small"
          onClick={() => setShowReport(true)}
          sx={{ position: 'fixed', bottom: 80, right: 80, bgcolor: sagePrimary, color: '#fff', boxShadow: 3, zIndex: 1200 }}
        >
          📊
        </Fab>
      )}

      {/* Input Area */}
      <Box sx={{ p: 2, borderTop: `1px solid ${sageBorder}`, bgcolor: 'background.paper' }}>
        {(activeUploads.length > 0 || (chatMode === 'diagnosed' && !uploadBannerDismissed.current)) && (
          <UploadStatusBanner
            uploads={activeUploads}
            failedAttempts={failedFileAttempts.current}
            mode={chatMode === 'diagnosed' ? 'diagnosed' : 'consulting'}
            onDismiss={() => {
              setActiveUploads([]);
              uploadBannerDismissed.current = true;
            }}
          />
        )}
        {chatMode === 'consulting' ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 1 }}>
            📋 Consultation in progress, select best answer via interview cards below
          </Typography>
        ) : (
          <ChatInput
            onSend={handleSend}
            disabled={isStreaming}
            quickReplies={chatMode === 'idle' && messages.length <= 2 ? QUICK_REPLIES : undefined}
            onQuickReply={handleQuickReply}
            onFileUpload={handleFileUpload}
            placeholder={
              activeUploads.some((u) => u.status === 'parsing')
                ? 'Questions work better after report analysis completes~'
                : undefined
            }
          />
        )}
      </Box>

      {/* History Bottom Drawer */}
      <Drawer
        anchor="bottom"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        PaperProps={{
          sx: {
            maxHeight: '60vh',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            px: 2,
            pb: 4,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2, pb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: sageText }}>
            Chat History
          </Typography>
          <IconButton onClick={() => setHistoryOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 1 }} />
        {sessions.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">No chat history yet</Typography>
          </Box>
        ) : (
          Object.entries(groupedSessions).map(([date, sessList]) => (
            <Box key={date} sx={{ mb: 2 }}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  px: 1,
                  mb: 0.5,
                }}
              >
                {date}
              </Typography>
              <List disablePadding>
                {sessList.map((session) => (
                  <ListItemButton
                    key={session.id}
                    selected={session.id === currentSessionId}
                    onClick={() => {
                      setCurrentSessionId(session.id);
                      setHistoryOpen(false);
                    }}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      '&.Mui-selected': {
                        bgcolor: 'rgba(125,155,118,0.12)',
                        '&:hover': { bgcolor: 'rgba(125,155,118,0.18)' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <ChatBubbleOutlineIcon sx={{ fontSize: 18, color: sagePrimary }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={session.title || 'Chat'}
                      primaryTypographyProps={{
                        fontSize: '0.9rem',
                        fontWeight: session.id === currentSessionId ? 600 : 400,
                        color: sageText,
                        noWrap: true,
                      }}
                      secondary={`${session.message_count || 0} messages`}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          ))
        )}
      </Drawer>

      <FullScreenReport
        report={reportData!}
        visible={!!reportData && showReport}
        onClose={() => setShowReport(false)}
      />
    </Box>
  );
}
