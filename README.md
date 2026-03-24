# ★ DCF Intrinsic Valuation

Application de valorisation DCF (Discounted Cash Flow) — toutes métriques per share.

## Fonctionnalités

- **38 tickers intégrés** (US + Europe) avec données per share
- **Tout per share** : FCF/action, Dette Nette/action, Prix
- **Modèle DCF complet** : croissance 2 phases, terminal value (Gordon), dilution/rachat, marge de sécurité
- **Mode manuel** pour n'importe quel ticker non listé
- **Design** : fond animé, esthétique dark luxe, responsive

## Déployer sur Vercel (5 minutes)

### Étape 1 — Créer un repo GitHub

1. Va sur [github.com/new](https://github.com/new)
2. Nom : `dcf-valuation`
3. Visibilité : Public ou Private (au choix)
4. Clique **Create repository**

### Étape 2 — Pousser le code

Ouvre un terminal dans ce dossier et exécute :

```bash
git init
git add .
git commit -m "Initial commit — DCF Valuation app"
git branch -M main
git remote add origin https://github.com/TON_PSEUDO/dcf-valuation.git
git push -u origin main
```

> Remplace `TON_PSEUDO` par ton pseudo GitHub.

### Étape 3 — Déployer sur Vercel

1. Va sur [vercel.com](https://vercel.com) et connecte-toi avec GitHub
2. Clique **Add New → Project**
3. Sélectionne le repo `dcf-valuation`
4. Vercel détecte automatiquement React — clique **Deploy**
5. En ~60 secondes, ton app est en ligne sur `dcf-valuation-xxx.vercel.app`

### C'est tout !

Chaque `git push` sur `main` redéploiera automatiquement.

## Développement local

```bash
npm install
npm start
```

L'app tourne sur `http://localhost:3000`.

## Stack

- React 18
- Aucune dépendance externe (pas d'API, pas de backend)
- Données intégrées, modifiable par l'utilisateur

---

*Ceci n'est pas un conseil d'investissement.*
