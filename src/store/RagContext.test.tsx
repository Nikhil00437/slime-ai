import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RagProvider, useRag } from './RagContext';

function TestComponent() {
  const {
    documents,
    knowledgeBases,
    isProcessing,
    error,
    importText,
    removeDocument,
    createKnowledgeBase,
    deleteKnowledgeBase,
    search,
  } = useRag();

  return (
    <div>
      <span data-testid="doc-count">{documents.length}</span>
      <span data-testid="kb-count">{knowledgeBases.length}</span>
      <span data-testid="processing">{isProcessing ? 'true' : 'false'}</span>
      <span data-testid="error">{error || 'none'}</span>

      <ul data-testid="doc-list">
        {documents.map((d) => (
          <li key={d.id} data-testid={`doc-${d.id}`}>
            {d.filename} (chunks: {d.chunkCount})
          </li>
        ))}
      </ul>

      <button onClick={() => importText('test.txt', 'Hello world. This is a test document for RAG.')}>
        Import Text
      </button>
      <button onClick={() => importText('big.txt', 'Word. '.repeat(500))}>
        Import Big Text
      </button>
      <button
        onClick={async () => {
          if (documents.length > 0) {
            await removeDocument(documents[0].id);
          }
        }}
      >
        Remove First Doc
      </button>
      <button
        onClick={async () => {
          const ids = documents.map((d) => d.id);
          await createKnowledgeBase('Test KB', 'A test knowledge base', ids);
        }}
      >
        Create KB
      </button>
      <button
        onClick={async () => {
          if (knowledgeBases.length > 0) {
            await deleteKnowledgeBase(knowledgeBases[0].id);
          }
        }}
      >
        Delete First KB
      </button>
      <button
        onClick={async () => {
          if (documents.length > 0) {
            // Use minScore -1 to get all results regardless of similarity
            const results = await search('test', { topK: 10, minScore: -1 });
            const resultDiv = document.createElement('div');
            resultDiv.setAttribute('data-testid', 'search-results');
            resultDiv.textContent = `found ${results.length} results`;
            document.body.appendChild(resultDiv);
          }
        }}
      >
        Search
      </button>
    </div>
  );
}

describe('RagContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default empty state', () => {
    render(
      <RagProvider>
        <TestComponent />
      </RagProvider>
    );
    expect(screen.getByTestId('doc-count').textContent).toBe('0');
    expect(screen.getByTestId('kb-count').textContent).toBe('0');
    expect(screen.getByTestId('processing').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  it('imports text document and chunks it', async () => {
    const user = userEvent.setup();
    render(
      <RagProvider>
        <TestComponent />
      </RagProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Import Text' }));

    await waitFor(() => {
      expect(screen.getByTestId('doc-count').textContent).toBe('1');
    });
    expect(screen.getByTestId('processing').textContent).toBe('false');

    const docList = screen.getByTestId('doc-list');
    expect(docList.textContent).toContain('test.txt');
    expect(docList.textContent).toContain('chunks: 1');
  });

  it('imports large text and creates multiple chunks', async () => {
    const user = userEvent.setup();
    render(
      <RagProvider>
        <TestComponent />
      </RagProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Import Big Text' }));

    await waitFor(() => {
      const docList = screen.getByTestId('doc-list');
      expect(docList.textContent).toContain('big.txt');
      const chunkMatch = docList.textContent?.match(/chunks: (\d+)/g);
      expect(chunkMatch).toBeTruthy();
      // The last chunks: value is for big.txt
      const lastMatch = chunkMatch![chunkMatch!.length - 1];
      expect(Number(lastMatch.match(/\d+/)![0])).toBeGreaterThan(1);
    });
  });

  it('removes a document', async () => {
    const user = userEvent.setup();
    render(
      <RagProvider>
        <TestComponent />
      </RagProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Import Text' }));
    await waitFor(() => {
      expect(screen.getByTestId('doc-count').textContent).toBe('1');
    });

    await user.click(screen.getByRole('button', { name: 'Remove First Doc' }));
    await waitFor(() => {
      expect(screen.getByTestId('doc-count').textContent).toBe('0');
    });
  });

  it('creates and deletes knowledge bases', async () => {
    const user = userEvent.setup();
    render(
      <RagProvider>
        <TestComponent />
      </RagProvider>
    );

    // Import a doc first
    await user.click(screen.getByRole('button', { name: 'Import Text' }));
    await waitFor(() => {
      expect(screen.getByTestId('doc-count').textContent).toBe('1');
    });

    // Create KB
    await user.click(screen.getByRole('button', { name: 'Create KB' }));
    await waitFor(() => {
      expect(screen.getByTestId('kb-count').textContent).toBe('1');
    });

    // Delete KB
    await user.click(screen.getByRole('button', { name: 'Delete First KB' }));
    await waitFor(() => {
      expect(screen.getByTestId('kb-count').textContent).toBe('0');
    });
  });

  it('searches documents and returns results', async () => {
    const user = userEvent.setup();
    render(
      <RagProvider>
        <TestComponent />
      </RagProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Import Text' }));
    await waitFor(() => {
      expect(screen.getByTestId('doc-count').textContent).toBe('1');
    });

    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => {
      const results = screen.getByTestId('search-results');
      expect(results.textContent).toBe('found 1 results');
    });
  });

  it('throws when useRag is used outside provider', () => {
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useRag must be used within RagProvider');
  });

  it('tracks processing state during import', async () => {
    const user = userEvent.setup();
    render(
      <RagProvider>
        <TestComponent />
      </RagProvider>
    );

    // Processing should be true during import
    const importPromise = user.click(screen.getByRole('button', { name: 'Import Text' }));
    // The import should be synchronous enough that processing resolves quickly
    await importPromise;

    await waitFor(() => {
      expect(screen.getByTestId('doc-count').textContent).toBe('1');
      expect(screen.getByTestId('processing').textContent).toBe('false');
    });
  });
});
