import './globals.css';

export const metadata = {
  title: 'SmartMeal AI | Dietas personalizadas com IA',
  description: 'Site interativo que usa IA para gerar planos alimentares personalizados e exportar em PDF.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
