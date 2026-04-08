# Connessione e Store

openfga-viewer si connette a un'istanza OpenFGA alla volta. All'interno di quell'istanza, è possibile passare tra più store. Le impostazioni di connessione e lo store selezionato vengono salvati nel browser e ripristinati alla visita successiva.

## Configurazione della Connessione

Clicca sull'**indicatore di connessione** nell'header in alto a destra (il badge colorato) per aprire il popover di connessione. Il popover mostra prima l'URL corrente e un badge di stato.

Clicca **Edit Connection** per modificare. Vedrai:

![Pannello di connessione](../assets/screenshots/connection.png)

| Campo | Descrizione |
|-------|-------------|
| **URL** | L'URL base dell'API HTTP di OpenFGA (es. `http://localhost:8080`) |

Clicca **Test** per verificare che l'URL sia raggiungibile. Una spunta verde appare sotto il campo in caso di successo. Una volta che il test passa, il bottone **Save** diventa abilitato — cliccalo per salvare l'URL.

Un punto verde nell'header conferma una connessione attiva. Un punto rosso indica che l'URL non è raggiungibile.

## Selezionare uno Store

Il **selettore store** è il dropdown nell'header. Elenca tutti gli store nell'istanza OpenFGA connessa. Digita per filtrare per nome.

- Clicca su qualsiasi store per renderlo lo store attivo
- Lo store attivo viene usato per tutte le operazioni su modello, tuple, query e suite di test
- Se non ci sono store corrispondenti alla ricerca, il dropdown mostra "Nessuno store trovato"

## Store Admin

Vai su **Store Admin** nella barra laterale per creare ed eliminare store.

**Creare uno store:**
1. Clicca **Nuovo Store**
2. Inserisci un nome
3. Clicca **Crea** — il nuovo store appare nella lista e viene selezionato automaticamente

**Eliminare uno store:**
1. Trova lo store nella lista
2. Clicca il menu **⋯** → **Elimina**
3. Conferma il dialogo — l'eliminazione è permanente e non può essere annullata

> **Nota:** Eliminare uno store rimuove tutti i suoi dati di modello e tuple da OpenFGA. Le suite di test sono salvate separatamente nel database del viewer e non vengono eliminate.

## Stato della Connessione

L'header mostra lo stato della connessione in tempo reale:

| Indicatore | Significato |
|-----------|-------------|
| 🟢 Verde | Connesso a OpenFGA, store selezionato |
| 🟡 Giallo | Connesso, ma nessuno store selezionato |
| 🔴 Rosso | Impossibile raggiungere l'URL di OpenFGA |
