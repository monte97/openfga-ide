# Editor della Suite

Apri una suite dalla lista Test Suites per entrare nell'editor. L'editor ha tre tab: **Form**, **JSON** e **Fixture**.

## Editor Form

La tab Form fornisce un modo strutturato per gestire gruppi e test case.

![Editor della Suite — Form](../assets/screenshots/suite-editor-form.png)

### Gruppi

I gruppi sono sezioni espandibili che organizzano i test case correlati. Una suite può avere qualsiasi numero di gruppi.

**Aggiungere un gruppo:** Clicca **+ Aggiungi Gruppo** in fondo all'albero della suite. Inserisci un nome e una descrizione opzionale.

**Eliminare un gruppo:** Clicca il menu **⋯** nell'intestazione del gruppo → **Elimina gruppo**. Questo elimina anche tutti i test case nel gruppo.

**Riordinare i gruppi:** Trascina la maniglia del gruppo (≡) in una nuova posizione.

### Test Case

Ogni test case specifica un controllo sui permessi.

**Aggiungere un test case:** Clicca **+ Aggiungi Test Case** all'interno di un gruppo. Compila:

| Campo | Descrizione | Esempio |
|-------|-------------|---------|
| User | L'entità che richiede l'accesso | `user:alice` |
| Relation | La relazione da controllare | `viewer` |
| Object | La risorsa a cui si accede | `document:roadmap` |
| Expected | Il risultato atteso | `allowed` o `denied` (salvato come `true`/`false` nel JSON) |
| Description | Etichetta leggibile opzionale | "Alice può leggere il suo documento" |
| Tags | Etichette opzionali per il filtraggio | `smoke`, `critical` |
| Severity | Livello di rischio opzionale | `critical`, `warning`, `info` |

I campi User, Relation e Object supportano l'autocomplete dal modello dello store attivo.

**Modificare un test case:** Clicca su qualsiasi riga del test case per espanderne il form in linea.

**Eliminare un test case:** Clicca l'icona **×** sulla riga del test case.

---

## Editor JSON

La tab JSON mostra la definizione completa della suite come documento JSON grezzo.

![Editor della Suite — JSON](../assets/screenshots/suite-editor-json.png)

Puoi modificare il JSON direttamente. L'editor valida la struttura del documento in tempo reale ed evidenzia gli errori. Passare di nuovo alla tab Form riflette immediatamente le modifiche JSON — non c'è perdita di dati nel cambio di modalità.

La struttura JSON:

```json
{
  "groups": [
    {
      "name": "Nome del gruppo",
      "description": "Descrizione opzionale",
      "testCases": [
        {
          "user": "user:alice",
          "relation": "viewer",
          "object": "document:roadmap",
          "expected": true,
          "meta": {
            "description": "Etichetta opzionale",
            "tags": [],
            "severity": "critical"
          }
        }
      ]
    }
  ]
}
```

- **`expected`** è un booleano: `true` significa che il check dovrebbe restituire allowed, `false` significa denied.
- **`meta`** contiene i metadati opzionali (description, tags, severity). L'enum di severity è `"critical" | "warning" | "info"`.

> **Nota:** L'editor JSON non include la definizione della fixture. Usa la tab Fixture per quella.

---

## Editor Fixture

La tab Fixture permette di incorporare un modello e delle tuple direttamente nella definizione della suite.

![Editor della Suite — Fixture](../assets/screenshots/suite-editor-fixture.png)

Quando una fixture è definita, ogni esecuzione di test crea uno **store OpenFGA effimero** caricato con il modello e le tuple della fixture, invece di usare i dati dello store attivo. Questo rende la suite di test autonoma e riproducibile.

**Definire una fixture:**

La fixture è un oggetto JSON con due chiavi:

```json
{
  "model": { "schema_version": "1.1", "type_definitions": [...] },
  "tuples": [
    { "user": "user:alice", "relation": "owner", "object": "document:roadmap" }
  ]
}
```

**Importa dallo store corrente:** Clicca **Importa dallo store corrente** per popolare la fixture con il modello dello store attivo e tutte le sue tuple. È il modo più rapido per creare uno snapshot riproducibile.

**Lasciare la fixture vuota:** Se la fixture è `null` o vuota, l'esecuzione del test usa i dati live dello store attivo. Utile per eseguire controlli di regressione su dati di produzione.
