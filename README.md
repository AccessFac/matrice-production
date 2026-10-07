# Matrice Production

Devis, planning, coûts et résultat par société pour les projets du groupe (Playback Solutions, AccessFlow, AccessFactory).
Application web statique : pas de serveur à maintenir, les données sont dans une base Supabase (gratuite).

## Organisation du code

```
index.html              Page : barre du haut et zone de contenu (rarement à modifier)
css/styles.css          Apparence : couleurs et polices dans le bloc :root en haut du fichier
js/
  config.js             ⚙️  Réglages : choix de la base, URL et clé Supabase
  defaults.js           Onglets, couleurs des sociétés, modèles de lignes vides
  calc.js               🧮 Tous les calculs (totaux, remise, CA par société, résultat, alertes)
  store.js              Chargement, enregistrement automatique, création/suppression de projets
  app.js                Barre du haut, rendu des onglets, gestion des clics et saisies
  export.js             Export CSV du devis
  utils.js              Formats (€, %), nombres, petits outils
  views/                Un fichier par onglet : ce qui s'affiche
    devis.js            Infos projet, planning, prestations, totaux
    couts.js            Coûts (interne)
    resultat.js         Résultat par société et consolidé groupe (interne)
    catalogue.js        Catalogue des prestations
    listes.js           Listes des menus et modèle de planning
    recap.js            Barres « CA par société / par catégorie »
    auth.js             Écrans de connexion
  ui/resize.js          Colonnes redimensionnables
  adapters/             Où sont stockées les données
    supabase.js         Base Supabase (hébergement GitHub Pages)
    claude.js           Base de l'artifact claude.ai
    local.js            Navigateur uniquement (tests)
supabase/
  schema.sql            Tables et règles d'accès (à exécuter une fois)
  seed.sql              Données actuelles — NON versionné (voir .gitignore)
```

**Où modifier quoi**

| Je veux…                                   | Fichier                         |
|--------------------------------------------|---------------------------------|
| ajouter/retirer une colonne du devis       | `js/views/devis.js` (+ `js/export.js` pour le CSV) |
| changer une formule ou un contrôle          | `js/calc.js`                    |
| ajouter un champ à une nouvelle ligne       | `js/defaults.js` (`BLANK`)      |
| changer une couleur ou une police           | `css/styles.css`                |
| ajouter un onglet                           | `js/defaults.js` (`TABS`) + un fichier dans `js/views/` + une ligne dans `render()` de `js/app.js` |

## Base de données (Supabase, gratuit)

1. Créer un compte sur [supabase.com](https://supabase.com) → **New project** (région : Paris / eu-west-3).
2. **SQL Editor** → coller `supabase/schema.sql` → **Run**. Vérifier l'adresse e-mail du premier membre à la fin du fichier.
3. Toujours dans SQL Editor : coller `supabase/seed.sql` → **Run** (importe le catalogue et les projets).
4. **Authentication → URL Configuration** : mettre l'adresse du site (ex. `https://<compte>.github.io/matrice-production/`) dans *Site URL* et *Redirect URLs*.
   La connexion se fait par **e-mail + mot de passe**. Un compte se crée dans **Authentication → Users → Add user → Create new user** (cocher *Auto Confirm User*), puis son adresse s'ajoute à la table `membres`.
5. **Project Settings → API** : copier *Project URL* et la clé *anon public* dans `js/config.js`.
6. Donner l'accès aux données : `insert into public.membres (email, role) values ('prenom@societe.com', 'edition');`
   (`'lecture'` pour un accès en consultation seule).

La clé *anon* est publique par conception ; ce sont les règles de `schema.sql` qui protègent les données
(il faut être connecté **et** membre). Ne jamais mettre la clé *service_role* dans le code.

## Mise en ligne (GitHub Pages, gratuit)

1. Pousser le dépôt sur GitHub.
2. **Settings → Pages** → *Deploy from a branch* → branche `main`, dossier `/ (root)`.
3. Le site est disponible après une minute environ à `https://<compte>.github.io/<dépôt>/`.

GitHub Pages gratuit nécessite un dépôt **public** : le code est alors visible, mais pas les données
(elles sont dans Supabase, protégées par connexion). `seed.sql` et les fichiers Excel sont exclus du dépôt.

## Tester sur son ordinateur

Les modules JavaScript ne fonctionnent pas en double-cliquant sur `index.html`. Depuis le dossier :

```
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000. Sans Supabase configuré, l'app passe en **mode local** (données dans le navigateur).
