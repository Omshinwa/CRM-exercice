    nom  -  entreprise - téléphone -   date  -   score   - champ perso

• afficher une liste de contacts sous forme de grille ;
• charger progressivement les contacts avec un scroll infini ;
• ajouter, modifier et supprimer un contact ;
• modifier les valeurs directement depuis la grille ;
• trier les contacts selon une colonne ;
• filtrer les contacts selon une colonne ;
• ajouter, renommer, supprimer et réorganiser les colonnes ;
• gérer au minimum les types de colonnes suivants :
    • texte
    • nombre
    • date
    • numéro de téléphone (assume format francais?)
• conserver les contacts, les valeurs, les colonnes et leur ordre après rechargement.

Le tri et les filtres doivent s’appliquer à l’ensemble des données, et non uniquement aux lignes déjà affichées. (backend call)

Le projet doit fournir un moyen simple d’initialiser la base avec au moins 500 contacts fictifs, afin de pouvoir tester le chargement progressif.


Les choix d’interface, d’architecture, de modèle de données et de contrat API vous appartiennent.

L’utilisation de Docker Compose est recommandée.

* CHOOSE WHICH INFRASTRUCTURE LIBRARY TO USE.
* RIGHT CLICK ? or just all left click? (for example for sorting)

FORBIDDEN:
    • AG Grid ;
    • Handsontable ;
    • MUI Data Grid ;
    • React Data Grid ;
    • Syncfusion Grid ;
    • toute solution équivalente.

DONT DO:
    formule de tableur
    selection de plusieurs cells
    historique undo/redo

