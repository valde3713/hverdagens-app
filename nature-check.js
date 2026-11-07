const MODEL_ID = "onnx-community/multilingual-MiniLMv2-L6-mnli-xnli-ONNX";
const MODEL_REVISION = "ca5daf3d11b6c4b3143b1f4602a2edfb64c3ad7e";
const MODEL_THRESHOLD = 0.62;
const ACTION_LABELS = [
  "en konkret handling, der gavner naturen eller miljøet",
  "en skadelig handling, for eksempel at smide affald i naturen eller køre i en benzin- eller dieselbil",
  "ingen konkret handling eller en handling uden tydelig positiv eller negativ miljøpåvirkning",
];
const POSITIVE_SCORE_CATEGORIES = [
  {
    label: "en lille konkret handling, der hjælper naturen eller miljøet",
    points: 1,
  },
  {
    label: "en nyttig handling, der giver en tydelig, men begrænset miljøgevinst",
    points: 2,
  },
  {
    label: "en betydelig handling, der gavner naturen eller miljøet",
    points: 3,
  },
  {
    label: "en stor indsats med en væsentlig positiv effekt på naturen eller miljøet",
    points: 4,
  },
  {
    label: "en meget stor eller vedvarende indsats med stor positiv effekt på naturen eller miljøet",
    points: 5,
  },
];

let classifierPromise;

async function getClassifier(onProgress) {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { env, pipeline } = await import(
        "https://esm.sh/@huggingface/transformers@3.8.1?bundle"
      );
      env.useBrowserCache = true;
      env.useWasmCache = true;
      env.cacheKey = "hverdagens-transformers-v3";

      return pipeline("zero-shot-classification", MODEL_ID, {
        dtype: "q8",
        revision: MODEL_REVISION,
        progress_callback: onProgress,
      });
    })().catch((error) => {
      classifierPromise = undefined;
      throw error;
    });
  }
  return classifierPromise;
}

export async function validateNatureAction(description, onProgress = () => {}) {
  const classifier = await getClassifier(onProgress);
  const actionResult = await classifier(description, ACTION_LABELS, {
    hypothesis_template: "Beskrivelsen handler om {}.",
    multi_label: false,
  });
  const confidence = actionResult.scores[0] ?? 0;
  if (confidence < MODEL_THRESHOLD) return { points: 0, confidence };

  if (actionResult.labels[0] === ACTION_LABELS[1]) {
    return { points: -1, confidence };
  }
  if (actionResult.labels[0] !== ACTION_LABELS[0]) {
    return { points: 0, confidence };
  }

  const scoreResult = await classifier(description, POSITIVE_SCORE_CATEGORIES.map(({ label }) => label), {
    hypothesis_template: "Beskrivelsen beskriver {}.",
    multi_label: false,
  });
  const category = POSITIVE_SCORE_CATEGORIES.find(({ label }) => label === scoreResult.labels[0]);

  return { points: category?.points ?? 0, confidence };
}
