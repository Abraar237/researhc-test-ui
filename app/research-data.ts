export type ResearchTopic = {
  id: string;
  lines: [string, string];
  question: string;
  related: string[];
  url?: string;
};

// Only the four supplied studies are represented as existing research.
// All other problem statements are illustrative examples for the hero.
export const researchTopics: ResearchTopic[] = [
  { id: 'script-bias', lines: ['Script bias in', 'LLM-as-judge scoring'], question: 'Does changing only the writing system of a Hindi answer change an LLM judge’s score?', related: ['voice-bias', 'judge-order', 'handwriting'], url: 'https://abraar237.github.io/script-bias-llm-judges/' },
  { id: 'judge-order', lines: ['Does answer order', 'bias the LLM judge?'], question: 'Does swapping the order of two otherwise identical candidate answers reverse an LLM judge’s preference?', related: ['script-bias', 'reward-hacking', 'voice-bias'] },
  { id: 'reward-hacking', lines: ['Reward hacking in', 'small language models'], question: 'Can uncertainty-aware reward models reduce reward hacking in small language models?', related: ['sparse-rewards', 'judge-order', 'reward-transfer'] },
  { id: 'sparse-rewards', lines: ['Reasoning with sparse', 'vs. step-level rewards'], question: 'Which feedback granularity teaches reasoning most efficiently under a fixed training budget?', related: ['reward-hacking', 'reward-transfer', 'agent-memory'] },
  { id: 'reward-transfer', lines: ['Do learned rewards', 'transfer across tasks?'], question: 'How much does a learned reward model degrade when transferred to an unseen task distribution?', related: ['reward-hacking', 'driving-policy', 'few-shot'] },
  { id: 'driving-policy', lines: ['Driving policies on', 'unseen road layouts'], question: 'How do vision-language-action policies generalize to unfamiliar driving scenarios?', related: ['occlusion', 'action-latency', 'reward-transfer'] },
  { id: 'voice-bias', lines: ['Same words, new voice.', 'Does the grade change?'], question: 'How do voice identity and accent affect audio language models’ grades when the words stay fixed?', related: ['script-bias', 'judge-order', 'speech-noise'], url: 'https://abraar237.github.io/speaker-identity-bias/' },
  { id: 'speech-noise', lines: ['Does background noise', 'change an oral grade?'], question: 'Does audio noise alter an LLM judge’s evaluation independently of answer correctness?', related: ['voice-bias', 'calibration', 'handwriting'] },
  { id: 'schema-drift', lines: ['Silent agent failures', 'after tool-schema drift'], question: 'What silently breaks when a tool schema changes but the agent still believes the old interface?', related: ['agent-memory', 'context-budget', 'tool-recovery'], url: 'https://abraar237.github.io/shema-drift-research/' },
  { id: 'context-budget', lines: ['Which context survives', 'a strict token budget?'], question: 'Which context selection strategy best preserves tool-use accuracy under tight token budgets?', related: ['schema-drift', 'agent-memory', 'retrieval-noise'] },
  { id: 'occlusion', lines: ['Pedestrian occlusion', 'and action prediction'], question: 'How does partial pedestrian occlusion affect an embodied model’s next-action prediction?', related: ['driving-policy', 'action-latency', 'calibration'] },
  { id: 'action-latency', lines: ['Action latency in', 'vision-language policies'], question: 'How do token count and visual resolution affect action latency in vision-language-action models?', related: ['driving-policy', 'gpu-bottlenecks', 'occlusion'] },
  { id: 'ocr-injection', lines: ['Prompt injection across', 'the OCR boundary'], question: 'Where should a prompt-injection filter sit when scanned documents re-enter a model through OCR?', related: ['schema-drift', 'retrieval-noise', 'handwriting'], url: 'https://abraar237.github.io/ocr-prompt-research/' },
  { id: 'retrieval-noise', lines: ['Conflicting evidence', 'in retrieved context'], question: 'When retrieval returns contradictory passages, which evidence does a language model trust?', related: ['ocr-injection', 'context-budget', 'agent-memory'] },
  { id: 'agent-memory', lines: ['When should an agent', 'forget old context?'], question: 'Can selective forgetting reduce stale instructions without losing useful task history?', related: ['schema-drift', 'context-budget', 'tool-recovery'] },
  { id: 'tool-recovery', lines: ['Can agents recover', 'without an error signal?'], question: 'Can semantic verification detect incorrect tool calls that were accepted without errors?', related: ['schema-drift', 'agent-memory', 'calibration'] },
  { id: 'fluid-flow', lines: ['Recovering fluid flow', 'from sparse sensors'], question: 'Can physics-informed neural networks reconstruct fluid flow from sparse, noisy observations?', related: ['inverse-physics', 'pinn-boundaries', 'few-shot'] },
  { id: 'inverse-physics', lines: ['Inferring unknown PDE', 'coefficients from data'], question: 'How reliably can inverse physics-informed models identify PDE coefficients under measurement noise?', related: ['fluid-flow', 'pinn-boundaries', 'neural-ode'] },
  { id: 'calibration', lines: ['Confident predictions', 'under visual domain shift'], question: 'Do vision models remain calibrated under lighting, weather, and camera shifts?', related: ['occlusion', 'few-shot', 'tool-recovery'] },
  { id: 'few-shot', lines: ['Adapting a model with', 'only five labeled examples'], question: 'Which adaptation strategies work best with only five labeled examples per class?', related: ['calibration', 'data-balance', 'model-size'] },
  { id: 'pinn-boundaries', lines: ['Why PINNs fail near', 'sharp boundary layers'], question: 'Does adaptive sampling reduce physics-informed model error near steep boundary layers?', related: ['fluid-flow', 'inverse-physics', 'neural-ode'] },
  { id: 'neural-ode', lines: ['Discovering missing', 'terms in physical laws'], question: 'Can neural residuals recover missing dynamics without undermining known conservation laws?', related: ['inverse-physics', 'fluid-flow', 'precision'] },
  { id: 'gpu-bottlenecks', lines: ['Training GPT-2 on 8 GPUs:', 'where does time go?'], question: 'Which communication bottlenecks dominate GPT-2 training across eight GPUs?', related: ['parallelism', 'precision', 'checkpointing'] },
  { id: 'parallelism', lines: ['Choosing the right mix', 'of 5D parallelism'], question: 'Which combinations of parallelism minimize training time for a fixed cluster and model size?', related: ['gpu-bottlenecks', 'checkpointing', 'action-latency'] },
  { id: 'model-size', lines: ['When do smaller models', 'generalize better?'], question: 'At what data scale do smaller architectures outperform larger ones under distribution shift?', related: ['few-shot', 'data-balance', 'precision'] },
  { id: 'data-balance', lines: ['Dataset imbalance in', 'recycling classifiers'], question: 'How does class balance change a recycling image classifier’s errors on rare materials?', related: ['few-shot', 'handwriting', 'calibration'] },
  { id: 'heat-transfer', lines: ['Neural surrogates for', 'unseen heat sources'], question: 'Can a learned heat-transfer surrogate generalize to unseen source positions and intensities?', related: ['fluid-flow', 'pinn-boundaries', 'inverse-physics'] },
  { id: 'precision', lines: ['How much precision', 'does GPT-2 training need?'], question: 'How do reduced-precision formats trade memory and throughput against convergence?', related: ['gpu-bottlenecks', 'model-size', 'parallelism'] },
  { id: 'checkpointing', lines: ['Activation checkpoints:', 'memory vs. recomputation'], question: 'Which activation checkpoint schedules reduce memory with the smallest training-time penalty?', related: ['gpu-bottlenecks', 'parallelism', 'precision'] },
  { id: 'handwriting', lines: ['Whose handwriting', 'does AI misread?'], question: 'How does handwriting recognition accuracy vary across writing styles?', related: ['script-bias', 'ocr-injection', 'data-balance'] },
  { id: 'shortcut-learning', lines: ['Does the classifier learn', 'the object or background?'], question: 'Can background swaps reveal spurious shortcuts in a student-built image classifier?', related: ['data-balance', 'calibration', 'few-shot'] },
  { id: 'synthetic-data', lines: ['When does synthetic', 'training data stop helping?'], question: 'At what synthetic-to-real data ratio does image classification performance start to degrade?', related: ['shortcut-learning', 'model-size', 'data-balance'] },
];

export const researchThreads = [
  { title: 'Who gets a fair score?', subtitle: 'Same answer. Different judgment.', ids: ['script-bias', 'voice-bias', 'judge-order', 'speech-noise', 'calibration'] },
  { title: 'When the interface changes', subtitle: 'Understanding the failures that stay silent.', ids: ['schema-drift', 'agent-memory', 'tool-recovery', 'context-budget', 'retrieval-noise'] },
  { title: 'What enters the context?', subtitle: 'The boundary between evidence and instruction.', ids: ['ocr-injection', 'retrieval-noise', 'context-budget', 'script-bias', 'schema-drift'] },
  { title: 'Learning the right lesson', subtitle: 'When optimizing a reward misses the point.', ids: ['reward-hacking', 'sparse-rewards', 'reward-transfer', 'judge-order', 'model-size'] },
  { title: 'From perception to action', subtitle: 'Decisions beyond the training environment.', ids: ['driving-policy', 'occlusion', 'action-latency', 'calibration', 'reward-transfer'] },
  { title: 'Finding the missing physics', subtitle: 'Learning what sparse observations cannot tell us.', ids: ['fluid-flow', 'inverse-physics', 'pinn-boundaries', 'neural-ode', 'heat-transfer'] },
  { title: 'Where does the compute go?', subtitle: 'The hidden cost of training at scale.', ids: ['gpu-bottlenecks', 'parallelism', 'precision', 'checkpointing', 'action-latency'] },
  { title: 'How little data is enough?', subtitle: 'Generalization beyond bigger models and datasets.', ids: ['few-shot', 'model-size', 'synthetic-data', 'calibration', 'data-balance'] },
  { title: 'What did the model really learn?', subtitle: 'Finding the shortcuts inside everyday predictions.', ids: ['data-balance', 'handwriting', 'shortcut-learning', 'few-shot', 'synthetic-data'] },
];
