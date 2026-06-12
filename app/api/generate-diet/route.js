export const runtime = 'nodejs';

const activityFactors = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725
};

const goalAdjustments = {
  emagrecer: -450,
  manter: 0,
  'ganhar massa': 350
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculateNutrition(form) {
  const weight = toNumber(form.weight, 70);
  const height = toNumber(form.height, 170);
  const age = toNumber(form.age, 25);
  const gender = form.gender || 'masculino';
  const activity = form.activity || 'moderado';
  const goal = form.goal || 'manter';

  const bmr = gender === 'feminino'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  const tdee = bmr * (activityFactors[activity] || 1.55);
  const targetCalories = Math.max(1200, Math.round(tdee + (goalAdjustments[goal] ?? 0)));

  const proteinPerKg = goal === 'ganhar massa' ? 2.0 : goal === 'emagrecer' ? 1.9 : 1.7;
  const fatPerKg = goal === 'emagrecer' ? 0.75 : 0.85;
  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.round(weight * fatPerKg);
  const remainingCalories = targetCalories - protein * 4 - fat * 9;
  const carbs = Math.max(80, Math.round(remainingCalories / 4));
  const imc = weight / ((height / 100) ** 2);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories,
    protein,
    carbs,
    fat,
    imc: Number(imc.toFixed(1))
  };
}

function buildPrompt(form, nutrition) {
  return `Você é o SmartMeal AI, um assistente de nutrição educacional para criar planos alimentares simples.

IMPORTANTE:
- Não diga que é nutricionista.
- Não faça diagnóstico médico.
- Recomende consultar nutricionista em casos de doença, restrição severa, gestação, transtorno alimentar ou objetivo extremo.
- Responda somente em JSON válido, sem markdown.
- Use alimentos comuns no Brasil.
- O plano deve ser prático, barato quando possível e coerente com o objetivo.

Dados do usuário:
Nome: ${form.name || 'Usuário'}
Idade: ${form.age}
Sexo: ${form.gender}
Altura: ${form.height} cm
Peso: ${form.weight} kg
Atividade física: ${form.activity}
Objetivo: ${form.goal}
Número de refeições: ${form.meals}
Restrições: ${form.restrictions || 'nenhuma'}
Preferências: ${form.preferences || 'equilibrada'}
Alimentos que não gosta: ${form.dislikes || 'não informado'}
Tempo para cozinhar: ${form.cookingTime || 'médio'}
Orçamento: ${form.budget || 'médio'}

Cálculos estimados:
IMC: ${nutrition.imc}
Gasto basal aproximado: ${nutrition.bmr} kcal
Gasto diário aproximado: ${nutrition.tdee} kcal
Meta calórica: ${nutrition.targetCalories} kcal
Proteínas: ${nutrition.protein} g
Carboidratos: ${nutrition.carbs} g
Gorduras: ${nutrition.fat} g

Retorne exatamente este formato JSON:
{
  "title": "Plano alimentar personalizado",
  "profileSummary": "resumo curto e humano do perfil",
  "strategy": "estratégia nutricional em 2 ou 3 frases",
  "calories": número,
  "macros": {
    "protein": número,
    "carbs": número,
    "fat": número
  },
  "meals": [
    {
      "name": "nome da refeição",
      "time": "horário sugerido",
      "items": ["item 1", "item 2", "item 3"],
      "why": "explicação curta"
    }
  ],
  "shoppingList": ["item 1", "item 2", "item 3"],
  "tips": ["dica 1", "dica 2", "dica 3"],
  "warning": "aviso curto de que é uma sugestão educacional e não substitui nutricionista"
}

Crie exatamente ${form.meals || 5} refeições no array meals.`;
}

function cleanJsonText(text) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function buildFallbackPlan(form, nutrition) {
  const goalText = form.goal === 'emagrecer'
    ? 'déficit calórico controlado, boa ingestão de proteínas e alimentos com alta saciedade'
    : form.goal === 'ganhar massa'
      ? 'leve superávit calórico, proteína adequada e carboidratos ao redor dos treinos'
      : 'manutenção calórica, equilíbrio entre macronutrientes e rotina sustentável';

  return {
    title: 'Plano alimentar personalizado',
    profileSummary: `${form.name || 'Usuário'}, plano estimado para ${form.goal}, com base em ${form.weight} kg, ${form.height} cm e rotina ${form.activity}.`,
    strategy: `A estratégia sugerida é ${goalText}. Ajuste as porções conforme fome, rotina e evolução semanal.`,
    calories: nutrition.targetCalories,
    macros: {
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat
    },
    meals: [
      {
        name: 'Café da manhã',
        time: '07:30',
        items: ['Ovos mexidos ou iogurte natural', 'Aveia ou pão integral', 'Banana ou mamão'],
        why: 'Combina proteína, carboidrato e fibras para começar o dia com energia.'
      },
      {
        name: 'Almoço',
        time: '12:30',
        items: ['Arroz ou batata', 'Feijão', 'Frango, carne magra, ovos ou tofu', 'Salada e legumes'],
        why: 'Refeição completa com boa densidade nutricional.'
      },
      {
        name: 'Lanche',
        time: '16:30',
        items: ['Iogurte, fruta ou sanduíche natural', 'Castanhas ou pasta de amendoim em pequena porção'],
        why: 'Ajuda a controlar a fome e manter consistência até a próxima refeição.'
      },
      {
        name: 'Jantar',
        time: '20:00',
        items: ['Proteína magra', 'Legumes', 'Carboidrato ajustado ao objetivo'],
        why: 'Mantém recuperação muscular e saciedade no fim do dia.'
      }
    ].slice(0, Math.max(1, Number(form.meals) || 4)),
    shoppingList: ['ovos', 'frango', 'arroz', 'feijão', 'aveia', 'banana', 'legumes', 'salada', 'iogurte natural'],
    tips: ['Beba água ao longo do dia.', 'Priorize consistência antes de perfeição.', 'Acompanhe evolução por 2 a 4 semanas antes de ajustar calorias.'],
    warning: 'Esta é uma sugestão educacional gerada por IA e não substitui acompanhamento com nutricionista.'
  };
}

export async function POST(request) {
  try {
    const form = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const nutrition = calculateNutrition(form);

    if (!apiKey || apiKey === 'cole_sua_chave_aqui') {
      return Response.json(
        {
          error: 'GEMINI_API_KEY não configurada. Crie o arquivo .env.local com sua chave do Google AI Studio.',
          fallback: buildFallbackPlan(form, nutrition)
        },
        { status: 400 }
      );
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildPrompt(form, nutrition) }]
          }
        ],
        generationConfig: {
          temperature: 0.45,
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error: data?.error?.message || 'Erro ao chamar a Gemini API.',
          fallback: buildFallbackPlan(form, nutrition)
        },
        { status: response.status }
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return Response.json(
        {
          error: 'A IA não retornou um texto válido.',
          fallback: buildFallbackPlan(form, nutrition)
        },
        { status: 502 }
      );
    }

    let plan;
    try {
      plan = JSON.parse(cleanJsonText(text));
    } catch (parseError) {
      return Response.json(
        {
          error: 'A IA respondeu, mas o JSON não pôde ser interpretado.',
          raw: text,
          fallback: buildFallbackPlan(form, nutrition)
        },
        { status: 502 }
      );
    }

    return Response.json({
      source: 'gemini-api',
      model,
      generatedAt: new Date().toISOString(),
      nutrition,
      plan
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Erro inesperado ao gerar o plano.'
      },
      { status: 500 }
    );
  }
}
