# 技術スタック案

## 構成

- **Frontend**: Next.js 15 (App Router), TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Charts**: Apache ECharts (複雑な分布図・重ね合わせ対応)
- **State**: nuqs (URLベースの検索・比較状態管理)
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## 選定理由

- **ECharts**: 5層のデータの重ね合わせ（Layered Charts）において、凡例の切り替えや透過度の制御が容易。
- **nuqs**: 「どの年齢層を比較しているか」をURLに保持することで、UXを向上。
