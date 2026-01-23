/**
 * Extraction Components
 *
 * UI components for the smart data clarification system.
 */

// Badges
export {
  ConfidenceBadge,
  ClarificationTypeBadge,
  PriorityBadge,
  type ConfidenceLevel,
  type ClarificationType,
  type ConfidenceBadgeProps,
  type ClarificationTypeBadgeProps,
  type PriorityBadgeProps,
} from './confidence-badge';

// Clarification Panel
export {
  ClarificationPanel,
  type Clarification,
  type ClarificationPanelProps,
} from './clarification-panel';

// Conflict Resolution
export {
  ConflictResolutionModal,
  ConflictList,
  type DocumentConflict,
  type ConflictResolutionModalProps,
  type ConflictListProps,
} from './conflict-resolution-modal';

// Decision Queue
export {
  DecisionQueue,
  DecisionProgress,
  type DecisionQueueItem,
  type DecisionQueueProps,
  type DecisionProgressProps,
} from './decision-queue';

// Field Editor
export {
  FieldEditor,
  InlineFieldEditor,
  type FieldValue,
  type FieldHistory,
  type FieldBenchmark,
  type FieldEditorProps,
  type InlineFieldEditorProps,
} from './field-editor';
