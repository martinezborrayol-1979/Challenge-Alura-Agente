/**
 * Utility for performing line-by-line and word-by-word diffing.
 * Used for the side-by-side document version comparator.
 */

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'empty';
  content: string;
  lineNumber?: number;
}

/**
 * Computes line-by-line difference between two texts for side-by-side display.
 * Generates empty/placeholder lines to align matching blocks.
 */
export function computeLineDiff(oldText: string, newText: string): { left: DiffLine[]; right: DiffLine[] } {
  // Normalize line endings and split
  const oldLines = oldText.replace(/\r\n/g, '\n').split('\n');
  const newLines = newText.replace(/\r\n/g, '\n').split('\n');

  const m = oldLines.length;
  const n = newLines.length;

  // Standard Longest Common Subsequence (LCS) table
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const left: DiffLine[] = [];
  const right: DiffLine[] = [];

  let i = m;
  let j = n;

  // Backtrack to find diff
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      const content = oldLines[i - 1];
      left.unshift({ type: 'unchanged', content, lineNumber: i });
      right.unshift({ type: 'unchanged', content, lineNumber: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // Line is added in the new text
      left.unshift({ type: 'empty', content: '' });
      right.unshift({ type: 'added', content: newLines[j - 1], lineNumber: j });
      j--;
    } else {
      // Line is removed from the old text
      left.unshift({ type: 'removed', content: oldLines[i - 1], lineNumber: i });
      right.unshift({ type: 'empty', content: '' });
      i--;
    }
  }

  // To make it look even cleaner, let's pair adjacent removed/added lines
  // instead of having a cascade of empty lines.
  // For example, if we have:
  // Left:  [removed, empty]
  // Right: [empty, added]
  // We can compress them to:
  // Left:  [removed]
  // Right: [added]
  // Let's run a compaction pass to line them up beautifully side-by-side!
  const compactedLeft: DiffLine[] = [];
  const compactedRight: DiffLine[] = [];

  let p = 0;
  while (p < left.length) {
    // Look for a sequence of [removed] accompanied by [empty] on right,
    // followed by [empty] on left accompanied by [added] on right.
    if (
      left[p].type === 'removed' &&
      right[p].type === 'empty' &&
      p + 1 < left.length &&
      left[p + 1].type === 'empty' &&
      right[p + 1].type === 'added'
    ) {
      compactedLeft.push(left[p]);
      compactedRight.push(right[p + 1]);
      p += 2;
    } else {
      compactedLeft.push(left[p]);
      compactedRight.push(right[p]);
      p++;
    }
  }

  return { left: compactedLeft, right: compactedRight };
}

export interface WordToken {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

/**
 * Computes simple word-level differences within a single line for micro-highlighting.
 */
export function computeWordDiff(oldLine: string, newLine: string): { left: WordToken[]; right: WordToken[] } {
  // If either line is empty, return simple unchanged or full add/remove tokens
  if (!oldLine.trim() && newLine.trim()) {
    return {
      left: [],
      right: [{ type: 'added', text: newLine }]
    };
  }
  if (oldLine.trim() && !newLine.trim()) {
    return {
      left: [{ type: 'removed', text: oldLine }],
      right: []
    };
  }

  // Helper to split text into words and punctuation/whitespace tokens
  const tokenize = (text: string): string[] => {
    return text.split(/(\s+|[.,\/#!$%\^&\*;:{}=\-_`~()\[\]?+])/).filter(Boolean);
  };

  const oldTokens = tokenize(oldLine);
  const newTokens = tokenize(newLine);

  const m = oldTokens.length;
  const n = newTokens.length;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const leftTokens: WordToken[] = [];
  const rightTokens: WordToken[] = [];

  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      const val = oldTokens[i - 1];
      leftTokens.unshift({ type: 'unchanged', text: val });
      rightTokens.unshift({ type: 'unchanged', text: val });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rightTokens.unshift({ type: 'added', text: newTokens[j - 1] });
      j--;
    } else {
      leftTokens.unshift({ type: 'removed', text: oldTokens[i - 1] });
      i--;
    }
  }

  return { left: leftTokens, right: rightTokens };
}
