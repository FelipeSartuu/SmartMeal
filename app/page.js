'use client';

import { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';

const initialForm = {
  name: '',
  age: 19,
  gender: 'masculino',
  height: 175,
  weight: 75,
  activity: 'moderado',
  goal: 'ganhar massa',
  meals: 5,
  restrictions: 'nenhuma',
  preferences: 'equilibrada',
  dislikes: '',
  cookingTime: 'médio',
  budget: 'médio'
};

const activityLabels = {
  sedentario: 'Sedentário',
  leve: 'Leve',
  moderado: 'Moderado',
  intenso: 'Intenso'
};

const goalLabels = {
  emagrecer: 'Emagrecer',
  manter: 'Manter peso',
  'ganhar massa': 'Ganhar massa'
};

function calculatePreview(form) {
  const weight = Number(form.weight) || 70;
  const height = Number(form.height) || 170;
  const age = Number(form.age) || 25;
  const bmr = form.gender === 'feminino'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  const activityFactor = {
    sedentario: 1.2,
    leve: 1.375,
    moderado: 1.55,
    intenso: 1.725
  }[form.activity] || 1.55;

  const adjustment = {
    emagrecer: -450,
    manter: 0,
    'ganhar massa': 350
  }[form.goal] ?? 0;

  const imc = weight / ((height / 100) ** 2);
  return {
    imc: imc.toFixed(1),
    tdee: Math.round(bmr * activityFactor),
    calories: Math.max(1200, Math.round(bmr * activityFactor + adjustment))
  };
}

function downloadPdf(plan, form, nutrition) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 18;

  const addText = (text, size = 11, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(text), pageWidth - margin * 2);
    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, margin, y);
      y += size > 12 ? 8 : 6;
    });
  };

  addText('SmartMeal AI', 20, true);
  addText(plan.title || 'Plano alimentar personalizado', 14, true);
  addText(`Nome: ${form.name || 'Usuário'} | Objetivo: ${goalLabels[form.goal]} | Atividade: ${activityLabels[form.activity]}`);
  addText(`Calorias: ${plan.calories || nutrition?.targetCalories || '-'} kcal | Proteína: ${plan.macros?.protein || '-'}g | Carboidratos: ${plan.macros?.carbs || '-'}g | Gorduras: ${plan.macros?.fat || '-'}g`);
  y += 2;

  addText('Resumo', 13, true);
  addText(plan.profileSummary || 'Plano personalizado gerado com IA.');
  addText(plan.strategy || '');
  y += 2;

  addText('Refeições', 13, true);
  (plan.meals || []).forEach((meal, index) => {
    addText(`${index + 1}. ${meal.name || 'Refeição'} - ${meal.time || ''}`, 12, true);
    (meal.items || []).forEach((item) => addText(`• ${item}`));
    if (meal.why) addText(`Por quê: ${meal.why}`);
    y += 1;
  });

  addText('Lista de compras', 13, true);
  addText((plan.shoppingList || []).join(', '));

  addText('Dicas', 13, true);
  (plan.tips || []).forEach((tip) => addText(`• ${tip}`));

  addText('Aviso', 13, true);
  addText(plan.warning || 'Este plano é uma sugestão educacional gerada por IA e não substitui acompanhamento profissional.');

  doc.save(`smartmeal-ai-${(form.name || 'plano').toLowerCase().replaceAll(' ', '-')}.pdf`);
}

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => calculatePreview(form), [form]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/generate-diet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.fallback) {
          setResult({ source: 'fallback', plan: data.fallback, nutrition: null });
        }
        throw new Error(data.error || 'Não foi possível gerar o plano com IA.');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  const plan = result?.plan;

  return (
    <main>
      <section className="hero">
        <nav className="nav">
          <div className="brand">
            <span className="brandIcon">🥗</span>
            <span>SmartMeal AI</span>
          </div>
          <a href="#form" className="navButton">Gerar dieta</a>
        </nav>

        <div className="heroGrid">
          <div className="heroText">
            <span className="badge">Powered by Gemini API</span>
            <h1>Dietas personalizadas geradas por Inteligência Artificial.</h1>
            <p>
              Preencha seu perfil, objetivo e preferências. O SmartMeal AI usa uma API real de IA para montar um plano alimentar completo e exportável em PDF.
            </p>
            <div className="heroActions">
              <a href="#form" className="primaryButton">Começar agora</a>
              <a href="#how" className="secondaryButton">Como funciona</a>
            </div>
          </div>

          <div className="heroCard">
            <div className="pulse"></div>
            <p className="miniTitle">Prévia estimada</p>
            <h2>{preview.calories} kcal</h2>
            <div className="metricRow">
              <span>IMC</span>
              <strong>{preview.imc}</strong>
            </div>
            <div className="metricRow">
              <span>Gasto diário</span>
              <strong>{preview.tdee} kcal</strong>
            </div>
            <div className="metricRow">
              <span>Objetivo</span>
              <strong>{goalLabels[form.goal]}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="content" id="form">
        <form className="formCard" onSubmit={handleSubmit}>
          <div className="sectionHeader">
            <span>01</span>
            <div>
              <h2>Seu perfil</h2>
              <p>Esses dados ajudam a IA a criar um plano coerente com seu objetivo.</p>
            </div>
          </div>

          <div className="formGrid">
            <label>
              Nome
              <input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Felipe" />
            </label>

            <label>
              Idade
              <input type="number" min="12" max="90" value={form.age} onChange={(e) => updateField('age', e.target.value)} />
            </label>

            <label>
              Sexo
              <select value={form.gender} onChange={(e) => updateField('gender', e.target.value)}>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </label>

            <label>
              Altura em cm
              <input type="number" min="120" max="230" value={form.height} onChange={(e) => updateField('height', e.target.value)} />
            </label>

            <label>
              Peso em kg
              <input type="number" min="35" max="220" value={form.weight} onChange={(e) => updateField('weight', e.target.value)} />
            </label>

            <label>
              Atividade física
              <select value={form.activity} onChange={(e) => updateField('activity', e.target.value)}>
                <option value="sedentario">Sedentário</option>
                <option value="leve">Leve</option>
                <option value="moderado">Moderado</option>
                <option value="intenso">Intenso</option>
              </select>
            </label>

            <label>
              Objetivo
              <select value={form.goal} onChange={(e) => updateField('goal', e.target.value)}>
                <option value="emagrecer">Emagrecer</option>
                <option value="manter">Manter peso</option>
                <option value="ganhar massa">Ganhar massa</option>
              </select>
            </label>

            <label>
              Refeições por dia
              <select value={form.meals} onChange={(e) => updateField('meals', e.target.value)}>
                <option value="3">3 refeições</option>
                <option value="4">4 refeições</option>
                <option value="5">5 refeições</option>
                <option value="6">6 refeições</option>
              </select>
            </label>

            <label>
              Restrições
              <input value={form.restrictions} onChange={(e) => updateField('restrictions', e.target.value)} placeholder="sem lactose, vegetariano, nenhuma..." />
            </label>

            <label>
              Preferência alimentar
              <select value={form.preferences} onChange={(e) => updateField('preferences', e.target.value)}>
                <option value="equilibrada">Equilibrada</option>
                <option value="brasileira simples">Brasileira simples</option>
                <option value="alta proteína">Alta proteína</option>
                <option value="vegetariana">Vegetariana</option>
                <option value="low carb moderada">Low carb moderada</option>
              </select>
            </label>

            <label>
              Tempo para cozinhar
              <select value={form.cookingTime} onChange={(e) => updateField('cookingTime', e.target.value)}>
                <option value="baixo">Baixo</option>
                <option value="médio">Médio</option>
                <option value="alto">Alto</option>
              </select>
            </label>

            <label>
              Orçamento
              <select value={form.budget} onChange={(e) => updateField('budget', e.target.value)}>
                <option value="baixo">Baixo</option>
                <option value="médio">Médio</option>
                <option value="alto">Alto</option>
              </select>
            </label>
          </div>

          <label className="fullLabel">
            Alimentos que você não gosta
            <textarea value={form.dislikes} onChange={(e) => updateField('dislikes', e.target.value)} placeholder="Ex: peixe, abacate, leite..." />
          </label>

          <button className="generateButton" type="submit" disabled={loading}>
            {loading ? 'Gerando com IA...' : 'Gerar plano com IA'}
          </button>

          {error && <p className="errorBox">{error}</p>}
        </form>

        <aside className="resultCard">
          {!plan && (
            <div className="emptyState">
              <span>🤖</span>
              <h2>Seu plano aparecerá aqui</h2>
              <p>Após gerar, a resposta virá da API de IA e poderá ser baixada em PDF.</p>
            </div>
          )}

          {plan && (
            <div className="plan">
              <div className="planTop">
                <div>
                  <span className="sourceTag">{result.source === 'gemini-api' ? 'Gerado com Gemini API' : 'Modo fallback'}</span>
                  <h2>{plan.title}</h2>
                </div>
                <button className="pdfButton" onClick={() => downloadPdf(plan, form, result.nutrition)}>Baixar PDF</button>
              </div>

              <p className="summary">{plan.profileSummary}</p>
              <p className="strategy">{plan.strategy}</p>

              <div className="macroGrid">
                <div>
                  <span>Calorias</span>
                  <strong>{plan.calories} kcal</strong>
                </div>
                <div>
                  <span>Proteínas</span>
                  <strong>{plan.macros?.protein}g</strong>
                </div>
                <div>
                  <span>Carboidratos</span>
                  <strong>{plan.macros?.carbs}g</strong>
                </div>
                <div>
                  <span>Gorduras</span>
                  <strong>{plan.macros?.fat}g</strong>
                </div>
              </div>

              <h3>Plano alimentar</h3>
              <div className="meals">
                {(plan.meals || []).map((meal, index) => (
                  <article className="meal" key={`${meal.name}-${index}`}>
                    <div className="mealHeader">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <h4>{meal.name}</h4>
                        <p>{meal.time}</p>
                      </div>
                    </div>
                    <ul>
                      {(meal.items || []).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                    <p className="why">{meal.why}</p>
                  </article>
                ))}
              </div>

              <div className="twoColumns">
                <div>
                  <h3>Lista de compras</h3>
                  <ul className="simpleList">
                    {(plan.shoppingList || []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <h3>Dicas</h3>
                  <ul className="simpleList">
                    {(plan.tips || []).map((tip) => <li key={tip}>{tip}</li>)}
                  </ul>
                </div>
              </div>

              <p className="warning">{plan.warning}</p>
            </div>
          )}
        </aside>
      </section>

      <section className="how" id="how">
        <div className="sectionHeader centered">
          <span>02</span>
          <div>
            <h2>Como o SmartMeal usa IA?</h2>
            <p>O front-end envia seu perfil para uma rota segura do Next.js, que chama a Gemini API e retorna um plano estruturado em JSON.</p>
          </div>
        </div>

        <div className="steps">
          <div>
            <strong>1</strong>
            <h3>Coleta de dados</h3>
            <p>Altura, peso, idade, objetivo, rotina, restrições e preferências.</p>
          </div>
          <div>
            <strong>2</strong>
            <h3>Cálculo inicial</h3>
            <p>O sistema estima IMC, gasto calórico e macronutrientes.</p>
          </div>
          <div>
            <strong>3</strong>
            <h3>Geração com IA</h3>
            <p>A Gemini API cria refeições, lista de compras, dicas e estratégia alimentar.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
