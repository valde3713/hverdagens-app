# Hverdagens app

En statisk, dansk app til GitHub Pages. Brugere logger ind med kaldenavn og personlig kode, deler en god gerning for naturen og får ét point pr. delt gerning. Profiler og pointtavle deles via Supabase.

## Sæt Supabase op

1. Opret et Supabase-projekt.
2. Åbn projektets **SQL Editor**, indsæt indholdet fra `supabase.sql`, og kør det.
3. Find projektets URL og **anon/public key** under **Project Settings → API**, og sæt dem ind i `config.js`:

   ```js
   window.APP_CONFIG = {
     supabaseUrl: "https://DIT-PROJEKT.supabase.co",
     supabaseAnonKey: "DIN_SUPABASE_ANON_KEY"
   };
   ```

   Den offentlige anon key er beregnet til klientapps. Læg aldrig projektets `service_role`-nøgle i denne app.
4. Under **Authentication → Providers → Email**, slå e-mailbekræftelse fra. Appen bruger et ikke-leveringsdygtigt, syntetisk login-id i stedet for e-mail; brugere kan derfor ikke få tilsendt en nulstillingskode. Profiler med samme kaldenavn kan ikke oprettes to gange.

Adgangskoder skal være mindst 8 tegn. Brugere kan logge ind fra flere enheder med samme kaldenavn og kode. Når man er logget ind, kan adgangskoden ændres under **Min profil → Indstillinger**. Kaldenavn kan ændres efter mindst 36 delte gerninger. Appens tema og sprogvalg gemmes lokalt i browseren. Brugere kan slette egne gerninger; pointtavlen opdateres derefter automatisk.

Pointtavlen viser kaldenavne og antal delte gerninger; selve beskrivelserne er kun synlige for den bruger, der skrev dem. Point gives automatisk for hver indsendelse, så tavlen bygger på tillid og er ikke en verificeret konkurrence.

Databasepolitikkerne begrænser læsning og ændring til de nødvendige roller; brugere kan kun slette egne gerninger. Kaldenavne valideres også i databasen. `get_login_email` beregner appens syntetiske loginadresse ud fra kaldenavnet i stedet for at slå konti op. Supabase `anon`/publishable-nøglen er offentlig og må gerne ligge i frontend; `service_role`-nøglen og databaseadgangskoden må aldrig udgives. Slå e-mailbekræftelse fra, da appens syntetiske loginadresser ikke kan modtage e-mail.

## Kør lokalt

Fra projektmappen kan du starte en simpel webserver:

```sh
python3 -m http.server 8000
```

Åbn derefter `http://localhost:8000`. `file://` virker ikke, fordi appen bruger JavaScript-moduler.

## Udgiv på GitHub Pages

1. Push projektmappens filer til roden af et GitHub-repository.
2. Åbn repositoryets **Settings → Pages**.
3. Under **Build and deployment** vælg **Deploy from a branch**, vælg `main` og mappen `/ (root)`, og gem.

Appen kræver ingen build-trin. `config.js` skal være udfyldt, inden appen udgives. Hvis databasen allerede er sat op fra en ældre version, skal `supabase.sql` køres igen for at tilføje sletning af gerninger og indstillingerne for kaldenavn.
