# Załącznik: Cyfrowe materiały uzupełniające

Niniejszy załącznik zawiera pełny kod źródłowy oraz dane eksperymentalne wytworzone w ramach pracy magisterskiej. Materiały są podzielone na dwa samodzielne katalogi, z których każdy odpowiada oddzielnemu komponentowi zaimplementowanego systemu.

---

## Struktura katalogów

```
appendix/
├── README.md                    ← ten plik
├── A_workflow-system/           ← implementacja przepływów i agentów Mastra (src/mastra/)
└── B_experiment-runner/         ← narzędzie do przeprowadzania i oceny eksperymentów
```

---

## A — Przepływy Mastra (`A_workflow-system/`)

Implementacja systemu NL-to-SQL w środowisku Mastra: definicje przepływów, agentów, narzędzi oraz modułów pomocniczych. Jest to rdzeń systemu ocenianego w pracy — przyjmuje pytania w języku naturalnym, generuje zapytania SQL, wykonuje je na bazie danych PostgreSQL i tworzy specyfikacje wizualizacji w formacie Vega-Lite.

**Technologie:** Mastra 1.2, AI SDK, PostgreSQL, Vega-Lite.

### Przepływy (Workflows)

| Plik | ID przepływu | Opis |
|---|---|---|
| `workflows/simple.workflow.ts` | `simpleWorkflow` | Jednoetapowy: model generuje SQL → wykonanie → wizualizacja |
| `workflows/agent.workflow.ts` | `agentWorkflow` | Agent generuje SQL i specyfikację wizualizacji w jednym kroku |
| `workflows/complex.workflow.ts` | `complexWorkflow` | Planer + iteracyjna pętla SQL→walidacja (do 3 prób) |
| `workflows/rag.workflow.ts` | `ragWorkflow` | Wariant z augmentacją RAG |

### Agenty

| Plik | Rola |
|---|---|
| `agents/sql.agent.ts` | Główny agent generujący zapytania SQL |
| `agents/one-shot.agent.ts` | Agent jednoetapowy: SQL + wizualizacja |
| `agents/planner.agent.ts` | Planer zapytań (używany przez complexWorkflow) |
| `agents/validator.agent.ts` | Etap walidacji SQL |
| `agents/intent-parser.agent.ts` | Parsowanie intencji w języku naturalnym |
| `agents/viz.agent.ts` | Generowanie specyfikacji Vega-Lite |
| `agents/retrieval.agent.ts` | Agent wyszukiwania RAG |

### Główne katalogi

| Ścieżka | Zawartość |
|---|---|
| `workflows/` | Definicje przepływów (simple, agent, complex, rag) |
| `agents/` | Wszystkie agenty Mastra |
| `tools/` | Narzędzia Mastra (introspekcja schematu, wykonywanie SQL, EXPLAIN, próbkowanie) |
| `db/` | Połączenie z bazą danych i funkcje pomocnicze |
| `parsing/` | Narzędzia parsowania SQL i odpowiedzi |
| `validation/` | Logika walidacji wyników |
| `visualization/` | Funkcje pomocnicze specyfikacji Vega-Lite |
| `scorers/` | Definicje ewaluatorów |
| `config/` | Konfiguracja środowiska uruchomieniowego Mastra |
| `index.ts` | Punkt wejścia Mastra — rejestracja wszystkich przepływów i agentów |

---

## B — Narzędzie eksperymentalne (`B_experiment-runner/`)

Narzędzie wiersza poleceń (środowisko Bun) do systematycznego uruchamiania promptów ze zbioru testowego na endpointach przepływów, zbierania ustrukturyzowanych artefaktów, analizy danych śledzenia LLM z bazy Postgres pod kątem kosztów, opóźnień i liczby tokenów, a także generowania raportów porównawczych z wizualizacjami Vega-Lite. Zawiera lokalny interfejs webowy do ręcznej oceny wyników przez eksperta.

**Stos technologiczny:** Bun, TypeScript, Commander, Vite, React, Tailwind CSS v4, shadcn/ui, Vega-Lite.

### Polecenia CLI

```sh
bun index.ts run     --config <ścieżka.yaml>        # Uruchomienie eksperymentu
bun index.ts analyze --experiment-dir <ścieżka>     # Ponowna analiza śladów
bun index.ts compare --target <A> --target <B>      # Porównanie dwóch eksperymentów
bun index.ts grade   --target <selektor>            # Uruchomienie interfejsu oceny
```

### Konfiguracje eksperymentów

Pliki konfiguracyjne znajdują się w katalogu `config/` i odpowiadają warunkom eksperymentalnym ocenianym w pracy:

| Konfiguracja | Przepływ | Model |
|---|---|---|
| `claude/university.yaml` | simpleWorkflow | Claude (przez Vercel AI) |
| `gemini/university.yaml` | simpleWorkflow | Gemini Flash |
| `qwen/university.yaml` | simpleWorkflow | Qwen |
| `ollama/university.yaml` | simpleWorkflow | Model lokalny przez Ollama |
| `university-agent.yaml` | agentWorkflow | Agent oparty na GPT |
| `university-complex.yaml` | complexWorkflow | Wieloetapowy planer |
| `university-network.yaml` | networkWorkflow | Wariant sieciowy |

### Wyniki eksperymentów

Wszystkie wyniki eksperymentów są przechowywane w katalogu `experiments/`, z jednym podkatalogiem na każdy warunek eksperymentalny, zawierającym katalogi poszczególnych uruchomień oznaczone znacznikiem czasu:

```
experiments/
├── university/            ← bazowy prosty przepływ
├── university-claude/     ← warunek: model Claude
├── university-gemini/     ← warunek: model Gemini
├── university-gemma3/     ← warunek: model Gemma 3
├── university-qwen/       ← warunek: model Qwen
├── university-agent/      ← warunek: przepływ agentowy
├── university-complex/    ← warunek: przepływ złożony
└── university-network/    ← warunek: przepływ sieciowy
```

Każdy katalog uruchomienia zawiera: `manifest.json`, `summary.json`, `trace-cost-report.json`, `grades.json`, `sql-checks.json`, `golden-sql-results.json` oraz artefakty poszczególnych uruchomień (`run.json`, `query.sql`, `vega.raw.json`, `viz.png`).

### Zbiór testowy

`testsets/university.jsonl` — zbiór pytań w języku naturalnym używany we wszystkich eksperymentach, zawierający wzorcowe zapytania SQL (`golden_sql`) do oceny dokładności wykonania (EX).

### Główne katalogi

| Ścieżka | Zawartość |
|---|---|
| `experiments/` | Wszystkie wyniki eksperymentów i artefakty |
| `results/analysis/` | Raporty porównawcze i wykresy |
| `testsets/` | Pliki zbioru testowego w formacie JSONL |
| `config/` | Pliki konfiguracyjne eksperymentów w formacie YAML |
| `src/` | Pełny kod źródłowy CLI i interfejsu oceny |

---

## Uwagi dotyczące odtwarzalności

- Narzędzie eksperymentalne (`B_experiment-runner/`) wymaga środowiska **Bun** oraz działającej instancji systemu przepływów Mastra. Zależności można przywrócić poleceniem `bun install`.
- System przepływów Mastra (`A_workflow-system/`) wymaga **Node.js**, **pnpm** oraz **Dockera**. Dane uwierzytelniające do bazy danych i klucze API należy dostarczyć przez plik `.env` (wymagane zmienne środowiskowe opisane są w pliku `.env.example` oryginalnego projektu).
- Katalogi `node_modules/` oraz artefakty kompilacji zostały pominięte w celu ograniczenia rozmiaru załącznika.
