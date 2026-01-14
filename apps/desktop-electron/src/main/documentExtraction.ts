import fs from "fs";
import path from "path";
import type {
  ClauseSuggestionPayload,
  CovenantSuggestionPayload,
  DefinitionSuggestionPayload,
  DueRule,
  ObligationSuggestionPayload
} from "@covenantpulse/shared";

export type ExtractionSuggestion<T> = {
  payload: T;
  confidence: number;
};

export type DocumentExtractionResult = {
  suggestedClauses: Array<ExtractionSuggestion<ClauseSuggestionPayload>>;
  suggestedObligations: Array<ExtractionSuggestion<ObligationSuggestionPayload>>;
  suggestedCovenants: Array<ExtractionSuggestion<CovenantSuggestionPayload>>;
  suggestedDefinitions: Array<ExtractionSuggestion<DefinitionSuggestionPayload>>;
};

export type DocumentExtractionInput = {
  documentId: string;
  rawText: string;
  pages: Array<{ pageNumber: number; text: string }>;
};

export type DocumentExtractionAdapter = {
  key: string;
  name: string;
  extract: (input: DocumentExtractionInput) => Promise<DocumentExtractionResult>;
};

type ExtractedText = {
  rawText: string;
  pages: Array<{ pageNumber: number; text: string }>;
};

export async function extractDocumentText(filePath: string): Promise<ExtractedText> {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".pdf") {
    return extractPdfText(filePath);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const plain = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return { rawText: plain, pages: [{ pageNumber: 1, text: plain }] };
}

async function extractPdfText(filePath: string): Promise<ExtractedText> {
  const data = fs.readFileSync(filePath);
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjsLib.getDocument({ data, disableWorker: true } as any);
  const pdf = await loadingTask.promise;
  const pages: Array<{ pageNumber: number; text: string }> = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = (content.items as Array<{ str?: string }>)
      .map((item) => (item.str ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ pageNumber, text });
  }
  return { rawText: pages.map((page) => page.text).join("\n"), pages };
}

function findPageWithTerm(pages: Array<{ pageNumber: number; text: string }>, term: string) {
  const lowerTerm = term.toLowerCase();
  return pages.find((page) => page.text.toLowerCase().includes(lowerTerm));
}

function snippetFromText(text: string, term: string): string {
  const lower = text.toLowerCase();
  const index = lower.indexOf(term.toLowerCase());
  if (index === -1) {
    return text.slice(0, 180);
  }
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + 120);
  return text.slice(start, end);
}

class LocalHeuristicAdapter implements DocumentExtractionAdapter {
  key = "local-heuristic";
  name = "Local Heuristic";

  async extract(input: DocumentExtractionInput): Promise<DocumentExtractionResult> {
    const rawText = input.rawText.toLowerCase();
    const result: DocumentExtractionResult = {
      suggestedClauses: [],
      suggestedObligations: [],
      suggestedCovenants: [],
      suggestedDefinitions: []
    };

    if (rawText.includes("financial statements")) {
      const page = findPageWithTerm(input.pages, "financial statements");
      const pageNumber = page?.pageNumber ?? null;
      const snippet = page ? snippetFromText(page.text, "financial statements") : "";
      const dueRule: DueRule = { type: "after_period_end", daysAfter: 45, period: "Quarter" };
      result.suggestedClauses.push({
        payload: {
          clauseType: "Obligation",
          title: "Quarterly Financial Statements",
          textSnippet: snippet || "Borrower shall deliver quarterly financial statements within 45 days after quarter end.",
          pageNumber,
          tags: ["financials", "reporting"]
        },
        confidence: 0.62
      });
      result.suggestedObligations.push({
        payload: {
          title: "Quarterly Financial Statements",
          description: "Deliver quarterly financial statements within 45 days of quarter end.",
          frequency: "Quarterly",
          dueRule,
          ownerParty: "Borrower",
          severity: "High",
          sourceSnippet: snippet || "quarterly financial statements within 45 days",
          pageNumber
        },
        confidence: 0.6
      });
    }

    if (rawText.includes("leverage ratio")) {
      const page = findPageWithTerm(input.pages, "leverage ratio");
      const pageNumber = page?.pageNumber ?? null;
      const snippet = page ? snippetFromText(page.text, "leverage ratio") : "";
      result.suggestedCovenants.push({
        payload: {
          name: "Leverage Ratio",
          covenantType: "Ratio",
          formulaKey: "LEVERAGE_RATIO",
          thresholdOp: "<=",
          thresholdValue: 3.5,
          frequency: "Quarterly",
          sourceSnippet: snippet || "Leverage Ratio shall not exceed 3.5x",
          pageNumber
        },
        confidence: 0.58
      });
    }

    if (rawText.includes("interest coverage")) {
      const page = findPageWithTerm(input.pages, "interest coverage");
      const pageNumber = page?.pageNumber ?? null;
      const snippet = page ? snippetFromText(page.text, "interest coverage") : "";
      result.suggestedCovenants.push({
        payload: {
          name: "Interest Coverage",
          covenantType: "Ratio",
          formulaKey: "INTEREST_COVERAGE",
          thresholdOp: ">=",
          thresholdValue: 2.0,
          frequency: "Quarterly",
          sourceSnippet: snippet || "Interest Coverage Ratio shall be at least 2.0x",
          pageNumber
        },
        confidence: 0.55
      });
    }

    if (rawText.includes("ebitda") && rawText.includes("means")) {
      const page = findPageWithTerm(input.pages, "ebitda");
      const pageNumber = page?.pageNumber ?? null;
      const snippet = page ? snippetFromText(page.text, "ebitda") : "EBITDA means earnings before interest, taxes, depreciation, and amortization.";
      result.suggestedDefinitions.push({
        payload: {
          term: "EBITDA",
          definitionText: "EBITDA means earnings before interest, taxes, depreciation, and amortization.",
          sourceSnippet: snippet,
          pageNumber
        },
        confidence: 0.52
      });
    }

    return result;
  }
}

class MockExtractionAdapter implements DocumentExtractionAdapter {
  key = "mock";
  name = "Prototype Mock";

  async extract(): Promise<DocumentExtractionResult> {
    return {
      suggestedClauses: [
        {
          payload: {
            clauseType: "Obligation",
            title: "Annual Audited Statements",
            textSnippet: "Borrower shall provide audited annual statements within 90 days of fiscal year end.",
            pageNumber: 9,
            tags: ["audited", "annual"]
          },
          confidence: 0.83
        }
      ],
      suggestedObligations: [
        {
          payload: {
            title: "Annual Audited Statements",
            description: "Provide audited annual statements within 90 days of fiscal year end.",
            frequency: "Annually",
            dueRule: { type: "after_period_end", daysAfter: 90, period: "Year" },
            ownerParty: "Borrower",
            severity: "High",
            sourceSnippet: "audited annual statements within 90 days",
            pageNumber: 9
          },
          confidence: 0.81
        }
      ],
      suggestedCovenants: [
        {
          payload: {
            name: "Leverage Ratio",
            covenantType: "Ratio",
            formulaKey: "LEVERAGE_RATIO",
            thresholdOp: "<=",
            thresholdValue: 3.5,
            frequency: "Quarterly",
            sourceSnippet: "Leverage Ratio shall not exceed 3.5x",
            pageNumber: 14
          },
          confidence: 0.77
        }
      ],
      suggestedDefinitions: [
        {
          payload: {
            term: "EBITDA",
            definitionText: "EBITDA means earnings before interest, taxes, depreciation, and amortization.",
            sourceSnippet: "EBITDA means earnings before interest, taxes, depreciation, and amortization.",
            pageNumber: 5
          },
          confidence: 0.72
        }
      ]
    };
  }
}

export function loadDocumentExtractionAdapters(): DocumentExtractionAdapter[] {
  return [new LocalHeuristicAdapter(), new MockExtractionAdapter()];
}
