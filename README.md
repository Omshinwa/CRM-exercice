## Comment lancer l'application

Prérequis : Docker, Docker Compose et `make`.

```sh
make           # lance l'application, avec une DB vide
make SEED=1    # pareil, et remplit la base de 500 contacts fictifs si elle est vide
```

Sans `make` : `docker compose up --build`, ou `SEED=1 docker compose up --build`.

| Service                         | URL                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------- |
| Application                     | http://localhost:5173                                                           |
| API NestJS                      | http://localhost:3000/api/contacts                                              |
| Adminer, pour inspecter la base | http://localhost:8080 (serveur `db`, utilisateur, mot de passe et base : `crm`) |

## Comment initialiser la base et les données de démonstration

```sh
make SEED=1    # les crée au démarrage, seulement si la base est vide
make seed      # repart de zéro : efface tout, y compris les colonnes ajoutées, puis les recrée
```

Le schéma est créé par des migrations SQL (`backend/migrations/*.sql`), appliquées automatiquement au démarrage du backend.

## Comment exécuter les tests

Il n'y a malheureusement pas de tests automatisés. Je vérifiais à la main, j'admets que c'est une faiblesse de mon projet.

## Les principaux choix techniques

### Modèle de données

Il y a 2 tables SQL, `contacts` et `column_defs`. `contacts` est ce que la grille affiche. `column_defs` décrit chaque colonne de la table `contacts`: nom, type, position.

L'avantage : le tri se fait en SQL (`ORDER BY col_<id>`), sur toute la base.
Les requêtes sont écrites en SQL avec `pg`, sans ORM : un ORM décrit les colonnes à l'avance, ce qui s'adapte mal à des colonnes créées à l'exécution.

### Scroll infini avec IntersectionObserver

Un élément vide sous le tableau sert de sentinelle. Quand il apparaît à l'écran, on charge la page suivante.

### Pagination par curseur (`afterId` et `afterValue`) plutôt qu'avec un offset

Pour gérer l'affichage progressif, `GET /api/contacts` reçoit l'id et la valeur triée du dernier contact déjà affiché, et renvoie les contacts qui viennent juste après.
Supprimer un contact déjà chargé, ou modifier sa valeur dans la colonne triée, aurait décalé les pages suivantes avec un offset.

### Édition dans la cellule, validation côté serveur

Un clic transforme la cellule en `<input>` natif au type. Chaque modification envoie `PUT /api/contacts/:id/values/:columnId`, qui renvoie la valeur telle qu'elle est stockée : un téléphone saisi `06 12 34 56 78` revient par exemple en `+33612345678`. Si le serveur refuse la valeur, la cellule garde l'ancienne et un message d'erreur s'affiche.

Le backend vérifie chaque valeur selon le type de la colonne : nombre fini, date réelle au format `AAAA-MM-JJ` (le 30 février est refusé), numéro de téléphone valide d'après `libphonenumber-js`. Un numéro sans indicatif est lu comme français.

### Peu de dépendances

Frontend : React seul, avec `useState` et `fetch`. Backend : NestJS, `pg`, `libphonenumber-js`, et Faker pour les données de démonstration.

## Les fonctionnalités terminées ou incomplètes ;

Fonctionnalités absentes:

- filtrer les contacts selon une colonne ;
- renommer les colonnes ;
- réorganiser les colonnes (chaque colonne a un champ `position`, mais aucune route ni interface ne permet de le modifier).

Fonctionnalités terminées:

- afficher les contacts sous forme de grille, chargés progressivement avec un scroll infini ;
- ajouter et supprimer un contact ;
- modifier une valeur directement dans la grille, enregistrée automatiquement, avec vérification du type par le serveur ;
- trier les contacts selon une colonne, sur toute la base (clic sur l'en-tête : croissant, décroissant, sans tri) ;
- ajouter une colonne (texte, nombre, date ou téléphone) et la supprimer ;
- conserver les contacts, les valeurs et les colonnes après rechargement.

## Les limites connues

- L'UI pourrait être plus soignée. Il y a un champ "Nom de la colonne" tout le temps présent alors qu'il pourrait juste être affiché quand l'utilisateur clique "Ajouter une colonne".
- De même, les boutons 'X' pour supprimer les colonnes ou les contacts pourraient être gérés différemment, avec un menu contextuel qui s'ouvre quand on fait clic droit par exemple.
- Toutes les lignes chargées restent dans le DOM (pas de virtualisation) : avec plusieurs milliers de contacts chargés, le défilement peut ralentir.
- Les numéros de téléphone sont stockés en `text`, donc c'est à l'API de les valider (libphonenumber).
- Ajouter ou supprimer une colonne lance un `ALTER TABLE`, qui verrouille brièvement la table `contacts` (acceptable à cette échelle).
- Les erreurs ne s'affichent que en haut.

## Les améliorations prioritaires

1. **Filtrer selon une colonne** : une condition `WHERE` côté serveur, adaptée au type (contient, pour le texte ; intervalle, pour les nombres et les dates), combinée au tri et au curseur?
2. **Renommer et réorganiser les colonnes**
3. **Tests automatisés** : tests unitaires de la validation des valeurs, tests de l'API.
4. **Virtualiser les lignes** du tableau, pour garder un défilement fluide quand beaucoup de contacts sont chargés.

## Les outils d'IA utilisés

J'ai utilisé Claude Code intégré à VS Code: pour écrire du code par étapes que je relisais, et surtout pour comprendre. Quand je ne voyais pas pourquoi un champ était là, ou pourquoi on ne faisait pas autrement, je lui demandais.

- **Proposition rejetée** : pour le modèle de données, l'IA m'a d'abord proposé un document JSONB par contact, ou une ligne par cellule. J'ai préféré une table relationnelle classique, avec une vraie colonne SQL par colonne de la grille.
- **Proposition gardée** : c'est elle qui m'a suggéré Faker pour générer les contacts fictifs.


## Le temps approximatif consacré au test.

Environ 4 heures, sans compter la rédaction du README et la vidéo.
