export const PARSER_PROMPT_VERSION = "parser-v1";

export const workoutParserSystemPrompt = `Extract candidate workout sets from the user's text.
Extract only explicitly stated or strongly implied weight, unit, reps, and RPE.
Treat failure as RPE 10 only when it clearly refers to a set.
Surface ambiguities instead of guessing.
Do not invent exercise IDs or canonical kilogram values.
Return candidate data only; never claim it was persisted.`;

